import { describe, expect, it } from "vitest";

import { parsedEventSchema } from "./parsed-event";

const baseEvent = {
  sourceSlug: "luma-nyc",
  externalId: "evt_abc123",
  canonicalUrl: "https://lu.ma/abc123",
  title: "Brooklyn Tech Meetup",
  startsAt: "2026-11-05T18:30:00-05:00",
  tags: ["interest:tech", "persona:career-early"],
} as const;

describe("parsedEventSchema", () => {
  it("accepts a fully populated event", () => {
    const parsed = parsedEventSchema.parse({
      ...baseEvent,
      description: "Monthly talks and networking.",
      endsAt: "2026-11-05T21:00:00-05:00",
      venue: "Industry City",
      neighborhood: "sunset-park",
      borough: "brooklyn",
      priceType: "paid",
      priceMin: 1500,
      priceMax: 2500,
      affiliateUrl: "https://aff.example.com/abc123",
      expiresAt: "2026-11-06T00:00:00-05:00",
    });
    expect(parsed.startsAt).toBeInstanceOf(Date);
    expect(parsed.priceType).toBe("paid");
    expect(parsed.tags).toHaveLength(2);
  });

  it("defaults priceType to unknown and tags to empty", () => {
    const parsed = parsedEventSchema.parse({ ...baseEvent, tags: undefined });
    expect(parsed.priceType).toBe("unknown");
    expect(parsed.tags).toEqual([]);
  });

  it("rejects a non-URL canonical link", () => {
    expect(parsedEventSchema.safeParse({ ...baseEvent, canonicalUrl: "not-a-url" }).success).toBe(
      false,
    );
  });

  it("rejects endsAt before startsAt", () => {
    expect(
      parsedEventSchema.safeParse({
        ...baseEvent,
        endsAt: "2026-11-05T17:00:00-05:00",
      }).success,
    ).toBe(false);
  });

  it("rejects unprefixed tags", () => {
    expect(parsedEventSchema.safeParse({ ...baseEvent, tags: ["tech"] }).success).toBe(false);
  });
});
