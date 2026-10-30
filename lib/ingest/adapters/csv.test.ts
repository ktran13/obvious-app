/**
 * Manual CSV adapter tests — run against committed fixtures. Disk reads only.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ingestSource } from "../validate";
import { ManualCsvAdapter, parseCsv, parseCsvRows } from "./csv";

const FIXTURES = path.resolve(__dirname, "../fixtures");
const sample = () => readFileSync(path.join(FIXTURES, "manual-events.csv"), "utf8");
const malformed = () => readFileSync(path.join(FIXTURES, "manual-events-malformed.csv"), "utf8");

describe("parseCsv (RFC 4180)", () => {
  it("handles quoted commas, escaped quotes, and CRLF", () => {
    const rows = parseCsv('a,"b,1","say ""hi"""\r\nc,"two\r\nlines",d');
    expect(rows).toEqual([
      ["a", "b,1", 'say "hi"'],
      ["c", "two\r\nlines", "d"],
    ]);
  });
});

describe("ManualCsvAdapter — sample fixture", () => {
  it("maps every column, including cents and semicolon tags", async () => {
    const adapter = new ManualCsvAdapter({ csvText: sample() });
    const rows = await adapter.fetchRaw();
    expect(rows).toHaveLength(4);

    const paid = adapter.normalize(rows[2]);
    expect(paid.title).toBe("Beginner Salsa Social (paid)");
    expect(paid.priceType).toBe("paid");
    expect(paid.priceMin).toBe(1500);
    expect(paid.priceMax).toBe(2500);
    expect(paid.neighborhood).toBe("midtown");
    expect(paid.tags).toEqual(["interest:arts", "persona:newcomers"]);

    const unknownPrice = adapter.normalize(rows[3]);
    expect(unknownPrice.priceType).toBe("unknown");
    expect(unknownPrice.endsAt).toBeUndefined();
    expect(unknownPrice.borough).toBe("queens");
  });

  it("reads naive local datetimes as America/New_York", () => {
    const csv = `external_id,title,canonical_url,starts_at\nnaive-1,Naive Time,https://example.org/naive,2026-12-05T18:30:00\n`;
    const adapter = new ManualCsvAdapter({ csvText: csv });
    const rows = parseCsvRows(csv).rows;
    const candidate = adapter.normalize(rows[0]);
    // 18:30 EST === 23:30Z
    expect(candidate.startsAt).toEqual(new Date("2026-12-05T23:30:00.000Z"));
  });

  it("accepts all four valid rows through the Zod gate", async () => {
    const result = await ingestSource(new ManualCsvAdapter({ csvText: sample() }));
    expect(result.rejected).toEqual([]);
    expect(result.accepted).toHaveLength(4);
    expect(result.accepted.every((e) => e.sourceSlug === "freenyc")).toBe(true);
    expect(result.accepted.every((e) => typeof e.startsAt === "object")).toBe(true);
  });
});

describe("ManualCsvAdapter — malformed fixture", () => {
  it("rejects each broken row and preserves its row position", async () => {
    const result = await ingestSource(new ManualCsvAdapter({ csvText: malformed() }));
    expect(result.fetched).toBe(5);
    expect(result.accepted).toHaveLength(0);
    expect(result.rejected).toHaveLength(5);
    expect(result.rejected.map((r) => r.index)).toEqual([0, 1, 2, 3, 4]);

    const issueText = result.rejected.map((r) => r.issues.join("; ")).join("\n");
    expect(issueText).toMatch(/canonicalUrl/);
    expect(issueText).toMatch(/startsAt/);
    expect(issueText).toMatch(/priceType/);
    expect(issueText).toMatch(/title/);
    expect(issueText).toMatch(/endsAt must not be before startsAt/);
  });

  it("throws on a header missing required columns", async () => {
    const adapter = new ManualCsvAdapter({ csvText: "title,starts_at\nA,2026-01-01T00:00:00Z" });
    await expect(adapter.fetchRaw()).rejects.toThrow(/missing required columns/);
  });
});
