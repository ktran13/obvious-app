/**
 * Community directory and detail queries. Like lib/saves/queries, every
 * function takes a database handle as its first argument — nothing here
 * reads auth or request state.
 *
 * A community's events are its organizer-attributed listings: events tagged
 * `community:<slug>` (the same tag vocabulary real sources will write).
 * "Upcoming" mirrors isEventStale (lib/ingest/sync): started, ended, or
 * expired listings never surface.
 */
import { and, asc, eq, gt, gte, inArray, isNull, like, or, sql } from "drizzle-orm";

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type { Community } from "@/lib/db/schema";
import { communities, eventTags, events, sources } from "@/lib/db/schema";

type Db = PostgresJsDatabase<Record<string, never>>;

/** One directory entry: the community plus aggregates over its upcoming events. */
export interface CommunityListItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  /** Distinct interest slugs ("tech", "music", …) across upcoming events. */
  interests: string[];
  /** Distinct neighborhoods across upcoming events. */
  neighborhoods: string[];
  upcomingEventCount: number;
}

export interface CommunityUpcomingEvent {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  venue: string | null;
  neighborhood: string | null;
  priceType: "free" | "paid" | "unknown";
  priceMin: number | null;
  canonicalUrl: string;
  sourceSlug: string;
}

export interface CommunityDetail {
  community: Community;
  /** Distinct interest slugs across the community's upcoming events. */
  interests: string[];
  upcomingEvents: CommunityUpcomingEvent[];
}

/** Upcoming = not yet ended and not expired; mirrors isEventStale in sync.ts. */
function upcomingEventsWhere(now: Date) {
  return and(
    gte(events.startsAt, now),
    or(isNull(events.endsAt), gt(events.endsAt, now)),
    or(isNull(events.expiresAt), gt(events.expiresAt, now)),
  );
}

/**
 * The organizer directory: every community with its upcoming-event count,
 * interests, and neighborhoods aggregated over those events. Ordered by
 * activity first, then name, so the busiest organizers lead the page.
 */
export async function listCommunities(
  db: Db,
  now: Date = new Date(),
): Promise<CommunityListItem[]> {
  // Raw-execute binds don't serialize Dates — pass ISO strings; Postgres
  // infers the timestamptz parameter type from the comparison.
  // db.execute (postgres-js driver) resolves to the row array itself.
  const nowIso = now.toISOString();
  const result = await db.execute<{
    id: string;
    slug: string;
    name: string;
    description: string | null;
    interests: string[];
    neighborhoods: string[];
    upcoming_event_count: number;
  }>(sql`
    WITH upcoming AS (
      SELECT et.tag AS community_tag, e.id, e.neighborhood
      FROM ${events} e
      JOIN ${eventTags} et ON et.event_id = e.id
      WHERE et.tag LIKE 'community:%'
        AND e.starts_at >= ${nowIso}
        AND (e.ends_at IS NULL OR e.ends_at > ${nowIso})
        AND (e.expires_at IS NULL OR e.expires_at > ${nowIso})
    )
    SELECT
      c.id,
      c.slug,
      c.name,
      c.description,
      count(distinct u.id)::int AS upcoming_event_count,
      coalesce(array_agg(distinct i.interest) filter (where i.interest is not null), '{}') AS interests,
      coalesce(array_agg(distinct u.neighborhood) filter (where u.neighborhood is not null), '{}') AS neighborhoods
    FROM ${communities} c
    LEFT JOIN upcoming u ON u.community_tag = 'community:' || c.slug
    LEFT JOIN LATERAL (
      SELECT substring(t.tag from 10) AS interest
      FROM event_tags t
      WHERE t.event_id = u.id AND t.tag LIKE 'interest:%'
    ) i ON true
    GROUP BY c.id
    ORDER BY count(distinct u.id) DESC, c.name ASC
  `);

  return result.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    interests: row.interests ?? [],
    neighborhoods: row.neighborhoods ?? [],
    upcomingEventCount: Number(row.upcoming_event_count),
  }));
}

/**
 * Detail page query: the community resolved by slug plus its upcoming
 * events (startsAt ascending) and derived interests. Returns null for an
 * unknown slug — the page renders 404, never an empty shell.
 */
export async function getCommunityDetail(
  db: Db,
  slug: string,
  now: Date = new Date(),
): Promise<CommunityDetail | null> {
  const [community] = await db
    .select()
    .from(communities)
    .where(eq(communities.slug, slug))
    .limit(1);
  if (!community) return null;

  const upcomingEvents = await db
    .select({
      id: events.id,
      title: events.title,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      venue: events.venue,
      neighborhood: events.neighborhood,
      priceType: events.priceType,
      priceMin: events.priceMin,
      canonicalUrl: events.canonicalUrl,
      sourceSlug: sources.slug,
    })
    .from(eventTags)
    .innerJoin(events, eq(eventTags.eventId, events.id))
    .innerJoin(sources, eq(events.sourceId, sources.id))
    .where(and(eq(eventTags.tag, `community:${slug}`), upcomingEventsWhere(now)))
    .orderBy(asc(events.startsAt));

  // Interests come from the community's upcoming listings, so the page
  // reflects what the organizer actually runs — not a stored copy.
  const eventIds = upcomingEvents.map((e) => e.id);
  const interestRows =
    eventIds.length === 0
      ? []
      : await db
          .selectDistinct({ interest: sql<string>`substring(${eventTags.tag} from 10)` })
          .from(eventTags)
          .where(and(inArray(eventTags.eventId, eventIds), like(eventTags.tag, "interest:%")));

  return {
    community,
    interests: interestRows.map((r) => r.interest).sort(),
    upcomingEvents,
  };
}
