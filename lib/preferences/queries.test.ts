/**
 * Saved-filter preference tests — isolated in a throwaway Postgres database
 * (see lib/db/test-db), mirroring lib/saves/queries.test.ts. Covers the
 * binding acceptance points: Zod rejection on write, Zod rejection on read
 * (corrupted row degrades to defaults, never a 500), and the one-row-per-user
 * upsert.
 */
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createIsolatedTestDb, type IsolatedTestDb } from "@/lib/db/test-db";
import { userFilterPreferences, users } from "@/lib/db/schema";
import { resolveDatabaseUrl } from "@/lib/db/url";
import type { EventFilter } from "@/lib/schemas/event-filters";
import { clearFilterPreferences, getFilterPreferences, saveFilterPreferences } from "./queries";

const TEST_DB = "nyc_prefs_test";

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
  await db.execute(`TRUNCATE user_filter_preferences, users CASCADE`);
  await db.insert(users).values({ id: "u1", name: "Test User" });
});

const VALID: EventFilter = { interests: ["music"], personas: [], day: "today", free: true };

describe("saveFilterPreferences", () => {
  it("rejects a malformed filter set on write — no row lands", async () => {
    const malformed = { interests: "not-an-array" } as unknown as EventFilter;

    await expect(saveFilterPreferences(db, "u1", malformed)).rejects.toThrow();
    const rows = await db
      .select()
      .from(userFilterPreferences)
      .where(eq(userFilterPreferences.userId, "u1"));
    expect(rows).toHaveLength(0);
  });

  it("upserts — re-saving keeps exactly one row per user with the latest set", async () => {
    await saveFilterPreferences(db, "u1", VALID);
    await saveFilterPreferences(db, "u1", {
      interests: ["outdoors"],
      personas: [],
      day: "weekend",
    });

    const rows = await db
      .select()
      .from(userFilterPreferences)
      .where(eq(userFilterPreferences.userId, "u1"));
    expect(rows).toHaveLength(1);
    expect(JSON.parse(rows[0].filters)).toMatchObject({
      interests: ["outdoors"],
      day: "weekend",
    });
  });

  it("round-trips a saved set through serialize → parse", async () => {
    await saveFilterPreferences(db, "u1", VALID);
    expect(await getFilterPreferences(db, "u1")).toMatchObject({
      interests: ["music"],
      day: "today",
      free: true,
    });
  });
});

describe("getFilterPreferences", () => {
  it("returns null when no row exists", async () => {
    expect(await getFilterPreferences(db, "u1")).toBeNull();
  });

  it("degrades a corrupted (non-JSON) row to null instead of throwing", async () => {
    await db.insert(userFilterPreferences).values({ userId: "u1", filters: "{not valid json" });

    expect(await getFilterPreferences(db, "u1")).toBeNull();
  });

  it("degrades a shape-violating row to null instead of throwing", async () => {
    await db
      .insert(userFilterPreferences)
      .values({ userId: "u1", filters: JSON.stringify({ interests: 42, free: "yes" }) });

    expect(await getFilterPreferences(db, "u1")).toBeNull();
  });
});

describe("clearFilterPreferences", () => {
  it("deletes the row and reports whether one existed", async () => {
    await saveFilterPreferences(db, "u1", VALID);

    expect(await clearFilterPreferences(db, "u1")).toBe(true);
    expect(await clearFilterPreferences(db, "u1")).toBe(false);
    expect(await getFilterPreferences(db, "u1")).toBeNull();
  });
});
