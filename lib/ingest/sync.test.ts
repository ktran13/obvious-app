/**
 * Upsert pipeline tests against a real (locally migrated) Postgres:
 * re-running upserts updates in place, never duplicates (source_id,
 * external_id); tags are replaced wholesale; stale-window semantics match
 * the schema's expires_at / ended-event rules.
 */
import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { closeDb, getDb } from "../db";
import { eventTags, events } from "../db/schema";
import { parsedEventSchema } from "../schemas/parsed-event";
import { isEventStale, upsertEvents } from "./sync";

const db = getDb();

afterAll(async () => {
  // Closes the cached client and resets the singleton, so a later test file
  // that needs the database opens a fresh connection.
  await closeDb();
});

beforeEach(async () => {
  await db.execute(sql`TRUNCATE TABLE event_tags, events, communities, job_postings, sources CASCADE`);
});

/** Build a schema-valid ParsedEvent from overrides. */
function makeParsedEvent(overrides: Partial<Parameters<typeof parsedEventSchema.parse>[0]> = {}) {
  return parsedEventSchema.parse({
    sourceSlug: "curated",
    externalId: "ext-1",
    canonicalUrl: "https://example.org/e/1",
    title: "Original Title",
    startsAt: new Date("2026-12-01T19:00:00-05:00"),
    endsAt: new Date("2026-12-01T21:00:00-05:00"),
    venue: "Original Venue",
    neighborhood: "astoria",
    borough: "queens",
    priceType: "free",
    tags: ["interest:community"],
    ...overrides,
  });
}

describe("isEventStale", () => {
  const now = new Date("2026-10-30T15:00:00Z");

  it("is stale once expiresAt passes", () => {
    expect(
      isEventStale(
        {
          startsAt: new Date("2026-12-01T19:00:00Z"),
          endsAt: null,
          expiresAt: new Date("2026-10-30T14:59:59Z"),
        },
        now,
      ),
    ).toBe(true);
  });

  it("is stale once the event has ended", () => {
    expect(
      isEventStale(
        {
          startsAt: new Date("2026-10-30T10:00:00Z"),
          endsAt: new Date("2026-10-30T11:00:00Z"),
          expiresAt: null,
        },
        now,
      ),
    ).toBe(true);
  });

  it("treats a null endsAt as ending at startsAt", () => {
    expect(
      isEventStale(
        {
          startsAt: new Date("2026-10-30T14:00:00Z"),
          endsAt: null,
          expiresAt: null,
        },
        now,
      ),
    ).toBe(true);
  });

  it("is not stale while running or upcoming", () => {
    expect(
      isEventStale(
        {
          startsAt: new Date("2026-10-30T14:00:00Z"),
          endsAt: new Date("2026-10-30T17:00:00Z"),
          expiresAt: null,
        },
        now,
      ),
    ).toBe(false);
    expect(
      isEventStale(
        {
          startsAt: new Date("2026-12-01T19:00:00Z"),
          endsAt: null,
          expiresAt: new Date("2026-12-05T00:00:00Z"),
        },
        now,
      ),
    ).toBe(false);
  });
});

describe("upsertEvents", () => {
  it("inserts once and updates in place on re-run — never duplicates", async () => {
    const event = makeParsedEvent();
    await upsertEvents(db, "curated", "manual", [event]);
    await upsertEvents(db, "curated", "manual", [event]);
    const rows = await db.select().from(events);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.externalId).toBe("ext-1");
  });

  it("refreshes mutable fields from the latest payload", async () => {
    await upsertEvents(db, "curated", "manual", [makeParsedEvent()]);
    await upsertEvents(db, "curated", "manual", [
      makeParsedEvent({ title: "Updated Title", venue: "New Venue" }),
    ]);
    const [row] = await db.select().from(events);
    expect(row?.title).toBe("Updated Title");
    expect(row?.venue).toBe("New Venue");
  });

  it("collapses duplicate external ids inside one batch", async () => {
    await upsertEvents(db, "curated", "manual", [
      makeParsedEvent(),
      makeParsedEvent({ title: "Second Definition" }),
    ]);
    const rows = await db.select().from(events);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe("Second Definition"); // last one wins
  });

  it("keeps distinct external ids apart", async () => {
    await upsertEvents(db, "curated", "manual", [
      makeParsedEvent(),
      makeParsedEvent({ externalId: "ext-2", title: "Other Event" }),
    ]);
    expect((await db.select().from(events)).map((r) => r.externalId).sort()).toEqual([
      "ext-1",
      "ext-2",
    ]);
  });

  it("replaces tags wholesale so re-runs reflect the latest payload", async () => {
    await upsertEvents(db, "curated", "manual", [
      makeParsedEvent({ tags: ["interest:community", "persona:newcomers"] }),
    ]);
    await upsertEvents(db, "curated", "manual", [makeParsedEvent({ tags: ["interest:community"] })]);
    const tags = (await db.select().from(eventTags)).map((t) => t.tag).sort();
    expect(tags).toEqual(["interest:community"]);
  });
});
