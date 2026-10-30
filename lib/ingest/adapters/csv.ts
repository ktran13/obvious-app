/**
 * Manual CSV source adapter (default slug "freenyc").
 *
 * Editors drop a CSV with the documented header (see lib/ingest/README.md)
 * and the adapter maps rows → ParsedEventInput. Row-level problems (bad URL,
 * bad date, unknown price type, ends-before-starts) flow through the shared
 * Zod gate and come back as rejections with row numbers — the import never
 * half-applies a batch.
 *
 * Transport: reads from disk (csvPath) or a caller-provided string (csvText).
 * fetchRaw parses the header once and yields one raw item per data row.
 */
import { readFile } from "node:fs/promises";

import { parseIsoOrZoned, PRODUCT_TIMEZONE } from "../time";
import type { ParsedEventInput, SourceAdapter } from "../types";
import { priceTypeSchema } from "../../schemas/parsed-event";

export const DEFAULT_CSV_SOURCE_SLUG = "freenyc";

/** Documented CSV header — order-independent, all columns required except *_optional ones. */
export const CSV_COLUMNS = [
  "external_id",
  "title",
  "canonical_url",
  "description",
  "starts_at",
  "ends_at",
  "venue",
  "neighborhood",
  "borough",
  "price_type",
  "price_min_cents",
  "price_max_cents",
  "affiliate_url",
  "expires_at",
  "tags",
] as const;

export type CsvColumn = (typeof CSV_COLUMNS)[number];

export interface CsvRow {
  /** 1-based file line number where the row starts — for rejection logs. */
  lineNumber: number;
  fields: Partial<Record<CsvColumn, string>>;
}

/**
 * RFC 4180 CSV reader: double-quoted fields may contain commas, newlines,
 * and escaped quotes (""). Returns rows split into cells.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      pushField();
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    if (ch === "\n") {
      pushRow();
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field !== "" || row.length > 0) pushRow();
  return rows;
}

export interface ParsedCsv {
  header: string[];
  rows: CsvRow[];
}

/** Parse CSV text into a header and rows mapped to the documented columns. */
export function parseCsvRows(text: string): ParsedCsv {
  const table = parseCsv(text);
  const header = table.shift() ?? [];
  const headerLower = header.map((h) => h.trim().toLowerCase());
  const unknownColumns = headerLower.filter((h) => h && !CSV_COLUMNS.includes(h as CsvColumn));
  if (unknownColumns.length > 0) {
    throw new Error(`CSV header has unknown columns: ${unknownColumns.join(", ")}`);
  }
  const required: CsvColumn[] = ["external_id", "title", "canonical_url", "starts_at"];
  const missing = required.filter((col) => !headerLower.includes(col));
  if (missing.length > 0) {
    throw new Error(`CSV header is missing required columns: ${missing.join(", ")}`);
  }

  const rows: CsvRow[] = [];
  let lineNumber = 1;
  for (const cells of table) {
    lineNumber += 1;
    if (cells.every((c) => c.trim() === "")) continue; // skip blank lines
    const fields: Partial<Record<CsvColumn, string>> = {};
    headerLower.forEach((col, idx) => {
      if (col) fields[col as CsvColumn] = (cells[idx] ?? "").trim();
    });
    rows.push({ lineNumber, fields });
  }
  return { header: headerLower, rows };
}

function optionalNumber(fields: Partial<Record<CsvColumn, string>>, col: CsvColumn): number | undefined {
  const raw = fields[col];
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    // Let Zod produce the rejection message — surface the raw value.
    return Number.NaN;
  }
  return parsed;
}

function parsePriceType(raw: string | undefined): "free" | "paid" | "unknown" {
  if (!raw) return "unknown";
  const result = priceTypeSchema.safeParse(raw.toLowerCase());
  if (result.success) return result.data;
  // Unknown price_type values must be rejected downstream, not coerced.
  return raw as "free" | "paid" | "unknown";
}

function splitTags(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(";")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function dateOrNull(raw: string | undefined): Date | string | undefined {
  if (!raw) return undefined;
  const parsed = parseIsoOrZoned(raw, PRODUCT_TIMEZONE);
  if (!parsed) return `invalid-date:${raw}`; // z.coerce.date() will reject with a clear message
  return parsed;
}

export function csvRowToParsedEvent(row: CsvRow, sourceSlug: string): ParsedEventInput {
  const f = row.fields;
  return {
    sourceSlug,
    externalId: f["external_id"] ?? "",
    title: f["title"] ?? "",
    canonicalUrl: f["canonical_url"] ?? "",
    description: f["description"] || undefined,
    startsAt: dateOrNull(f["starts_at"]) ?? "",
    endsAt: dateOrNull(f["ends_at"]),
    venue: f["venue"] || undefined,
    neighborhood: f["neighborhood"] || undefined,
    borough: f["borough"] || undefined,
    priceType: parsePriceType(f["price_type"]),
    priceMin: optionalNumber(f, "price_min_cents"),
    priceMax: optionalNumber(f, "price_max_cents"),
    affiliateUrl: f["affiliate_url"] || undefined,
    expiresAt: dateOrNull(f["expires_at"]),
    tags: splitTags(f["tags"]),
  };
}

export interface CsvAdapterOptions {
  /** Read from disk instead of csvText. */
  csvPath?: string;
  /** Inline CSV text (tests / in-memory imports). */
  csvText?: string;
  /** Override sources.slug (default "freenyc"). */
  sourceSlug?: string;
}

export class ManualCsvAdapter implements SourceAdapter<CsvRow> {
  readonly sourceSlug: string;

  constructor(private readonly options: CsvAdapterOptions = {}) {
    this.sourceSlug = options.sourceSlug ?? DEFAULT_CSV_SOURCE_SLUG;
  }

  async fetchRaw(): Promise<CsvRow[]> {
    let text = this.options.csvText;
    if (text === undefined) {
      const path = this.options.csvPath ?? process.env["EVENTS_CSV_PATH"];
      if (!path) {
        throw new Error("CSV adapter needs csvPath/csvText or EVENTS_CSV_PATH env");
      }
      text = await readFile(path, "utf8");
    }
    return parseCsvRows(text).rows;
  }

  normalize(raw: CsvRow): ParsedEventInput {
    return csvRowToParsedEvent(raw, this.sourceSlug);
  }
}
