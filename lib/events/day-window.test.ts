/**
 * Day-window tests use fixed instants around the Nov 1, 2026 DST fallback:
 * Fri Oct 30 is EDT (UTC-4); from Nov 2 midnight NY is EST (UTC-5). Window
 * boundaries in the assertions below are written as UTC instants.
 */
import { describe, expect, it } from "vitest";

import { dayKey } from "@/lib/date-format";

import {
  dayKeyAdd,
  dayKeyWindow,
  isoWeekdayOfDayKey,
  nextWeekdayDayKey,
  resolveDayWindow,
  resolveWhenWindow,
  weekendWindow,
} from "./day-window";

// Fri Oct 30, 2026, 11:00am EDT.
const FRI_NOON = new Date("2026-10-30T15:00:00Z");
// Sat Oct 31, 2026, 11:00am EDT.
const SAT_NOON = new Date("2026-10-31T15:00:00Z");
// Sun Nov 1, 2026, 11:00am EDT.
const SUN_NOON = new Date("2026-11-01T15:00:00Z");

describe("dayKey attribution (late-night events)", () => {
  it("attributes a 1am Saturday event to Saturday, not Friday night", () => {
    expect(dayKey("2026-10-31T01:00:00-04:00")).toBe("2026-10-31");
  });

  it("attributes an 8pm Saturday event to Saturday even though its UTC instant is Sunday", () => {
    // 8pm EDT Saturday = 00:00Z Sunday — a UTC-day grouping would call it Sunday.
    expect(dayKey("2026-10-31T20:00:00-04:00")).toBe("2026-10-31");
  });

  it("attributes an 11pm Saturday event (EST) to Saturday against a Sunday UTC date", () => {
    expect(dayKey("2026-11-07T23:00:00-05:00")).toBe("2026-11-07");
  });

  it("attributes a 1am Sunday event to Sunday", () => {
    expect(dayKey("2026-11-08T01:00:00-05:00")).toBe("2026-11-08");
  });
});

describe("dayKeyAdd", () => {
  it("shifts within a month", () => {
    expect(dayKeyAdd("2026-10-30", 1)).toBe("2026-10-31");
  });

  it("shifts across month and year boundaries", () => {
    expect(dayKeyAdd("2026-10-31", 1)).toBe("2026-11-01");
    expect(dayKeyAdd("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("isoWeekdayOfDayKey / nextWeekdayDayKey", () => {
  it("maps 2026-10-30 (Friday) to 5", () => {
    expect(isoWeekdayOfDayKey("2026-10-30")).toBe(5);
  });

  it("weekday resolves to the next occurrence, today inclusive", () => {
    expect(nextWeekdayDayKey(FRI_NOON, "saturday")).toBe("2026-10-31");
    expect(nextWeekdayDayKey(FRI_NOON, "monday")).toBe("2026-11-02");
    expect(nextWeekdayDayKey(FRI_NOON, "friday")).toBe("2026-10-30"); // today counts
    expect(nextWeekdayDayKey(SAT_NOON, "saturday")).toBe("2026-10-31");
    expect(nextWeekdayDayKey(SUN_NOON, "saturday")).toBe("2026-11-07"); // wrap to next week
  });
});

describe("dayKeyWindow", () => {
  it("is a half-open window of NY midnight to NY midnight", () => {
    expect(dayKeyWindow("2026-10-30")).toEqual({
      start: new Date("2026-10-30T04:00:00Z"), // EDT midnight
      end: new Date("2026-10-31T04:00:00Z"),
    });
  });

  it("respects the DST fallback on the Nov 1 → 2 boundary", () => {
    expect(dayKeyWindow("2026-11-01").end).toEqual(new Date("2026-11-02T05:00:00Z")); // EST midnight
  });
});

describe("weekendWindow", () => {
  it("from a weekday spans the coming Sat+Sun across the DST change", () => {
    expect(weekendWindow(FRI_NOON)).toEqual({
      start: new Date("2026-10-31T04:00:00Z"), // Sat midnight EDT
      end: new Date("2026-11-02T05:00:00Z"), // Mon midnight EST
    });
  });

  it("from Saturday starts today and ends Monday midnight", () => {
    expect(weekendWindow(SAT_NOON)).toEqual({
      start: new Date("2026-10-31T04:00:00Z"),
      end: new Date("2026-11-02T05:00:00Z"),
    });
  });

  it("from Sunday covers only the rest of today", () => {
    expect(weekendWindow(SUN_NOON)).toEqual({
      start: new Date("2026-11-01T04:00:00Z"),
      end: new Date("2026-11-02T05:00:00Z"),
    });
  });
});

describe("resolveDayWindow — every ?day= variant", () => {
  it("today covers the rest of today's NY calendar day", () => {
    expect(resolveDayWindow("today", FRI_NOON)).toEqual({
      start: new Date("2026-10-30T04:00:00Z"),
      end: new Date("2026-10-31T04:00:00Z"),
    });
  });

  it("tomorrow covers tomorrow's NY calendar day", () => {
    expect(resolveDayWindow("tomorrow", FRI_NOON)).toEqual({
      start: new Date("2026-10-31T04:00:00Z"),
      end: new Date("2026-11-01T04:00:00Z"),
    });
  });

  it("weekend preset matches weekendWindow", () => {
    expect(resolveDayWindow("weekend", FRI_NOON)).toEqual(weekendWindow(FRI_NOON));
  });

  it("weekday name resolves to the next occurrence", () => {
    const window = resolveDayWindow("saturday", FRI_NOON);
    expect(window).toEqual(dayKeyWindow("2026-10-31"));
    expect(resolveDayWindow("tuesday", FRI_NOON)).toEqual(dayKeyWindow("2026-11-03"));
  });

  it("ISO date resolves to that exact calendar day", () => {
    expect(resolveDayWindow("2026-11-07", FRI_NOON)).toEqual({
      start: new Date("2026-11-07T05:00:00Z"), // EST midnight
      end: new Date("2026-11-08T05:00:00Z"),
    });
  });
});

describe("resolveWhenWindow", () => {
  it("week spans today through the next six NY days", () => {
    expect(resolveWhenWindow("week", FRI_NOON)).toEqual({
      start: new Date("2026-10-30T04:00:00Z"),
      end: new Date("2026-11-06T05:00:00Z"),
    });
  });

  it("today/tomorrow/weekend mirror the day presets", () => {
    expect(resolveWhenWindow("today", FRI_NOON)).toEqual(resolveDayWindow("today", FRI_NOON));
    expect(resolveWhenWindow("tomorrow", FRI_NOON)).toEqual(resolveDayWindow("tomorrow", FRI_NOON));
    expect(resolveWhenWindow("weekend", FRI_NOON)).toEqual(resolveDayWindow("weekend", FRI_NOON));
  });
});
