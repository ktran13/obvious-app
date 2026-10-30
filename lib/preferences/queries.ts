/**
 * user_filter_preferences queries. One row per user (user_id is the primary
 * key), holding a JSON snapshot of the /events filter set. Every function
 * takes a database handle as its first argument so callers (server actions,
 * tests) supply the session — nothing here reads auth or request state.
 *
 * The column is never trusted: writes go through serializeEventFilters
 * (Zod-parses before the INSERT) and reads through parseStoredEventFilters,
 * with parse failures degrading to null so a corrupted row renders defaults,
 * never a 500.
 */
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { ZodError } from "zod";

import { userFilterPreferences } from "@/lib/db/schema";
import {
  parseStoredEventFilters,
  serializeEventFilters,
  type EventFilter,
} from "@/lib/schemas/event-filters";

type Db = PostgresJsDatabase<Record<string, never>>;

/**
 * Upsert the user's saved filter set. serialization validates through
 * eventFilterSchema first — a malformed set throws ZodError before any SQL
 * runs. onConflictDoUpdate on the primary key keeps exactly one row per user.
 */
export async function saveFilterPreferences(db: Db, userId: string, filters: EventFilter) {
  const json = serializeEventFilters(filters);
  await db
    .insert(userFilterPreferences)
    .values({ userId, filters: json, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userFilterPreferences.userId,
      set: { filters: json, updatedAt: new Date() },
    });
}

/**
 * The user's saved filter set, or null when absent or unparsable. A corrupted
 * row is bad data, not a request failure — it degrades to "no saved filters".
 */
export async function getFilterPreferences(db: Db, userId: string): Promise<EventFilter | null> {
  const [row] = await db
    .select({ filters: userFilterPreferences.filters })
    .from(userFilterPreferences)
    .where(eq(userFilterPreferences.userId, userId))
    .limit(1);
  if (!row) return null;

  try {
    return parseStoredEventFilters(row.filters);
  } catch (error) {
    if (error instanceof ZodError) return null;
    throw error;
  }
}

/** Deletes the saved row. True when one existed. */
export async function clearFilterPreferences(db: Db, userId: string) {
  const removed = await db
    .delete(userFilterPreferences)
    .where(eq(userFilterPreferences.userId, userId))
    .returning({ userId: userFilterPreferences.userId });
  return removed.length > 0;
}
