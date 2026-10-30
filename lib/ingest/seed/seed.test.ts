/**
 * Seed pipeline tests against an isolated, throwaway Postgres database
 * (see lib/db/test-db): two consecutive runs leave an identical event count
 * with zero duplicate (source_id, external_id) pairs, and the seeded
 * calendar covers every interest category, persona tag, and neighborhood
 * with future dates.
 */
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { closeDb, getDb } from "../../db";
import { createIsolatedTestDb } from "../../db/test-db";
import { communities, eventTags, events, jobPostings } from "../../db/schema";
import { runSeed } from "./seed";
import { COMMUNITIES, JOB_POSTINGS } from "./fixtures";
import { INTEREST_TAGS, NEIGHBORHOODS, PERSONA_TAGS, type Neighborhood } from "./taxonomy";

let db: ReturnType<typeof getDb>;
let disposeTestDb: () => Promise<void>;

beforeAll(async () => {
  // Isolated database + env override before the first getDb() call, so the
  // cached singleton connects to the throwaway DB, not shared dev data.
  const testDb = await createIsolatedTestDb("nyc_seed_test");
  process.env.DATABASE_URL = testDb.url;
  db = getDb();
  disposeTestDb = testDb.dispose;
}, 30_000);

/** Fixed clock — expansion is deterministic, so ids and counts are stable. */
const NOW = new Date("2026-10-30T15:00:00Z");

afterAll(async () => {
  // Closes the cached client and resets the singleton, so a later test file
  // that needs the database opens a fresh connection.
  await closeDb();
  await disposeTestDb();
});

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE TABLE event_tags, events, communities, job_postings, sources CASCADE`,
  );
});

describe("runSeed", () => {
  it("seeds the same event count on a second run, with zero duplicate keys", async () => {
    const first = await runSeed(db, NOW);
    const afterFirst = await db.select({ id: events.id }).from(events);

    const second = await runSeed(db, NOW);
    const afterSecond = await db.select({ id: events.id }).from(events);

    expect(second.events).toBe(first.events);
    expect(afterSecond).toHaveLength(afterFirst.length);

    const duplicates = await db
      .select({ sourceId: events.sourceId, externalId: events.externalId })
      .from(events)
      .groupBy(events.sourceId, events.externalId)
      .having(sql`COUNT(*) > 1`);
    expect(duplicates).toEqual([]);
  });

  it("seeds several hundred future-dated events", async () => {
    const summary = await runSeed(db, NOW);
    expect(summary.events).toBeGreaterThanOrEqual(300);

    const rows = await db.select({ startsAt: events.startsAt }).from(events);
    expect(rows.length).toBe(summary.events);
    const now = new Date();
    for (const row of rows) {
      expect(row.startsAt.getTime()).toBeGreaterThan(now.getTime());
    }
  });

  it("covers every interest category and persona tag", async () => {
    await runSeed(db, NOW);
    const tagRows = await db.selectDistinct({ tag: eventTags.tag }).from(eventTags);
    const tags = tagRows.map((r) => r.tag);

    for (const interest of INTEREST_TAGS) {
      expect(tags, `missing ${interest}`).toContain(interest);
    }
    for (const persona of PERSONA_TAGS) {
      expect(tags, `missing ${persona}`).toContain(persona);
    }
  });

  it("covers every neighborhood with borough-consistent events", async () => {
    await runSeed(db, NOW);
    const pairs = await db
      .selectDistinct({ neighborhood: events.neighborhood, borough: events.borough })
      .from(events);
    const bySlug = new Map<string, string>(
      pairs
        .filter((r): r is { neighborhood: string; borough: string } => r.neighborhood !== null)
        .map((r) => [r.neighborhood, r.borough as string]),
    );

    for (const hood of NEIGHBORHOODS as Neighborhood[]) {
      const borough = bySlug.get(hood.slug);
      expect(borough, `no events seeded for ${hood.slug}`).toBeDefined();
      expect(borough).toBe(hood.borough);
    }
  });

  it("seeds communities and job postings idempotently", async () => {
    await runSeed(db, NOW);
    const firstCommunities = (await db.select().from(communities)).length;
    const firstJobs = (await db.select().from(jobPostings)).length;

    await runSeed(db, NOW);
    const secondCommunities = (await db.select().from(communities)).length;
    const secondJobs = (await db.select().from(jobPostings)).length;

    expect(firstCommunities).toBe(COMMUNITIES.length);
    expect(secondCommunities).toBe(COMMUNITIES.length);
    expect(firstJobs).toBe(JOB_POSTINGS.length);
    expect(secondJobs).toBe(JOB_POSTINGS.length);
  });
});
