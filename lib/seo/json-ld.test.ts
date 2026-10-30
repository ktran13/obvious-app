import { describe, expect, it } from "vitest";

import { buildEventJsonLd, displayPriceCents } from "./json-ld";

const START = new Date("2026-11-05T18:30:00-05:00");
const END = new Date("2026-11-05T20:30:00-05:00");

function baseInput(overrides: Partial<Parameters<typeof buildEventJsonLd>[0]> = {}) {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    title: "Indie Web Makers Meetup",
    description: "Show-and-tell for independent makers.",
    startsAt: START,
    endsAt: null,
    venue: "Bushman Studios",
    neighborhood: "Bushwick",
    borough: "brooklyn",
    priceType: "free" as const,
    priceMin: null,
    canonicalUrl: "https://lu.ma/indie-makers-nyc",
    detailUrl: "http://localhost:3000/events/11111111-1111-1111-1111-111111111111",
    ...overrides,
  };
}

describe("displayPriceCents", () => {
  it("prices free events at zero", () => {
    expect(displayPriceCents({ priceType: "free", priceMin: null })).toBe(0);
  });

  it("uses the from-price for paid events", () => {
    expect(displayPriceCents({ priceType: "paid", priceMin: 2500 })).toBe(2500);
  });

  it("never asserts a price for unknown pricing", () => {
    expect(displayPriceCents({ priceType: "unknown", priceMin: null })).toBeNull();
  });
});

describe("buildEventJsonLd", () => {
  it("carries name, startDate, and the detail-page url", () => {
    const node = buildEventJsonLd(baseInput());
    expect(node["@type"]).toBe("Event");
    expect(node.name).toBe("Indie Web Makers Meetup");
    expect(node.startDate).toBe(START.toISOString());
    expect(node.url).toBe("http://localhost:3000/events/11111111-1111-1111-1111-111111111111");
  });

  it("renders a zero-price Offer for free events", () => {
    const node = buildEventJsonLd(baseInput());
    expect(node.offers).toMatchObject({
      "@type": "Offer",
      price: "0.00",
      priceCurrency: "USD",
      isAccessibleForFree: true,
      url: "https://lu.ma/indie-makers-nyc",
    });
  });

  it("renders a paid Offer from the from-price in dollars", () => {
    const node = buildEventJsonLd(baseInput({ priceType: "paid", priceMin: 2500 }));
    expect(node.offers).toMatchObject({ price: "25.00" });
    expect(node.offers).not.toHaveProperty("isAccessibleForFree");
  });

  it("omits the Offer entirely when pricing is unknown", () => {
    const node = buildEventJsonLd(baseInput({ priceType: "unknown", priceMin: null }));
    expect(node.offers).toBeUndefined();
  });

  it("names the Place from the venue and composes the address", () => {
    const node = buildEventJsonLd(baseInput());
    expect(node.location).toEqual({
      "@type": "Place",
      name: "Bushman Studios",
      address: "Bushwick, brooklyn",
    });
  });

  it("includes endDate and description when present", () => {
    const node = buildEventJsonLd(baseInput({ endsAt: END }));
    expect(node.endDate).toBe(END.toISOString());
    expect(node.description).toBe("Show-and-tell for independent makers.");
  });

  it("keeps optional fields out when absent", () => {
    const node = buildEventJsonLd(
      baseInput({ description: null, endsAt: null, venue: null, neighborhood: null, borough: null }),
    );
    expect(node.location).toBeUndefined();
    expect(node.description).toBeUndefined();
    expect(node.endDate).toBeUndefined();
  });
});
