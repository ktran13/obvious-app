import { describe, expect, it } from "vitest";

import { formatPostedDate } from "./display";

describe("formatPostedDate", () => {
  it("formats an ISO instant as a New York date label", () => {
    // 2026-11-06T22:00:00Z is Nov 6 in New York (EST).
    expect(formatPostedDate("2026-11-06T22:00:00.000Z")).toBe("Nov 6, 2026");
  });

  it("accepts Date objects and honors the timezone", () => {
    const instant = new Date("2026-11-07T02:30:00.000Z");
    expect(formatPostedDate(instant)).toBe("Nov 6, 2026");
    expect(formatPostedDate(instant, "UTC")).toBe("Nov 7, 2026");
  });
});
