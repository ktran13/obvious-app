/**
 * SEO query tests — isolated in a throwaway Postgres database (see
 * lib/db/test-db), seeded with fresh and stale listings so the sitemap path
 * collection can be checked against realistic data.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createIsolatedTestDb,
  type IsolatedTestDb,
} from "@/lib/db/test-db";
import { communities, events, sources } from "@/lib/db/schema";
import { resolveDatabaseUrl } from "@/lib/db/url";
import { getEventDetail, getSitemapPaths } from "./queries";

const TEST_DB = "nyc_seo_test";

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
  await db.execute(
    `TRUNCATE saved_items, user_filter_preferences, event_tags, events, communities,
     job_postings, accounts, sessions, users, sources CASCADE`,
  );
});

const NOW = new Date("2026-11-01T12:00:00-04:00");
const FUTURE = new Date("2026-11-05T18:30:00-05:00");
const PAST = new Date("2026-10-15T18:30:00-04:00");

async function seedSource() {
  const [source] = await db
    .insert(sources)
    .values({ slug: "luma-test", kind: "ical" })
    .returning();
  return source;
}

async function seedEvent(
  sourceId: string,
  overrides: Partial<typeof events.$inferInsert> = {},
) {
  const [event] = await db
    .insert(events)
    .values({
      sourceId,
      externalId: "evt_1",
      canonicalUrl: "https://lu.ma/evt",
      title: "Community Event",
      startsAt: FUTURE,
      ...overrides,
    })
    .returning();
  return event;
}

describe("getSitemapPaths", () => {
  it("lists fresh event ids and all community slugs", async () => {
    const source = await seedSource();
    const fresh = await seedEvent(source.id, { externalId: "evt_fresh" });
    await seedEvent(source.id, { externalId: "evt_stale", startsAt: PAST });
    await db
      .insert(communities)
      .values([
        { slug: "indie-makers", name: "Indie Makers" },
        { slug: "nyckickers", name: "NYC Kickers" },
      ]);

    const paths = await getSitemapPaths(db, NOW);

    expect(paths.eventIds).toEqual([fresh.id]);
    expect(paths.communitySlugs).toEqual(["indie-makers", "nyckickers"]);
  });

  it("excludes events past their expires_at takedown cutoff", async () => {
    const source = await seedSource();
    await seedEvent(source.id, { externalId: "evt_taken", expiresAt: PAST });

    const paths = await getSitemapPaths(db, NOW);
    expect(paths.eventIds).toEqual([]);
  });

  it("keeps an event whose end has not passed even after its start", async () => {
    const source = await seedSource();
    const ongoing = await seedEvent(source.id, {
      externalId: "evt_ongoing",
      startsAt: PAST,
      endsAt: new Date("2026-11-02T20:30:00-04:00"),
    });

    const paths = await getSitemapPaths(db, NOW);
    expect(paths.eventIds).toEqual([ongoing.id]);
  });
});

describe("getEventDetail", () => {
  it("returns the full listing for a valid id", async () => {
    const source = await seedSource();
    const seeded = await seedEvent(source.id, {
      title: "Jazz at the Corner",
      venue: "The Corner",
      neighborhood: "Bushwick",
      borough: "brooklyn",
      priceType: "paid",
      priceMin: 2500,
    });

    const detail = await getEventDetail(db, seeded.id);
    expect(detail).toMatchObject({
      id: seeded.id,
      title: "Jazz at the Corner",
      venue: "The Corner",
      priceType: "paid",
      priceMin: 2500,
      sourceSlug: "luma-test",
    });
  });

  it("resolves a non-UUID id to null instead of a driver cast error", async () => {
    await expect(getEventDetail(db, "../../etc/passwd")).resolves.toBeNull();
  });

  it("resolves an unknown UUID to null", async () => {
    await expect(
      getEventDetail(db, "00000000-0000-0000-0000-000000000000"),
    ).resolves.toBeNull();
  });
});
