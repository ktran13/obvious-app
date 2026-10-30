/**
 * Validation gate tests — the boundary adapters must pass before insert.
 */
import { describe, expect, it, vi } from "vitest";

import { ingestSource, validateParsedEvents } from "./validate";
import type { SourceAdapter } from "./types";

const validCandidate = {
  sourceSlug: "curated",
  externalId: "x-1",
  canonicalUrl: "https://example.org/x-1",
  title: "Valid event",
  startsAt: new Date("2026-12-01T23:00:00.000Z"),
};

describe("validateParsedEvents", () => {
  it("accepts valid candidates and defaults tags/priceType", () => {
    const { accepted, rejected } = validateParsedEvents("curated", [validCandidate]);
    expect(rejected).toEqual([]);
    expect(accepted).toHaveLength(1);
    expect(accepted[0].tags).toEqual([]);
    expect(accepted[0].priceType).toBe("unknown");
  });

  it("rejects malformed items without throwing and logs each one", () => {
    const logger = { warn: vi.fn(), error: vi.fn() };
    const { accepted, rejected } = validateParsedEvents(
      "curated",
      [
        validCandidate,
        { ...validCandidate, externalId: "" }, // empty externalId
        { ...validCandidate, canonicalUrl: "not-a-url" },
        { ...validCandidate, title: "x", endsAt: new Date("2020-01-01T00:00:00Z") }, // ends before starts
        { ...validCandidate, tags: ["bogus:tech"] }, // bad tag prefix... "bogus" has no colon-group match
      ],
      logger,
    );

    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(4);
    expect(rejected.map((r) => r.index)).toEqual([1, 2, 3, 4]);
    expect(logger.warn).toHaveBeenCalledTimes(4);
    const issuesFor = (i: number) => rejected.find((r) => r.index === i)!.issues.join("; ");
    expect(issuesFor(2)).toMatch(/canonicalUrl/);
    expect(issuesFor(4)).toMatch(/tags/);
  });

  it("never lets a rejected item become a ParsedEvent", () => {
    const { accepted, rejected } = validateParsedEvents("curated", [
      null,
      {},
      {
        sourceSlug: "curated",
        externalId: "e",
        canonicalUrl: "https://example.org/e",
        title: "t",
        startsAt: "garbage",
      },
    ]);
    expect(accepted).toHaveLength(0);
    expect(rejected).toHaveLength(3);
  });
});

describe("ingestSource — disabled adapter", () => {
  it("skips fetchRaw entirely (no I/O) and returns a skipped result", async () => {
    let fetchCalled = 0;
    const adapter: SourceAdapter<number> = {
      sourceSlug: "meetup",
      isEnabled: () => false,
      fetchRaw: async () => {
        fetchCalled++;
        throw new Error("must not be called");
      },
      normalize: (raw) => ({ ...validCandidate, externalId: String(raw) }),
    };

    const result = await ingestSource(adapter);
    expect(fetchCalled).toBe(0);
    expect(result.skipped).toBe(true);
    expect(result.fetched).toBe(0);
    expect(result.accepted).toEqual([]);
  });
});
