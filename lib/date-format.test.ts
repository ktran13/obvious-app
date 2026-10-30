import { describe, expect, it } from "vitest";

import { dayKey, formatDayHeading, formatEventTime } from "./date-format";

describe("dayKey", () => {
  it("returns the America/New_York calendar day, not the UTC date", () => {
    // 2026-11-01T03:30Z is Oct 31 evening in NYC (EDT, UTC-4).
    expect(dayKey("2026-11-01T03:30:00.000Z")).toBe("2026-10-31");
  });

  it("groups a normal instant by its NYC day", () => {
    expect(dayKey("2026-11-07T14:00:00.000Z")).toBe("2026-11-07");
  });

  it("survives the DST fallback hour", () => {
    // Nov 1, 2026: 2:00 am EDT -> 1:00 am EST. Both instants stay on Nov 1.
    expect(dayKey("2026-11-01T05:30:00.000Z")).toBe("2026-11-01");
    expect(dayKey("2026-11-01T06:30:00.000Z")).toBe("2026-11-01");
  });

  it("honors a supplied timezone", () => {
    expect(dayKey("2026-11-07T02:30:00.000Z", "Asia/Tokyo")).toBe("2026-11-07");
  });
});

describe("formatDayHeading", () => {
  it("formats the NYC weekday and date", () => {
    expect(formatDayHeading("2026-11-07T14:00:00.000Z")).toBe("Saturday, Nov 7");
  });

  it("formats the late-evening instants that belong to the prior NYC day", () => {
    expect(formatDayHeading("2026-11-07T00:00:00.000Z")).toBe("Friday, Nov 6");
  });
});

describe("formatEventTime", () => {
  it("formats wall-clock time in New York", () => {
    expect(formatEventTime("2026-11-07T00:00:00.000Z")).toBe("7:00 PM");
  });

  it("formats in a supplied timezone", () => {
    expect(formatEventTime("2026-11-07T14:00:00.000Z", "America/Chicago")).toBe("8:00 AM");
  });

  it("formats single-digit minutes without a leading zero", () => {
    expect(formatEventTime("2026-11-07T14:05:00.000Z")).toBe("9:05 AM");
  });
});
