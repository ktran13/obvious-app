/**
 * Directory query layer — read-side for /events and the homepage.
 *
 * Every function takes a database handle as its first argument so callers
 * (pages, tests) supply the session — nothing here reads auth or request
 * state. Filters arrive pre-validated as the shared Zod EventFilter.
 *
 * Staleness mirrors the ingestion pipeline's isEventStale semantics: an
 * event whose end (or start, when no end is known) has passed, or whose
 * expires_at takedown cutoff has fired, never renders in the directory.
 */
import { and, asc, eq, exists, gt, gte, inArray, isNull, like, lt, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { eventTags, events, sources } from "@/lib/db/schema";
import type { EventFilter } from "@/lib/schemas/event-filters";
import { PRODUCT_TIMEZONE } from "@/lib/ingest/time";

import { resolveDayWindow, resolveWhenWindow, weekendWindow } from "./day-window";

type Db = PostgresJsDatabase<Record<string, never>>;

export interface DirectoryEvent {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  venue: string | null;
  neighborhood: string | null;
  priceType: "free" | "paid" | "unknown";
  priceMin: number | null;
  priceMax: number | null;
  canonicalUrl: string;
  sourceSlug: string;
  sourceLabel: string;
}

/** Shared staleness predicate — keep in lockstep with lib/ingest/sync.isEventStale. */
function freshPredicate(now: Date) {
  return and(
    // coalesce(ends_at, starts_at) > now, expressed with column operators so
    // bound Dates ride drizzle's encoder (raw interpolation bypasses it).
    or(gt(events.endsAt, now), and(isNull(events.endsAt), gt(events.startsAt, now))),
    or(isNull(events.expiresAt), gt(events.expiresAt, now)),
  );
}

/** Correlated EXISTS over event_tags — OR within one tag list, AND across lists. */
function taggedWith(db: Db, tags: string[]) {
  return exists(
    db
      .select({ one: sql`1` })
      .from(eventTags)
      .where(and(eq(eventTags.eventId, events.id), inArray(eventTags.tag, tags))),
  );
}

function windowPredicates(w: { start: Date; end: Date }) {
  return [gte(events.startsAt, w.start), lt(events.startsAt, w.end)];
}

const directoryEventColumns = {
  id: events.id,
  title: events.title,
  startsAt: events.startsAt,
  endsAt: events.endsAt,
  venue: events.venue,
  neighborhood: events.neighborhood,
  priceType: events.priceType,
  priceMin: events.priceMin,
  priceMax: events.priceMax,
  canonicalUrl: events.canonicalUrl,
  sourceSlug: sources.slug,
  sourceLabel: sources.slug,
};

/** All events matching the filter, startsAt ascending — the /events listing. */
export async function listDirectoryEvents(
  db: Db,
  filter: EventFilter,
  now: Date = new Date(),
  timeZone: string = PRODUCT_TIMEZONE,
): Promise<DirectoryEvent[]> {
  const conditions = [freshPredicate(now)];

  if (filter.day) conditions.push(...windowPredicates(resolveDayWindow(filter.day, now, timeZone)));
  if (filter.when)
    conditions.push(...windowPredicates(resolveWhenWindow(filter.when, now, timeZone)));
  if (filter.free) conditions.push(eq(events.priceType, "free"));
  if (filter.neighborhood) conditions.push(eq(events.neighborhood, filter.neighborhood));
  if (filter.interests.length > 0) {
    conditions.push(
      taggedWith(
        db,
        filter.interests.map((i) => `interest:${i}`),
      ),
    );
  }
  if (filter.personas.length > 0) {
    conditions.push(
      taggedWith(
        db,
        filter.personas.map((p) => `persona:${p}`),
      ),
    );
  }

  return db
    .select(directoryEventColumns)
    .from(events)
    .innerJoin(sources, eq(events.sourceId, sources.id))
    .where(and(...conditions))
    .orderBy(asc(events.startsAt), asc(events.id));
}

export interface DirectoryFilterOptions {
  interests: string[];
  personas: string[];
  neighborhoods: string[];
}

/** Vocabulary for the FilterBar selects, derived from live rows. */
export async function getFilterOptions(db: Db): Promise<DirectoryFilterOptions> {
  const [tagRows, neighborhoodRows] = await Promise.all([
    db.selectDistinct({ tag: eventTags.tag }).from(eventTags),
    db
      .selectDistinct({ neighborhood: events.neighborhood })
      .from(events)
      .orderBy(asc(events.neighborhood)),
  ]);

  return {
    interests: tagRows
      .map((r) => r.tag)
      .filter((t) => t.startsWith("interest:"))
      .map((t) => t.slice("interest:".length))
      .sort(),
    personas: tagRows
      .map((r) => r.tag)
      .filter((t) => t.startsWith("persona:"))
      .map((t) => t.slice("persona:".length))
      .sort(),
    neighborhoods: neighborhoodRows
      .map((r) => r.neighborhood)
      .filter((n): n is string => Boolean(n)),
  };
}

export interface PersonaEntryPoint {
  persona: string;
  eventCount: number;
}

/** Live persona counts over upcoming events — homepage entry-point cards. */
export async function getPersonaEntryPoints(
  db: Db,
  now: Date = new Date(),
): Promise<PersonaEntryPoint[]> {
  const rows = await db
    .select({ tag: eventTags.tag, eventCount: sql<number>`count(*)::int` })
    .from(eventTags)
    .innerJoin(events, eq(eventTags.eventId, events.id))
    .where(and(like(eventTags.tag, "persona:%"), gt(events.startsAt, now)))
    .groupBy(eventTags.tag)
    .orderBy(sql`count(*) desc`);
  return rows.map((r) => ({ persona: r.tag.slice("persona:".length), eventCount: r.eventCount }));
}

export interface HomepageHighlights {
  tonight: DirectoryEvent[];
  weekend: DirectoryEvent[];
}

/** Homepage highlights: the rest of today and the upcoming weekend, capped per section. */
export async function getHomepageHighlights(
  db: Db,
  now: Date = new Date(),
  perSection = 6,
  timeZone: string = PRODUCT_TIMEZONE,
): Promise<HomepageHighlights> {
  const tonight = await db
    .select(directoryEventColumns)
    .from(events)
    .innerJoin(sources, eq(events.sourceId, sources.id))
    .where(
      and(
        freshPredicate(now),
        gt(events.startsAt, now),
        lt(events.startsAt, resolveDayWindow("today", now, timeZone).end),
      ),
    )
    .orderBy(asc(events.startsAt), asc(events.id))
    .limit(perSection);

  const weekendWindow_ = weekendWindow(now, timeZone);
  const weekend = await db
    .select(directoryEventColumns)
    .from(events)
    .innerJoin(sources, eq(events.sourceId, sources.id))
    .where(and(freshPredicate(now), ...windowPredicates(weekendWindow_)))
    .orderBy(asc(events.startsAt), asc(events.id))
    .limit(perSection);

  return { tonight, weekend };
}
