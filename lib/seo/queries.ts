/**
 * SEO read-side: event-detail fetch for /events/[id] and sitemap entry
 * collection for /sitemap.xml. Same convention as the other query layers —
 * the database handle is the first argument, no auth or request state.
 *
 * Staleness mirrors lib/events/queries.freshPredicate: an event whose end
 * (or start, when no end is known) has passed, or whose expires_at cutoff
 * has fired, is excluded from the sitemap. Sitemaps list only pages worth
 * crawling — live listings.
 */
import { and, asc, eq, gt, isNull, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { communities, events, sources } from "@/lib/db/schema";

type Db = PostgresJsDatabase<Record<string, never>>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface EventDetail {
  id: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date | null;
  venue: string | null;
  neighborhood: string | null;
  borough: string | null;
  priceType: "free" | "paid" | "unknown";
  priceMin: number | null;
  priceMax: number | null;
  canonicalUrl: string;
  sourceSlug: string;
}

/**
 * One full listing by id. A non-UUID id (every uuid column rejects it in
 * SQL anyway) resolves to null so the page renders notFound instead of
 * surfacing a driver cast error.
 */
export async function getEventDetail(
  db: Db,
  id: string,
): Promise<EventDetail | null> {
  if (!UUID_RE.test(id)) return null;

  const [row] = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      venue: events.venue,
      neighborhood: events.neighborhood,
      borough: events.borough,
      priceType: events.priceType,
      priceMin: events.priceMin,
      priceMax: events.priceMax,
      canonicalUrl: events.canonicalUrl,
      sourceSlug: sources.slug,
    })
    .from(events)
    .innerJoin(sources, eq(events.sourceId, sources.id))
    .where(eq(events.id, id))
    .limit(1);

  return row ?? null;
}

export interface SitemapPaths {
  /** Fresh (live) event ids, startsAt ascending. */
  eventIds: string[];
  /** All community slugs — organizers are evergreen pages. */
  communitySlugs: string[];
}

/** Live-event ids and community slugs for the sitemap route. */
export async function getSitemapPaths(db: Db, now: Date = new Date()): Promise<SitemapPaths> {
  const freshPredicate = and(
    or(gt(events.endsAt, now), and(isNull(events.endsAt), gt(events.startsAt, now))),
    or(isNull(events.expiresAt), gt(events.expiresAt, now)),
  );

  const [eventRows, communityRows] = await Promise.all([
    db
      .select({ id: events.id })
      .from(events)
      .where(freshPredicate)
      .orderBy(asc(events.startsAt)),
    db.select({ slug: communities.slug }).from(communities).orderBy(asc(communities.slug)),
  ]);

  return {
    eventIds: eventRows.map((r) => r.id),
    communitySlugs: communityRows.map((r) => r.slug),
  };
}
