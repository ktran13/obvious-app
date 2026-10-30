/**
 * Community directory/detail query tests — isolated in a throwaway Postgres
 * database (see lib/db/test-db), so they neither see nor destroy the shared
 * dev/CI seed data (306 curated events).
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createIsolatedTestDb,
  type IsolatedTestDb,
} from "@/lib/db/test-db";
import { communities, eventTags, events, sources } from "@/lib/db/schema";
import { resolveDatabaseUrl } from "@/lib/db/url";
import { getCommunityDetail, listCommunities } from "./queries";

const TEST_DB = "nyc_communities_test";

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
  await db.execute(
    `TRUNCATE saved_items, user_filter_preferences, event_tags, events, communities,
     job_postings, accounts, sessions, users, sources CASCADE`,
  );
});

let counter = 0;
/** Unique-per-call suffix so seed rows never collide on unique columns. */
function nextId() {
  counter += 1;
  return counter;
}

const HOUR = 3_600_000;
const FUTURE = new Date("2026-11-05T18:30:00-05:00");

async function seedSource() {
  const n = nextId();
  const [source] = await db
    .insert(sources)
    .values({ slug: `luma-${n}`, kind: "ical" })
    .returning();
  return source;
}

async function seedEvent(
  sourceId: string,
  overrides: Partial<typeof events.$inferInsert> = {},
) {
  const n = nextId();
  const [event] = await db
    .insert(events)
    .values({
      sourceId,
      externalId: `evt_${n}`,
      canonicalUrl: "https://lu.ma/evt",
      title: "Community Event",
      startsAt: FUTURE,
      ...overrides,
    })
    .returning();
  return event;
}

async function tagEvent(eventId: string, tags: string[]) {
  await db.insert(eventTags).values(tags.map((tag) => ({ eventId, tag })));
}

async function seedCommunity(overrides: Partial<typeof communities.$inferInsert> = {}) {
  const n = nextId();
  const [community] = await db
    .insert(communities)
    .values({ slug: `run-club-${n}`, name: `Run Club ${n}`, ...overrides })
    .returning();
  return community;
}

describe("listCommunities", () => {
  it("aggregates upcoming event count, interests, and neighborhoods per community", async () => {
    const source = await seedSource();
    const community = await seedCommunity({ slug: "brooklyn-tech", name: "Brooklyn Tech" });

    const first = await seedEvent(source.id, {
      title: "Hack Night",
      neighborhood: "park-slope",
      startsAt: FUTURE,
    });
    await tagEvent(first.id, [`community:${community.slug}`, "interest:tech"]);
    const second = await seedEvent(source.id, {
      title: "Show & Tell",
      neighborhood: "bushwick",
      startsAt: new Date(FUTURE.getTime() + 24 * HOUR),
    });
    await tagEvent(second.id, [`community:${community.slug}`, "interest:tech", "interest:arts"]);
    // A different organizer's event — must not leak into the aggregation.
    const other = await seedCommunity({ slug: "other-org", name: "Other Org" });
    await tagEvent(second.id, [`community:${other.slug}`]);

    const items = await listCommunities(db);

    const brooklynTech = items.find((c) => c.slug === "brooklyn-tech");
    expect(brooklynTech).toBeDefined();
    expect(brooklynTech?.upcomingEventCount).toBe(2);
    expect(brooklynTech?.interests).toEqual(["arts", "tech"]);
    expect(brooklynTech?.neighborhoods).toEqual(["bushwick", "park-slope"]);

    const otherOrg = items.find((c) => c.slug === "other-org");
    expect(otherOrg?.upcomingEventCount).toBe(1);
  });

  it("excludes started, ended, and expired events from the count", async () => {
    const source = await seedSource();
    const community = await seedCommunity();
    const now = new Date();
    const past = await seedEvent(source.id, {
      startsAt: new Date(now.getTime() - 48 * HOUR),
    });
    await tagEvent(past.id, [`community:${community.slug}`, "interest:tech"]);
    const expired = await seedEvent(source.id, {
      startsAt: new Date(now.getTime() + 24 * HOUR),
      // Already past its hard takedown cutoff — excluded even though it
      // has not started yet.
      expiresAt: new Date(now.getTime() - HOUR),
    });
    await tagEvent(expired.id, [`community:${community.slug}`]);
    const upcoming = await seedEvent(source.id, {
      startsAt: new Date(now.getTime() + 24 * HOUR),
    });
    await tagEvent(upcoming.id, [`community:${community.slug}`]);

    const [item] = await listCommunities(db);
    expect(item.upcomingEventCount).toBe(1);
    expect(item.interests).toEqual([]);
  });

  it("orders by upcoming count descending, then name", async () => {
    const source = await seedSource();
    const quiet = await seedCommunity({ name: "Quiet Club" });
    const busy = await seedCommunity({ name: "Busy Club" });
    await seedCommunity({ name: "Lonely Club" });

    const event = await seedEvent(source.id);
    await tagEvent(event.id, [`community:${busy.slug}`]);
    await tagEvent(event.id, [`community:${quiet.slug}`]);
    // lonely gets nothing — 0 count, sorts after the others by name.

    const items = await listCommunities(db);
    expect(items.map((c) => c.name)).toEqual(["Busy Club", "Quiet Club", "Lonely Club"]);
  });
});

describe("getCommunityDetail", () => {
  it("resolves the slug and returns its upcoming events in startsAt order", async () => {
    const source = await seedSource();
    const community = await seedCommunity({ slug: "brooklyn-tech", name: "Brooklyn Tech" });

    const later = await seedEvent(source.id, {
      title: "Later Session",
      startsAt: new Date(FUTURE.getTime() + 24 * HOUR),
      priceType: "paid",
      priceMin: 1000,
    });
    await tagEvent(later.id, [`community:${community.slug}`, "interest:tech"]);
    const earlier = await seedEvent(source.id, {
      title: "Earlier Session",
      priceType: "free",
    });
    await tagEvent(earlier.id, [`community:${community.slug}`, "interest:tech", "interest:food"]);

    const detail = await getCommunityDetail(db, "brooklyn-tech");
    expect(detail?.community.slug).toBe("brooklyn-tech");
    expect(detail?.upcomingEvents.map((e) => e.title)).toEqual([
      "Earlier Session",
      "Later Session",
    ]);
    expect(detail?.interests).toEqual(["food", "tech"]);
    expect(detail?.upcomingEvents[0].priceType).toBe("free");
  });

  it("returns null for an unknown slug (renders 404)", async () => {
    expect(await getCommunityDetail(db, "not-a-real-community")).toBeNull();
  });

  it("excludes ended events and an empty community renders with no events", async () => {
    const source = await seedSource();
    await seedCommunity({ slug: "empty-org", name: "Empty Org" });
    const full = await seedCommunity({ slug: "full-org", name: "Full Org" });
    const now = new Date();
    const ended = await seedEvent(source.id, {
      startsAt: new Date(now.getTime() - 2 * HOUR),
      endsAt: new Date(now.getTime() - HOUR),
    });
    await tagEvent(ended.id, [`community:${full.slug}`]);

    const emptyDetail = await getCommunityDetail(db, "empty-org");
    expect(emptyDetail?.upcomingEvents).toEqual([]);
    expect(emptyDetail?.interests).toEqual([]);

    const fullDetail = await getCommunityDetail(db, "full-org");
    expect(fullDetail?.upcomingEvents).toEqual([]);
  });
});
