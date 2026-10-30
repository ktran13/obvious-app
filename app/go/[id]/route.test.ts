import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { describe, expect, it, vi } from "vitest";

import { GET } from "./route";
import { getDb } from "@/lib/db";

// vi.mock is hoisted above imports by vitest, so this runs before ./route loads.
vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));

const AFFILIATE_EVENT = {
  affiliateUrl: "https://partner.example.com/event?aff=us",
  canonicalUrl: "https://luma.example.com/event",
};

const CANONICAL_EVENT = {
  affiliateUrl: null,
  canonicalUrl: "https://luma.example.com/event",
};

const KNOWN_ID = "11111111-1111-4111-8111-111111111111";

function stubDb(rows: unknown[]): PostgresJsDatabase<Record<string, never>> {
  // Only the select().from().where().limit() chain the route uses.
  const chain = {
    select: () => chain,
    from: () => chain,
    where: () => chain,
    limit: () => Promise.resolve(rows),
  };
  return chain as unknown as PostgresJsDatabase<Record<string, never>>;
}

async function get(id: string) {
  return GET(new Request(`https://app.test/go/${id}`), {
    params: Promise.resolve({ id }),
  });
}

describe("GET /go/[id]", () => {
  it("302-redirects to the affiliate URL when one exists", async () => {
    vi.mocked(getDb).mockReturnValue(stubDb([AFFILIATE_EVENT]));

    const response = await get(KNOWN_ID);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://partner.example.com/event?aff=us",
    );
  });

  it("302-redirects to the canonical URL when there is no affiliate URL", async () => {
    vi.mocked(getDb).mockReturnValue(stubDb([CANONICAL_EVENT]));

    const response = await get(KNOWN_ID);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://luma.example.com/event",
    );
  });

  it("returns 404 for an unknown event id", async () => {
    vi.mocked(getDb).mockReturnValue(stubDb([]));

    const response = await get("22222222-2222-4222-8222-222222222222");

    expect(response.status).toBe(404);
  });

  it("returns 404 for a non-UUID id without touching the database", async () => {
    const db = stubDb([AFFILIATE_EVENT]);
    const select = vi.spyOn(db, "select");

    vi.mocked(getDb).mockReturnValue(db);
    const response = await get("not-a-uuid");

    expect(response.status).toBe(404);
    expect(select).not.toHaveBeenCalled();
  });
});
