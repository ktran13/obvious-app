import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { describe, expect, it, vi } from "vitest";

import { GET } from "./route";
import { getDb } from "@/lib/db";

// vi.mock is hoisted above imports by vitest, so this runs before ./route loads.
vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));

function stubDb(execute: () => Promise<unknown>): PostgresJsDatabase<Record<string, never>> {
  return { execute } as unknown as PostgresJsDatabase<Record<string, never>>;
}

describe("GET /api/health", () => {
  it("returns 200 { status: 'ok', db: true } when the DB responds", async () => {
    vi.mocked(getDb).mockReturnValue(stubDb(() => Promise.resolve([])));

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", db: true });
  });

  it("returns 503 when the DB check fails", async () => {
    vi.mocked(getDb).mockReturnValue(stubDb(() => Promise.reject(new Error("db down"))));

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "error", db: false });
  });
});
