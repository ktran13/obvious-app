import { describe, expect, it } from "vitest";

import {
  dayFilterSchema,
  eventFilterSchema,
  isoDateSchema,
  parseStoredEventFilters,
  serializeEventFilters,
} from "./event-filters";

describe("dayFilterSchema", () => {
  it.each(["today", "tomorrow", "weekend"])("accepts the %q preset", (preset) => {
    expect(dayFilterSchema.parse(preset)).toBe(preset);
  });

  it.each(["friday", "monday", "sunday"])("accepts the weekday %q", (weekday) => {
    expect(dayFilterSchema.parse(weekday)).toBe(weekday);
  });

  it("accepts an ISO date", () => {
    expect(isoDateSchema.parse("2026-11-07")).toBe("2026-11-07");
  });

  it("rejects non-ISO date strings", () => {
    expect(dayFilterSchema.safeParse("11/07/2026").success).toBe(false);
    expect(dayFilterSchema.safeParse("2026-13-40").success).toBe(false);
  });

  it("rejects unknown values", () => {
    expect(dayFilterSchema.safeParse("someday").success).toBe(false);
  });
});

describe("eventFilterSchema", () => {
  it("defaults interest and persona lists to empty", () => {
    expect(eventFilterSchema.parse({})).toEqual({ interests: [], personas: [] });
  });

  it("round-trips a full filter set", () => {
    const filters = {
      interests: ["tech", "outdoors"],
      personas: ["kids"],
      neighborhood: "bushwick",
      borough: "brooklyn",
      day: "friday",
      when: "weekend",
      free: true,
    } as const;
    expect(eventFilterSchema.parse(filters)).toEqual(filters);
  });

  it("rejects unknown filter keys (strict object)", () => {
    expect(eventFilterSchema.safeParse({ gender: "female" }).success).toBe(false);
  });

  it("rejects non-boolean free", () => {
    expect(eventFilterSchema.safeParse({ free: "true" }).success).toBe(false);
  });
});

describe("parseStoredEventFilters", () => {
  it("parses a valid stored snapshot", () => {
    const parsed = parseStoredEventFilters('{"interests":["tech"],"free":true,"day":"2026-11-07"}');
    expect(parsed).toEqual({ interests: ["tech"], personas: [], free: true, day: "2026-11-07" });
  });

  it("rejects malformed JSON", () => {
    expect(() => parseStoredEventFilters('{"interests": [')).toThrowError(/not valid JSON/);
  });

  it("rejects JSON that is not an object", () => {
    expect(() => parseStoredEventFilters('["tech"]')).toThrowError();
    expect(() => parseStoredEventFilters("42")).toThrowError();
  });

  it("rejects JSON with wrong shapes", () => {
    expect(() => parseStoredEventFilters('{"free":"yes"}')).toThrowError();
    expect(() => parseStoredEventFilters('{"day":"funday"}')).toThrowError();
  });
});

describe("serializeEventFilters", () => {
  it("produces JSON that parses back to the same filters", () => {
    const filters = eventFilterSchema.parse({ interests: ["music"], day: "weekend" });
    const json = serializeEventFilters(filters);
    expect(parseStoredEventFilters(json)).toEqual(filters);
  });
});
