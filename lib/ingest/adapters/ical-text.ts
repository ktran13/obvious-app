/**
 * Minimal RFC 5545 (iCalendar) reader for event ingestion.
 *
 * Supports exactly what the Luma export uses: VEVENT blocks, line unfolding,
 * property parameters (incl. quoted values and TZID), UTC / zoned / all-day
 * (VALUE=DATE) datetimes, and TEXT escaping. Recurrence is out of scope by
 * design — Luma exports one concrete VEVENT per occurrence.
 */

import { PRODUCT_TIMEZONE, zonedTimeToUtc } from "../time";

export interface ICalDateTime {
  date: Date;
  /** VALUE=DATE (date-only) — DTEND is exclusive per RFC 5545. */
  isAllDay: boolean;
}

export interface VEvent {
  uid?: string;
  summary?: string;
  description?: string;
  url?: string;
  location?: string;
  dtstart?: ICalDateTime;
  dtend?: ICalDateTime;
}

/** RFC 5545 §3.1 — join physical lines whose continuation begins with SP/HTAB. */
export function unfoldLines(text: string): string[] {
  const out: string[] = [];
  for (const physical of text.split(/\r\n|\n|\r/)) {
    if ((physical.startsWith(" ") || physical.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += physical.slice(1);
    } else {
      out.push(physical);
    }
  }
  return out;
}

/** RFC 5545 §3.3.11 — unescape TEXT values (\n, \N, \, \; \\). */
function unescapeText(value: string): string {
  return value.replace(/\\(\\|n|N|,|;)/g, (_, c: string) => (c === "n" || c === "N" ? "\n" : c));
}

export interface ICalProperty {
  name: string;
  params: Record<string, string>;
  value: string;
}

/**
 * Split one unfolded line into name, params, and value. The separating colon
 * is the first colon not inside a double-quoted parameter value; colons may
 * still appear in the value itself (e.g. "URL:https://…" is fine, and a
 * param like `CN="a: b"` must not split early).
 */
export function parseICalProperty(line: string): ICalProperty | null {
  let inQuotes = false;
  let splitAt = -1;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ":" && !inQuotes) {
      splitAt = i;
      break;
    }
  }
  if (splitAt === -1) return null;

  const head = line.slice(0, splitAt);
  const value = line.slice(splitAt + 1);
  const segments = head.split(";");
  const name = segments[0].trim().toUpperCase();
  if (!name) return null;

  const params: Record<string, string> = {};
  for (const segment of segments.slice(1)) {
    const eq = segment.indexOf("=");
    if (eq === -1) continue;
    const key = segment.slice(0, eq).trim().toUpperCase();
    let paramValue = segment.slice(eq + 1).trim();
    if (paramValue.startsWith('"') && paramValue.endsWith('"') && paramValue.length >= 2) {
      paramValue = paramValue.slice(1, -1);
    }
    params[key] = paramValue;
  }
  return { name, params, value };
}

const ALL_DAY_DATE = /^(\d{4})(\d{2})(\d{2})$/;
const DATE_TIME = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/;

/** Parse a DATE or DATE-TIME value with its parameters into a UTC instant. */
export function parseICalDateTime(
  value: string,
  params: Record<string, string> = {},
  fallbackTimeZone: string = PRODUCT_TIMEZONE,
): ICalDateTime | null {
  const trimmed = value.trim();

  // Date-only form (VALUE=DATE or a bare yyyymmdd) — all-day, midnight in the
  // event's zone (TZID param, else the product timezone).
  const dateMatch = trimmed.match(ALL_DAY_DATE);
  if (dateMatch) {
    return {
      date: zonedTimeToUtc(
        {
          year: +dateMatch[1],
          month: +dateMatch[2],
          day: +dateMatch[3],
          hour: 0,
          minute: 0,
          second: 0,
        },
        params["TZID"] ?? fallbackTimeZone,
      ),
      isAllDay: true,
    };
  }

  const timeMatch = trimmed.match(DATE_TIME);
  if (!timeMatch) return null;
  const [, y, mo, d, h, mi, s, zulu] = timeMatch;
  if (zulu) {
    return { date: new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)), isAllDay: false };
  }
  // Timed value without Z: TZID param if present, otherwise floating —
  // interpret floating times in the product timezone.
  return {
    date: zonedTimeToUtc(
      { year: +y, month: +mo, day: +d, hour: +h, minute: +mi, second: +s },
      params["TZID"] ?? fallbackTimeZone,
    ),
    isAllDay: false,
  };
}

/**
 * Extract every VEVENT from an iCalendar document as raw text blocks.
 * Nesting (VALARM etc.) is skipped: only top-level properties are read.
 */
export function splitVEvents(text: string): string[] {
  const blocks: string[] = [];
  let current: string[] | undefined;
  let subComponentDepth = 0;

  for (const line of unfoldLines(text)) {
    if (/^BEGIN:VEVENT\s*$/i.test(line)) {
      current = [];
      subComponentDepth = 0;
      continue;
    }
    if (current === undefined) continue;
    if (/^BEGIN:/i.test(line)) {
      subComponentDepth++;
      continue;
    }
    if (/^END:/i.test(line)) {
      if (subComponentDepth > 0) {
        subComponentDepth--;
        continue;
      }
      blocks.push(current.join("\n"));
      current = undefined;
      continue;
    }
    if (subComponentDepth === 0 && line.trim()) current.push(line);
  }
  return blocks;
}

/** Parse one VEVENT text block into its top-level properties. */
export function parseVEvent(block: string): VEvent {
  const event: VEvent = {};
  for (const line of block.split("\n")) {
    const prop = parseICalProperty(line);
    if (!prop) continue;
    switch (prop.name) {
      case "UID":
        event.uid ??= prop.value.trim();
        break;
      case "SUMMARY":
        event.summary ??= unescapeText(prop.value.trim());
        break;
      case "DESCRIPTION":
        event.description ??= unescapeText(prop.value).trim();
        break;
      case "URL":
        event.url ??= prop.value.trim();
        break;
      case "LOCATION":
        event.location ??= unescapeText(prop.value).trim();
        break;
      case "DTSTART": {
        const parsedStart = parseICalDateTime(prop.value, prop.params);
        if (parsedStart) event.dtstart ??= parsedStart;
        break;
      }
      case "DTEND": {
        const parsedEnd = parseICalDateTime(prop.value, prop.params);
        if (parsedEnd) event.dtend ??= parsedEnd;
        break;
      }
    }
  }
  return event;
}
