/**
 * Round-trip schema tests — isolated in a throwaway Postgres database (see
 * lib/db/test-db), so they neither see nor destroy the shared dev/CI seed
 * data (306 curated events).
 */
import { asc, eq, gt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createIsolatedTestDb, type IsolatedTestDb } from "@/lib/db/test-db";
import {
  communities,
  eventTags,
  events,
  jobPostings,
  savedItems,
  sources,
  userFilterPreferences,
  users,
} from "./schema";
import { resolveDatabaseUrl } from "./url";
import { parseStoredEventFilters } from "../schemas/event-filters";

const TEST_DB = "nyc_schema_test";

/** Same host/credentials as DATABASE_URL, pointed at the throwaway test DB. */
const client = postgres(resolveDatabaseUrl(), {
  database: TEST_DB,
  max: 1,
  connect_timeout: 5,
});
const db = drizzle(client);

let testDb: IsolatedTestDb;

beforeAll(async () => {
  testDb = await createIsolatedTestDb(TEST_DB);
}, 30_000);

afterAll(async () => {
  await client.end();
  await testDb.dispose();
});

beforeEach(async () => {
  // Order irrelevant with CASCADE; keep the list explicit so a dropped table fails loudly.
  await db.execute(
    sql`TRUNCATE saved_items, user_filter_preferences, event_tags, events, communities,
     job_postings, accounts, sessions, users, sources CASCADE`,
  );
});

async function seedSource() {
  const [source] = await db.insert(sources).values({ slug: "luma-nyc", kind: "ical" }).returning();
  return source;
}

const futureStart = () => new Date("2026-11-05T18:30:00-05:00");

describe("events", () => {
  it("inserts and queries round-trip", async () => {
    const source = await seedSource();
    await db.insert(events).values([
      {
        sourceId: source.id,
        externalId: "evt_1",
        canonicalUrl: "https://lu.ma/evt_1",
        title: "Brooklyn Tech Meetup",
        startsAt: futureStart(),
        venue: "Industry City",
        neighborhood: "sunset-park",
        borough: "brooklyn",
        priceType: "free",
      },
      {
        sourceId: source.id,
        externalId: "evt_2",
        canonicalUrl: "https://lu.ma/evt_2",
        title: "Rooftop Cinema",
        startsAt: futureStart(),
        neighborhood: "bushwick",
        priceType: "paid",
        priceMin: 1500,
        priceMax: 2500,
        expiresAt: new Date("2026-11-06T00:00:00-05:00"),
      },
    ]);

    const bushwick = await db.select().from(events).where(eq(events.neighborhood, "bushwick"));
    expect(bushwick).toHaveLength(1);
    expect(bushwick[0].title).toBe("Rooftop Cinema");
    expect(bushwick[0].priceMin).toBe(1500);
    expect(bushwick[0].expiresAt).toEqual(new Date("2026-11-06T00:00:00-05:00"));

    const upcoming = await db
      .select()
      .from(events)
      .where(gt(events.startsAt, new Date("2026-11-01T00:00:00-05:00")))
      .orderBy(asc(events.startsAt));
    expect(upcoming.map((e) => e.title)).toEqual(["Brooklyn Tech Meetup", "Rooftop Cinema"]);
  });

  it("enforces the unique (source_id, external_id) dedupe key", async () => {
    const source = await seedSource();
    const row = {
      sourceId: source.id,
      externalId: "evt_1",
      canonicalUrl: "https://lu.ma/evt_1",
      title: "Brooklyn Tech Meetup",
      startsAt: futureStart(),
    };
    await db.insert(events).values(row);
    // Same externalId under a different source is fine; same pair is rejected.
    const [otherSource] = await db
      .insert(sources)
      .values({ slug: "meetup", kind: "api" })
      .returning();
    await db.insert(events).values({ ...row, sourceId: otherSource.id, title: "Meetup copy" });

    await expect(db.insert(events).values(row)).rejects.toMatchObject({
      cause: { code: "23505" },
    });
  });

  it("cascades event_tags when the event is deleted", async () => {
    const source = await seedSource();
    const [event] = await db
      .insert(events)
      .values({
        sourceId: source.id,
        externalId: "evt_1",
        canonicalUrl: "https://lu.ma/evt_1",
        title: "Tagged event",
        startsAt: futureStart(),
      })
      .returning();
    await db.insert(eventTags).values([
      { eventId: event.id, tag: "interest:tech" },
      { eventId: event.id, tag: "persona:kids" },
    ]);

    const tagged = await db.select().from(eventTags).where(eq(eventTags.eventId, event.id));
    expect(tagged.map((t) => t.tag).sort()).toEqual(["interest:tech", "persona:kids"]);

    await db.delete(events).where(eq(events.id, event.id));
    expect(await db.select().from(eventTags)).toHaveLength(0);
  });
});

describe("communities", () => {
  it("inserts and queries round-trip", async () => {
    await db.insert(communities).values({
      slug: "bushwick-run-club",
      name: "Bushwick Run Club",
      canonicalUrl: "https://bushwickrun.club",
    });
    const found = await db
      .select()
      .from(communities)
      .where(eq(communities.slug, "bushwick-run-club"));
    expect(found).toHaveLength(1);
    expect(found[0].name).toBe("Bushwick Run Club");
  });
});

describe("user_filter_preferences", () => {
  it("upserts one row per user and round-trips the filter JSON", async () => {
    const [user] = await db
      .insert(users)
      .values({ id: "user_1", email: "sam@example.com" })
      .returning();

    const filters = JSON.stringify({ interests: ["tech"], day: "friday", free: true });
    await db
      .insert(userFilterPreferences)
      .values({ userId: user.id, filters })
      .onConflictDoUpdate({
        target: userFilterPreferences.userId,
        set: { filters, updatedAt: new Date() },
      });

    const [row] = await db
      .select()
      .from(userFilterPreferences)
      .where(eq(userFilterPreferences.userId, user.id));
    expect(parseStoredEventFilters(row.filters)).toEqual({
      interests: ["tech"],
      personas: [],
      day: "friday",
      free: true,
    });
  });
});

describe("saved_items", () => {
  it("saves an event for a user", async () => {
    const [user] = await db
      .insert(users)
      .values({ id: "user_1", email: "sam@example.com" })
      .returning();
    const source = await seedSource();
    const [event] = await db
      .insert(events)
      .values({
        sourceId: source.id,
        externalId: "evt_1",
        canonicalUrl: "https://lu.ma/evt_1",
        title: "Brooklyn Tech Meetup",
        startsAt: futureStart(),
      })
      .returning();

    await db.insert(savedItems).values({ userId: user.id, eventId: event.id });
    const saved = await db.select().from(savedItems).where(eq(savedItems.userId, user.id));
    expect(saved).toHaveLength(1);
    expect(saved[0].eventId).toBe(event.id);
    expect(saved[0].communityId).toBeNull();
  });

  it("rejects a save with both event and community targets", async () => {
    const [user] = await db
      .insert(users)
      .values({ id: "user_1", email: "sam@example.com" })
      .returning();
    const source = await seedSource();
    const [event] = await db
      .insert(events)
      .values({
        sourceId: source.id,
        externalId: "evt_1",
        canonicalUrl: "https://lu.ma/evt_1",
        title: "Brooklyn Tech Meetup",
        startsAt: futureStart(),
      })
      .returning();
    const [community] = await db
      .insert(communities)
      .values({ slug: "run-club", name: "Run Club" })
      .returning();

    await expect(
      db
        .insert(savedItems)
        .values({ userId: user.id, eventId: event.id, communityId: community.id }),
    ).rejects.toMatchObject({ cause: { code: "23514" } }); // check_violation
  });
});

describe("job_postings", () => {
  it("inserts and queries round-trip", async () => {
    await db.insert(jobPostings).values({
      title: "Senior Frontend Engineer",
      company: "Bodega Labs",
      applyUrl: "https://jobs.example.com/senior-frontend",
      interestSlug: "tech",
    });
    const jobs = await db.select().from(jobPostings);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].interestSlug).toBe("tech");
  });
});
