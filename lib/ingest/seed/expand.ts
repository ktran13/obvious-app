/**
 * Deterministic expansion of curated templates into future-dated events.
 *
 * Same inputs → same external ids and schedule, so re-running the seed
 * upserts identical rows (idempotency). Scheduling iterates the next
 * SEED_DAYS_AHEAD New York calendar days and picks a template's slot
 * weekdays; neighborhoods rotate over the generated sequence so every
 * neighborhood receives events every week.
 */
import { PRODUCT_TIMEZONE, zonedTimeToUtc } from "../time";
import type { ParsedEventInput } from "../types";
import { EVENT_TEMPLATES, VENUE_BY_NEIGHBORHOOD } from "./fixtures";
import { NEIGHBORHOODS } from "./taxonomy";

export const CURATED_SOURCE_SLUG = "curated";
export const SEED_DAYS_AHEAD = 42; // six weeks of future programming
export const EXPIRY_DAYS_AFTER_END = 3;

export interface NyDate {
  y: number;
  m: number;
  d: number;
  isoWeekday: number; // 1=Mon … 7=Sun
}

/** New York calendar date for an instant. */
export function nyDateParts(now: Date): Omit<NyDate, "isoWeekday"> {
  // en-CA gives ISO-style YYYY-MM-DD in the target timezone.
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: PRODUCT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [y, m, d] = formatted.split("-").map(Number);
  return { y: y as number, m: m as number, d: d as number };
}

/** Shift a New York calendar date by whole days; weekday from the NY date. */
export function nyDateAdd(base: Omit<NyDate, "isoWeekday">, days: number): NyDate {
  const shifted = new Date(Date.UTC(base.y, base.m - 1, base.d + days));
  const dow = shifted.getUTCDay();
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
    isoWeekday: dow === 0 ? 7 : dow,
  };
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Expand every template across the seed window; deterministic order. */
export function expandCuratedEvents(now: Date = new Date()): ParsedEventInput[] {
  const today = nyDateParts(now);
  const out: ParsedEventInput[] = [];

  for (const template of EVENT_TEMPLATES) {
    for (let offset = 1; offset <= SEED_DAYS_AHEAD; offset++) {
      const date = nyDateAdd(today, offset);
      if (!template.slots.includes(date.isoWeekday)) continue;

      const neighborhood = NEIGHBORHOODS[out.length % NEIGHBORHOODS.length];
      const venue = VENUE_BY_NEIGHBORHOOD[neighborhood.slug];
      if (!venue) throw new Error(`No venue fixture for neighborhood ${neighborhood.slug}`);

      const startsAt = zonedTimeToUtc({
        year: date.y,
        month: date.m,
        day: date.d,
        hour: template.startHour,
        minute: template.startMinute,
        second: 0,
      });
      const endsAt = new Date(startsAt.getTime() + template.durationHours * 3_600_000);
      const externalId = `curated-${template.slug}-${date.y}${pad2(date.m)}${pad2(date.d)}`;

      out.push({
        sourceSlug: CURATED_SOURCE_SLUG,
        externalId,
        canonicalUrl: `https://example.org/events/${externalId}`,
        title: template.title,
        description: template.description,
        startsAt,
        endsAt,
        venue,
        neighborhood: neighborhood.slug,
        borough: neighborhood.borough,
        priceType: template.priceType,
        priceMin: template.priceMin,
        priceMax: template.priceMax,
        affiliateUrl: undefined,
        expiresAt: new Date(endsAt.getTime() + EXPIRY_DAYS_AFTER_END * 86_400_000),
        tags: [
          ...template.interests.map((i) => `interest:${i}`),
          ...template.personas.map((p) => `persona:${p}`),
        ],
      });
    }
  }
  return out;
}
