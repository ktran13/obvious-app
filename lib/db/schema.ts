/**
 * Database schema for the NYC community discovery app.
 *
 * Shape follows the approved build spec (Blueprint art_wu4lJ0rZ, Rev 2.3),
 * "Data model (Drizzle — target shape)". Deviations from the sketch, both
 * deliberate:
 * - events' (source_id, external_id) index is UNIQUE — the dedupe rule is
 *   binding, and a plain index would let duplicate listings through.
 * - users/accounts/sessions use the Auth.js adapter field shape (text ids,
 *   provider/providerAccountId compound key) so the later auth task can map
 *   tables via the adapter's custom-schema support without migration churn.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { priceTypeEnum } from "./enums";

// Re-exported so drizzle-kit (which introspects exports of the schema entry
// file) registers the enum type; without this the generated SQL references
// "price_type" without ever creating it.
export { priceTypeEnum };

export const sources = pgTable("sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(), // "luma-nyc" | "meetup" | "freenyc" | "curated"
  kind: text("kind").notNull(), // "ical" | "api" | "manual" | "partner"
  enabled: boolean("enabled").notNull().default(true),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
});

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id),
    externalId: text("external_id").notNull(), // stable at the source; dedupe key with sourceId
    canonicalUrl: text("canonical_url").notNull(), // always link out; never re-host the listing
    title: text("title").notNull(),
    description: text("description"), // facts only — no third-party expressive copy in v1
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    venue: text("venue"),
    neighborhood: text("neighborhood"),
    borough: text("borough"),
    priceType: priceTypeEnum("price_type").notNull().default("unknown"), // free | paid | unknown
    priceMin: integer("price_min"), // cents, null when free/unknown
    priceMax: integer("price_max"), // cents, null when free/unknown
    affiliateUrl: text("affiliate_url"), // null → canonical link-out only
    expiresAt: timestamp("expires_at", { withTimezone: true }), // hard staleness cutoff for takedown
  },
  (t) => [
    uniqueIndex("events_source_external_id_uq").on(t.sourceId, t.externalId),
    index("events_starts_idx").on(t.startsAt),
    index("events_neighborhood_idx").on(t.neighborhood),
  ],
);

// External organizers, not user groups.
export const communities = pgTable("communities", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  sourceId: uuid("source_id").references(() => sources.id),
  externalId: text("external_id"),
  canonicalUrl: text("canonical_url"),
});

// Interest + persona tags, prefixed: "interest:tech" | "persona:female" | "persona:kids".
export const eventTags = pgTable(
  "event_tags",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.tag] }), index("event_tags_tag_idx").on(t.tag)],
);

// Auth.js-compatible shape — mapped to the Auth.js Drizzle adapter in the auth task.
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Auth.js adapter id (cuid)
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true, mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // "oauth" | "oidc" | "email" | "credentials"
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"), // unix seconds
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  // JS keys are the adapter's snake_case names (refresh_token, access_token, …)
  // because @auth/drizzle-adapter accesses columns by key, not by DB name.
  // Postgres column names are unchanged, so no migration churn.
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
});

// Login-gated: exactly one of event/community per save (enforced below).
export const savedItems = pgTable(
  "saved_items",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }),
    communityId: uuid("community_id").references(() => communities.id, {
      onDelete: "cascade",
    }),
    savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("saved_items_user_event_uq").on(t.userId, t.eventId),
    uniqueIndex("saved_items_user_community_uq").on(t.userId, t.communityId),
    check("saved_items_one_target", sql`num_nonnulls(${t.eventId}, ${t.communityId}) = 1`),
  ],
);

// Rev 2.1 — one row per user. `filters` is a JSON snapshot of the /events
// param set; always validated through parseStoredEventFilters (lib/schemas).
export const userFilterPreferences = pgTable("user_filter_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  filters: text("filters").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobPostings = pgTable("job_postings", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  description: text("description"),
  applyUrl: text("apply_url").notNull(),
  interestSlug: text("interest_slug").notNull(),
  postedAt: timestamp("posted_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Source = typeof sources.$inferSelect;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Community = typeof communities.$inferSelect;
export type JobPosting = typeof jobPostings.$inferSelect;
