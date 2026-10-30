/**
 * Timezone helpers for ingestion and seeding.
 *
 * The product groups and displays everything by America/New_York calendar day
 * (Blueprint Rev 2.3), so wall-clock times from sources must be resolved to
 * instants against that zone — including across the EDT/EST transition. Node
 * 20 ships full ICU, so Intl can compute the zone's offset at any instant.
 */

/** The product's display timezone. */
export const PRODUCT_TIMEZONE = "America/New_York";

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Offset (ms) of `timeZone` at the given UTC instant (positive = east of UTC). */
function timeZoneOffsetMs(utcMs: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = new Map(
    dtf.formatToParts(new Date(utcMs)).map((p) => [p.type, p.value] as const),
  );
  const asUtc = Date.UTC(
    Number(parts.get("year")),
    Number(parts.get("month")) - 1,
    Number(parts.get("day")),
    Number(parts.get("hour")),
    Number(parts.get("minute")),
    Number(parts.get("second")),
  );
  return asUtc - utcMs;
}

/**
 * Convert wall-clock parts in `timeZone` to the UTC instant they denote.
 * Two refinement passes handle instants right at a DST transition, where the
 * zone's offset changes between the guess and the target.
 */
export function zonedTimeToUtc(parts: ZonedParts, timeZone: string = PRODUCT_TIMEZONE): Date {
  const asIfUtc = () =>
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  let guess = asIfUtc();
  for (let i = 0; i < 2; i++) {
    guess = asIfUtc() - timeZoneOffsetMs(guess, timeZone);
  }
  return new Date(guess);
}

/**
 * Parse an ISO-8601 datetime string. Strings with an explicit UTC designator
 * or numeric offset parse directly; naive local strings ("2026-11-18T19:00:00")
 * are interpreted in the product timezone so fixtures can stay offset-free.
 * Returns null for unparseable input — callers decide whether that is fatal.
 */
export function parseIsoOrZoned(
  value: string,
  timeZone: string = PRODUCT_TIMEZONE,
): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/[zZ]$/.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const m = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?$/,
  );
  if (!m) return null;
  return zonedTimeToUtc(
    {
      year: Number(m[1]),
      month: Number(m[2]),
      day: Number(m[3]),
      hour: Number(m[4]),
      minute: Number(m[5]),
      second: m[6] ? Math.floor(Number(m[6])) : 0,
    },
    timeZone,
  );
}
