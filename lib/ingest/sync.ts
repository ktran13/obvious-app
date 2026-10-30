/**
 * Upsert pipeline — the write path behind every adapter and the seed.
 *
 * Dedupe key is (source_id, external_id), enforced by the unique index
 * events_source_external_id_uq; re-running a sync updates rows in place and
 * never duplicates. Tags are replaced wholesale per event so re-runs reflect
 * the latest payload exactly.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { eventTags, events, sources, type NewEvent, type Source } from "../db/schema";
import type { ParsedEvent } from "../schemas/parsed-event";

/**
 * Staleness per the schema semantics: `expires_at` is a hard takedown cutoff,
 * and an event that has already ended (ends_at, or starts_at when ends_at is
 * null) is stale too. The seed skips stale fixtures; the directory query
 * layer applies the same predicate to exclude takedown-ready rows.
 */
export interface StalenessShape {
  startsAt: Date;
  endsAt: Date | null;
  expiresAt: Date | null;
}

export function isEventStale(event: StalenessShape, now: Date = new Date()): boolean {
  const end = event.endsAt ?? event.startsAt;
  if (event.expiresAt && event.expiresAt.getTime() <= now.getTime()) return true;
  return end.getTime() <= now.getTime();
}

/** Insert-or-update the source row; `enabled` is operator state — never clobbered. */
export async function ensureSource(
  db: PostgresJsDatabase,
  slug: string,
  kind: string,
  defaultEnabled = true,
): Promise<Source> {
  const [row] = await db
    .insert(sources)
    .values({ slug, kind, enabled: defaultEnabled })
    .onConflictDoUpdate({ target: sources.slug, set: { kind } })
    .returning();
  await db.update(sources).set({ lastSyncedAt: new Date() }).where(eq(sources.slug, slug));
  return row;
}

export interface UpsertResult {
  upserted: number;
  tagRows: number;
}

/** Postgres binds at most 65535 parameters — chunk well under that. */
const CHUNK_SIZE = 200;

function chunk<T>(items: T[], size = CHUNK_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Upsert a validated batch for one source. Every field except the dedupe key
 * updates from the new payload (excluded.*), so re-running a sync refreshes
 * listings in place.
 */
export async function upsertEvents(
  db: PostgresJsDatabase,
  sourceSlug: string,
  sourceKind: string,
  parsed: ParsedEvent[],
): Promise<UpsertResult> {
  if (parsed.length === 0) return { upserted: 0, tagRows: 0 };

  const source = await ensureSource(db, sourceSlug, sourceKind);
  // Postgres rejects an INSERT whose ON CONFLICT DO UPDATE would touch the
  // same row twice, so collapse within-batch duplicate external ids first
  // (last one wins, matching a re-run's "latest payload" semantics).
  const unique = [...new Map(parsed.map((e) => [e.externalId, e])).values()];
  const rows: NewEvent[] = unique.map((e) => ({
    sourceId: source.id,
    externalId: e.externalId,
    canonicalUrl: e.canonicalUrl,
    title: e.title,
    description: e.description ?? null,
    startsAt: e.startsAt,
    endsAt: e.endsAt ?? null,
    venue: e.venue ?? null,
    neighborhood: e.neighborhood ?? null,
    borough: e.borough ?? null,
    priceType: e.priceType,
    priceMin: e.priceMin ?? null,
    priceMax: e.priceMax ?? null,
    affiliateUrl: e.affiliateUrl ?? null,
    expiresAt: e.expiresAt ?? null,
  }));

  for (const batch of chunk(rows)) {
    await db
      .insert(events)
      .values(batch)
      .onConflictDoUpdate({
        target: [events.sourceId, events.externalId],
        set: {
          canonicalUrl: sql`excluded.canonical_url`,
          title: sql`excluded.title`,
          description: sql`excluded.description`,
          startsAt: sql`excluded.starts_at`,
          endsAt: sql`excluded.ends_at`,
          venue: sql`excluded.venue`,
          neighborhood: sql`excluded.neighborhood`,
          borough: sql`excluded.borough`,
          priceType: sql`excluded.price_type`,
          priceMin: sql`excluded.price_min`,
          priceMax: sql`excluded.price_max`,
          affiliateUrl: sql`excluded.affiliate_url`,
          expiresAt: sql`excluded.expires_at`,
        },
      });
  }

  // Re-resolve ids for exactly this batch, then replace tags wholesale —
  // a re-run with dropped tags removes them instead of accumulating.
  const idByExternalId = new Map<string, string>();
  for (const externalIds of chunk(parsed.map((e) => e.externalId))) {
    const found = await db
      .select({ id: events.id, externalId: events.externalId })
      .from(events)
      .where(and(eq(events.sourceId, source.id), inArray(events.externalId, externalIds)));
    for (const row of found) idByExternalId.set(row.externalId, row.id);
  }

  const tagRows: { eventId: string; tag: string }[] = [];
  for (const e of unique) {
    const eventId = idByExternalId.get(e.externalId);
    if (!eventId) continue;
    for (const tag of new Set(e.tags)) tagRows.push({ eventId, tag });
  }

  if (tagRows.length > 0) {
    for (const ids of chunk([...idByExternalId.values()])) {
      await db.delete(eventTags).where(inArray(eventTags.eventId, ids));
    }
    for (const batch of chunk(tagRows)) {
      await db.insert(eventTags).values(batch).onConflictDoNothing();
    }
  }

  return { upserted: rows.length, tagRows: tagRows.length };
}
