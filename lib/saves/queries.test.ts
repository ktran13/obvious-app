/**
 * Save/list/unsave query tests — run against a real Postgres (compose service,
 * or CI's postgres:16 service). Requires migrations applied first:
 * `pnpm db:migrate`.
 */
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { communities, events, savedItems, sources, users } from "@/lib/db/schema";
import { resolveDatabaseUrl } from "@/lib/db/url";
import {
  isCommunitySaved,
  isEventSaved,
  listSavedCommunities,
  listSavedEvents,
  saveCommunity,
  saveEvent,
  unsaveCommunity,
  unsaveEvent,
} from "./queries";

const client = postgres(resolveDatabaseUrl(), { max: 1, connect_timeout: 5 });
const db = drizzle(client);

afterAll(async () => {
  await client.end();
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

async function seedUser() {
  const n = nextId();
  const [user] = await db
    .insert(users)
    .values({ id: `user_${n}`, email: `user_${n}@example.com` })
    .returning();
  return user;
}

async function seedEvent(overrides: Partial<typeof events.$inferInsert> = {}) {
  const n = nextId();
  const [source] = await db
    .insert(sources)
    .values({ slug: `luma-${n}`, kind: "ical" })
    .returning();
  const [event] = await db
    .insert(events)
    .values({
      sourceId: source.id,
      externalId: `evt_${n}`,
      canonicalUrl: "https://lu.ma/evt",
      title: "Brooklyn Tech Meetup",
      startsAt: new Date("2026-11-05T18:30:00-05:00"),
      ...overrides,
    })
    .returning();
  return event;
}

async function seedCommunity() {
  const n = nextId();
  const [community] = await db
    .insert(communities)
    .values({ slug: `run-club-${n}`, name: "Run Club" })
    .returning();
  return community;
}

describe("saveEvent / unsaveEvent", () => {
  it("saves an event and reports it as saved", async () => {
    const user = await seedUser();
    const event = await seedEvent();

    await saveEvent(db, user.id, event.id);

    expect(await isEventSaved(db, user.id, event.id)).toBe(true);
    expect(await isEventSaved(db, user.id, crypto.randomUUID())).toBe(false);
  });

  it("is idempotent — a duplicate save does not error or duplicate", async () => {
    const user = await seedUser();
    const event = await seedEvent();

    await saveEvent(db, user.id, event.id);
    await saveEvent(db, user.id, event.id);

    const rows = await db.select().from(savedItems).where(eq(savedItems.userId, user.id));
    expect(rows).toHaveLength(1);
  });

  it("unsaves and reports false when nothing was saved", async () => {
    const user = await seedUser();
    const event = await seedEvent();

    await saveEvent(db, user.id, event.id);
    expect(await unsaveEvent(db, user.id, event.id)).toBe(true);
    expect(await isEventSaved(db, user.id, event.id)).toBe(false);
    expect(await unsaveEvent(db, user.id, event.id)).toBe(false);
  });

  it("rejects a save for a nonexistent event (FK integrity)", async () => {
    const user = await seedUser();

    await expect(saveEvent(db, user.id, crypto.randomUUID())).rejects.toMatchObject({
      cause: { code: "23503" }, // foreign_key_violation
    });
  });
});

describe("saveCommunity / unsaveCommunity", () => {
  it("saves and unsaves a community without touching event saves", async () => {
    const user = await seedUser();
    const community = await seedCommunity();
    const event = await seedEvent();

    await saveEvent(db, user.id, event.id);
    await saveCommunity(db, user.id, community.id);

    expect(await isCommunitySaved(db, user.id, community.id)).toBe(true);
    const rows = await db.select().from(savedItems).where(eq(savedItems.userId, user.id));
    expect(rows).toHaveLength(2);

    expect(await unsaveCommunity(db, user.id, community.id)).toBe(true);
    expect(await isCommunitySaved(db, user.id, community.id)).toBe(false);
    expect(await isEventSaved(db, user.id, event.id)).toBe(true);
  });
});

describe("exactly-one-target CHECK", () => {
  it("rejects a save with both event and community targets", async () => {
    const user = await seedUser();
    const event = await seedEvent();
    const community = await seedCommunity();

    await expect(
      db
        .insert(savedItems)
        .values({ userId: user.id, eventId: event.id, communityId: community.id }),
    ).rejects.toMatchObject({ cause: { code: "23514" } }); // check_violation
  });

  it("rejects a save with no target at all", async () => {
    const user = await seedUser();

    await expect(db.insert(savedItems).values({ userId: user.id })).rejects.toMatchObject({
      cause: { code: "23514" },
    });
  });
});

describe("listSavedEvents / listSavedCommunities", () => {
  it("lists saved events most recently saved first", async () => {
    const user = await seedUser();
    const first = await seedEvent({ title: "First" });
    const second = await seedEvent({ title: "Second" });

    await saveEvent(db, user.id, first.id);
    // Guarantee distinct saved_at ordering despite millisecond precision.
    await new Promise((resolve) => setTimeout(resolve, 20));
    await saveEvent(db, user.id, second.id);

    const saved = await listSavedEvents(db, user.id);
    expect(saved.map((row) => row.title)).toEqual(["Second", "First"]);
    expect(saved[0]).toMatchObject({ venue: first.venue, canonicalUrl: first.canonicalUrl });
  });

  it("lists saved events and communities separately", async () => {
    const user = await seedUser();
    const event = await seedEvent();
    const community = await seedCommunity();

    await saveEvent(db, user.id, event.id);
    await saveCommunity(db, user.id, community.id);

    expect(await listSavedEvents(db, user.id)).toHaveLength(1);
    const savedCommunities = await listSavedCommunities(db, user.id);
    expect(savedCommunities).toHaveLength(1);
    expect(savedCommunities[0]).toMatchObject({ name: "Run Club" });
  });

  it("returns empty lists for a user with no saves", async () => {
    const user = await seedUser();
    expect(await listSavedEvents(db, user.id)).toEqual([]);
    expect(await listSavedCommunities(db, user.id)).toEqual([]);
  });
});
