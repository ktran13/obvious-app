/**
 * Luma iCal adapter tests — run against committed RFC 5545 fixtures.
 * No network: fetch is stubbed, fixtures are real iCal text files.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { ingestSource } from "../validate";
import { LumaIcalAdapter } from "./luma-ical";
import { parseICalDateTime, parseICalProperty, splitVEvents, unfoldLines } from "./ical-text";

const FIXTURES = path.resolve(__dirname, "../fixtures");
const sample = () => readFileSync(path.join(FIXTURES, "luma-sample.ics"), "utf8");
const malformed = () => readFileSync(path.join(FIXTURES, "luma-malformed.ics"), "utf8");

describe("ical-text primitives", () => {
  it("unfolds continuation lines (RFC 5545 §3.1)", () => {
    // Exactly one leading whitespace char is removed from the continuation.
    expect(unfoldLines("SUMMARY:a\r\n  b\r\nX:c")).toEqual(["SUMMARY:a b", "X:c"]);
    expect(unfoldLines("SUMMARY:a\n\tb\nc")).toEqual(["SUMMARY:ab", "c"]);
  });

  it("splits name/params/value without breaking quoted colons", () => {
    const prop = parseICalProperty('ORGANIZER;CN="Meetup: Queens Edition":https://x.test/a:b');
    expect(prop).toEqual({
      name: "ORGANIZER",
      params: { CN: "Meetup: Queens Edition" },
      value: "https://x.test/a:b",
    });
    expect(parseICalProperty("no-colon-line")).toBeNull();
  });

  it("parses UTC, TZID, floating, and date-only datetimes", () => {
    const utc = parseICalDateTime("20261201T223000Z")!;
    expect(utc.date.toISOString()).toBe("2026-12-01T22:30:00.000Z");
    expect(utc.isAllDay).toBe(false);

    // Winter: EST is UTC-5.
    const est = parseICalDateTime("20261112T183000", { TZID: "America/New_York" })!;
    expect(est.date.toISOString()).toBe("2026-11-12T23:30:00.000Z");

    // Summer: EDT is UTC-4 — the same wall clock maps 5h later.
    const edt = parseICalDateTime("20260715T190000", { TZID: "America/New_York" })!;
    expect(edt.date.toISOString()).toBe("2026-07-15T23:00:00.000Z");

    // Floating (no TZID, no Z) is interpreted in the product timezone.
    const floating = parseICalDateTime("20261112T183000")!;
    expect(floating.date.toISOString()).toBe(est.date.toISOString());

    // VALUE=DATE — midnight in the event's zone.
    const allDay = parseICalDateTime("20261121", { VALUE: "DATE", TZID: "America/New_York" })!;
    expect(allDay.date.toISOString()).toBe("2026-11-21T05:00:00.000Z");
    expect(allDay.isAllDay).toBe(true);

    expect(parseICalDateTime("not-a-date")).toBeNull();
  });
});

describe("Luma iCal adapter — sample fixture", () => {
  it("splits the feed into VEVENT blocks", () => {
    expect(splitVEvents(sample())).toHaveLength(5);
  });

  it("maps a TZID event with escaping and folding to a ParsedEventInput", () => {
    const adapter = new LumaIcalAdapter();
    const block = splitVEvents(sample())[0];
    const candidate = adapter.normalize(block);

    expect(candidate.sourceSlug).toBe("luma-nyc");
    expect(candidate.externalId).toBe("evt_9Xk2mPq4RtS7vBnA@lu.ma");
    expect(candidate.title).toBe("Brooklyn Tech Guild — November Showcase");
    expect(candidate.canonicalUrl).toBe("https://lu.ma/9Xk2mPq4RtS7vBnA");
    expect(candidate.description).toBe(
      "Demos from five member teams, followed by open, structured networking. Light refreshments provided.",
    );
    expect(candidate.venue).toBe("Industry City, 68 34th St, Brooklyn");
    expect(candidate.priceType).toBe("unknown");
  });

  it("maps all-day events with exclusive DTEND", () => {
    const block = splitVEvents(sample())[3];
    const candidate = new LumaIcalAdapter().normalize(block);
    expect(candidate.startsAt).toEqual(new Date("2026-11-21T05:00:00.000Z"));
    expect(candidate.endsAt).toEqual(new Date("2026-11-22T05:00:00.000Z"));
  });

  it("derives the canonical URL from a lu.ma UID when URL is absent", () => {
    const block = splitVEvents(sample())[4];
    const candidate = new LumaIcalAdapter().normalize(block);
    expect(candidate.canonicalUrl).toBe("https://lu.ma/Pq6tWzYxKbN2rVjD");
    // The quoted-colon param text survived mapping.
    expect(candidate.description).toContain('CN="Meetup: Queens Edition"');
  });

  it("accepts every event in the sample through the Zod gate", async () => {
    const fetchImpl = vi.fn(async () => new Response(sample(), { status: 200 }));
    const result = await ingestSource(new LumaIcalAdapter({ calendarUrl: "https://calendar.test/ics", fetchImpl }));
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(result.rejected).toEqual([]);
    expect(result.accepted).toHaveLength(5);
    expect(result.accepted.every((e) => e.sourceSlug === "luma-nyc")).toBe(true);
  });
});

describe("Luma iCal adapter — malformed fixture", () => {
  it("rejects exactly the five broken events with specific issues", async () => {
    const fetchImpl = vi.fn(async () => new Response(malformed(), { status: 200 }));
    const result = await ingestSource(new LumaIcalAdapter({ calendarUrl: "https://calendar.test/ics", fetchImpl }));

    expect(result.fetched).toBe(5);
    expect(result.accepted).toHaveLength(0);
    expect(result.rejected).toHaveLength(5);

    const issueText = result.rejected.map((r) => r.issues.join("; ")).join("\n");
    expect(issueText).toMatch(/externalId/);
    expect(issueText).toMatch(/startsAt/);
    expect(issueText).toMatch(/title/);
    expect(issueText).toMatch(/canonicalUrl/);
    expect(issueText).toMatch(/endsAt must not be before startsAt/);
  });
});

describe("Luma iCal adapter — transport", () => {
  it("throws a clear error on HTTP failure", async () => {
    const adapter = new LumaIcalAdapter({
      calendarUrl: "https://calendar.test/ics",
      fetchImpl: vi.fn(async () => new Response("nope", { status: 500 })),
    });
    await expect(adapter.fetchRaw()).rejects.toThrow("HTTP 500");
  });

  it("requires a calendar URL", async () => {
    const previous = process.env["LUMA_CALENDAR_URL"];
    delete process.env["LUMA_CALENDAR_URL"];
    try {
      await expect(new LumaIcalAdapter().fetchRaw()).rejects.toThrow(/calendarUrl/);
    } finally {
      if (previous !== undefined) process.env["LUMA_CALENDAR_URL"] = previous;
    }
  });
});
