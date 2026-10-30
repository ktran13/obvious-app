/**
 * Saved-item queries. Every function takes a database handle as its first
 * argument so callers (server actions, tests) supply the session — nothing
 * here reads auth or request state.
 *
 * saved_items enforces exactly-one-target at the database level
 * (saved_items_one_target CHECK), so each save function names its target
 * column explicitly.
 */
import { and, desc, eq, isNotNull } from "drizzle-orm";

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { communities, events, savedItems, sources } from "@/lib/db/schema";

type Db = PostgresJsDatabase<Record<string, never>>;

/** Idempotent save: a duplicate (userId, eventId) is a no-op, not an error. */
export async function saveEvent(db: Db, userId: string, eventId: string) {
  return db
    .insert(savedItems)
    .values({ userId, eventId })
    .onConflictDoNothing()
    .returning({ savedAt: savedItems.savedAt });
}

export async function saveCommunity(db: Db, userId: string, communityId: string) {
  return db
    .insert(savedItems)
    .values({ userId, communityId })
    .onConflictDoNothing()
    .returning({ savedAt: savedItems.savedAt });
}

export async function unsaveEvent(db: Db, userId: string, eventId: string) {
  const removed = await db
    .delete(savedItems)
    .where(and(eq(savedItems.userId, userId), eq(savedItems.eventId, eventId)))
    .returning({ eventId: savedItems.eventId });
  return removed.length > 0;
}

export async function unsaveCommunity(db: Db, userId: string, communityId: string) {
  const removed = await db
    .delete(savedItems)
    .where(and(eq(savedItems.userId, userId), eq(savedItems.communityId, communityId)))
    .returning({ communityId: savedItems.communityId });
  return removed.length > 0;
}

/** True when the user has the event saved — used to render initial button state. */
export async function isEventSaved(db: Db, userId: string, eventId: string) {
  const [row] = await db
    .select({ savedAt: savedItems.savedAt })
    .from(savedItems)
    .where(and(eq(savedItems.userId, userId), eq(savedItems.eventId, eventId)))
    .limit(1);
  return Boolean(row);
}

export async function isCommunitySaved(db: Db, userId: string, communityId: string) {
  const [row] = await db
    .select({ savedAt: savedItems.savedAt })
    .from(savedItems)
    .where(and(eq(savedItems.userId, userId), eq(savedItems.communityId, communityId)))
    .limit(1);
  return Boolean(row);
}

/** Saved events, most recently saved first, joined back to the listing. */
export async function listSavedEvents(db: Db, userId: string) {
  return db
    .select({
      eventId: events.id,
      title: events.title,
      startsAt: events.startsAt,
      venue: events.venue,
      neighborhood: events.neighborhood,
      canonicalUrl: events.canonicalUrl,
      sourceLabel: sources.slug,
      savedAt: savedItems.savedAt,
    })
    .from(savedItems)
    .innerJoin(events, eq(savedItems.eventId, events.id))
    .innerJoin(sources, eq(events.sourceId, sources.id))
    .where(and(eq(savedItems.userId, userId), isNotNull(savedItems.eventId)))
    .orderBy(desc(savedItems.savedAt));
}

/** Saved communities, most recently saved first. */
export async function listSavedCommunities(db: Db, userId: string) {
  return db
    .select({
      communityId: communities.id,
      name: communities.name,
      description: communities.description,
      canonicalUrl: communities.canonicalUrl,
      savedAt: savedItems.savedAt,
    })
    .from(savedItems)
    .innerJoin(communities, eq(savedItems.communityId, communities.id))
    .where(and(eq(savedItems.userId, userId), isNotNull(savedItems.communityId)))
    .orderBy(desc(savedItems.savedAt));
}
