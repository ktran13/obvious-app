/**
 * Seed runner — populates a freshly migrated database with curated demo
 * content: four source rows, several hundred future-dated events covering
 * every interest/persona/neighborhood, community pages, and job postings.
 *
 * Idempotent by construction: deterministic expansion produces stable
 * external ids, events upsert on (source_id, external_id), communities
 * upsert on slug, and jobs insert only when their apply_url is missing.
 * Re-runs refresh rather than duplicate.
 */
import { pathToFileURL } from "node:url";

import { eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "../../db";
import { communities, jobPostings, sources } from "../../db/schema";
import { validateParsedEvents } from "../validate";
import { isEventStale, upsertEvents } from "../sync";
import { expandCuratedEvents, CURATED_SOURCE_SLUG } from "./expand";
import { COMMUNITIES, JOB_POSTINGS } from "./fixtures";

export interface SeedSummary {
  events: number;
  communities: number;
  jobs: number;
  skippedStale: number;
}

const CHUNK_SIZE = 200;

function chunk<T>(items: T[], size = CHUNK_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function runSeed(db: PostgresJsDatabase, now: Date = new Date()): Promise<SeedSummary> {
  // Register every adapter's source row so later syncs map slugs to ids.
  // `enabled` is operator state — the upsert does not clobber it.
  await db.insert(sources).values([
    { slug: "curated", kind: "manual", enabled: true },
    { slug: "luma-nyc", kind: "ical", enabled: true },
    { slug: "freenyc", kind: "manual", enabled: true },
    { slug: "meetup", kind: "api", enabled: false },
  ]).onConflictDoNothing();

  const [curated] = await db.select().from(sources).where(eq(sources.slug, CURATED_SOURCE_SLUG));
  if (!curated) throw new Error("curated source row missing after upsert");

  // Communities upsert on slug.
  const communityRows = COMMUNITIES.map((c) => ({
    slug: c.slug,
    name: c.name,
    description: c.description,
    sourceId: curated.id,
    externalId: c.slug,
    canonicalUrl: `https://example.org/communities/${c.slug}`,
  }));
  for (const batch of chunk(communityRows)) {
    await db
      .insert(communities)
      .values(batch)
      .onConflictDoUpdate({
        target: communities.slug,
        set: {
          name: sql`excluded.name`,
          description: sql`excluded.description`,
          canonicalUrl: sql`excluded.canonical_url`,
          sourceId: sql`excluded.source_id`,
          externalId: sql`excluded.external_id`,
        },
      });
  }

  // Events: expand → validate → skip stale → upsert.
  const candidates = expandCuratedEvents(now);
  const { accepted, rejected } = validateParsedEvents(CURATED_SOURCE_SLUG, candidates, {
    warn: () => {},
    error: () => {},
  });
  if (rejected.length > 0) {
    // Curated data is code-controlled; a rejection here is a fixture bug.
    throw new Error(
      `Curated seed fixtures invalid: ${rejected.length} item(s) failed parsedEventSchema — first: ${JSON.stringify(rejected[0].issues)}`,
    );
  }
  const fresh = accepted.filter(
    (e) => !isEventStale({ startsAt: e.startsAt, endsAt: e.endsAt ?? null, expiresAt: e.expiresAt ?? null }, now),
  );
  await upsertEvents(db, CURATED_SOURCE_SLUG, "manual", fresh);

  // Jobs: insert-if-missing keyed by apply_url.
  const existingApplyUrls = new Set(
    (await db.select({ applyUrl: jobPostings.applyUrl }).from(jobPostings)).map((r) => r.applyUrl),
  );
  const missingJobs = JOB_POSTINGS.filter((j) => !existingApplyUrls.has(j.applyUrl)).map((j) => ({
    title: j.title,
    company: j.company,
    description: j.description,
    applyUrl: j.applyUrl,
    interestSlug: j.interestSlug,
    postedAt: new Date(now.getTime() - j.postedDaysAgo * 86_400_000),
  }));
  for (const batch of chunk(missingJobs)) {
    await db.insert(jobPostings).values(batch).onConflictDoNothing();
  }

  return {
    events: fresh.length,
    communities: COMMUNITIES.length,
    jobs: missingJobs.length,
    skippedStale: accepted.length - fresh.length,
  };
}

// CLI entry: `pnpm db:seed` (tsx lib/ingest/seed/seed.ts). Tests import
// runSeed directly, so main() only fires when this module is the entrypoint.
const invokedAsScript =
  typeof process !== "undefined" &&
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedAsScript) {
  runSeed(getDb())
    .then((summary) => {
      console.log(
        `Seed complete: ${summary.events} events (${summary.skippedStale} stale skipped), ` +
          `${summary.communities} communities, ${summary.jobs} job postings.`,
      );
      process.exit(0);
    })
    .catch((error: unknown) => {
      console.error("Seed failed:", error);
      process.exit(1);
    });
}
