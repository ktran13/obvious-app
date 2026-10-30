/**
 * Day-window resolution for the /events directory.
 *
 * The `?day` and `?when` filters are all "which stretch of upcoming time" —
 * a weekday name, an ISO date, or the today/tomorrow/weekend/week presets.
 * Every window is a half-open [start, end) instant range anchored to the
 * America/New_York calendar (the product's grouping timezone), so a 1am
 * Saturday event is Saturday, not "Friday night spillover", and an 8pm
 * Saturday event stays Saturday even though its UTC instant lands on Sunday.
 *
 * Builds on the PR #3 display helpers (lib/date-format dayKey) and the
 * ingestion zone math (zonedTimeToUtc) — no new timezone logic here.
 */
import { dayKey } from "@/lib/date-format";
import { PRODUCT_TIMEZONE, zonedTimeToUtc } from "@/lib/ingest/time";
import type { DayFilter } from "@/lib/schemas/event-filters";

export interface DayWindow {
  /** Inclusive start instant (NY midnight of the first day). */
  start: Date;
  /** Exclusive end instant (NY midnight after the last day). */
  end: Date;
}

const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type WeekdayName = (typeof WEEKDAYS)[number];

function parseKey(key: string): [number, number, number] {
  const m = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new RangeError(`Invalid day key: ${key}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** ISO weekday (1=Mon … 7=Sun) of a NY calendar date. Calendar dates are timezone-free. */
export function isoWeekdayOfDayKey(key: string): number {
  const [y, m, d] = parseKey(key);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow === 0 ? 7 : dow;
}

/** The NY-midnight instant a day key denotes, DST-aware. */
export function startOfDay(key: string, timeZone: string = PRODUCT_TIMEZONE): Date {
  const [y, m, d] = parseKey(key);
  return zonedTimeToUtc({ year: y, month: m, day: d, hour: 0, minute: 0, second: 0 }, timeZone);
}

/** Shift a day key by whole calendar days. */
export function dayKeyAdd(key: string, days: number): string {
  const [y, m, d] = parseKey(key);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(shifted.getUTCDate()).padStart(2, "0");
  return `${shifted.getUTCFullYear()}-${mm}-${dd}`;
}

/** Next occurrence of a weekday from `now` — today counts when it matches. */
export function nextWeekdayDayKey(
  now: Date,
  weekday: WeekdayName,
  timeZone: string = PRODUCT_TIMEZONE,
): string {
  const target = WEEKDAYS.indexOf(weekday) + 1;
  const today = dayKey(now, timeZone);
  const delta = (target - isoWeekdayOfDayKey(today) + 7) % 7;
  return dayKeyAdd(today, delta);
}

/** The [start, end) window of one NY calendar day. */
export function dayKeyWindow(key: string, timeZone: string = PRODUCT_TIMEZONE): DayWindow {
  return { start: startOfDay(key, timeZone), end: startOfDay(dayKeyAdd(key, 1), timeZone) };
}

/**
 * The upcoming weekend: Sat+Sun. Inside the weekend it starts today —
 * a Saturday request keeps both days, a Sunday request keeps Sunday only.
 */
export function weekendWindow(now: Date, timeZone: string = PRODUCT_TIMEZONE): DayWindow {
  const today = dayKey(now, timeZone);
  const dow = isoWeekdayOfDayKey(today);
  if (dow === 6)
    return { start: startOfDay(today, timeZone), end: startOfDay(dayKeyAdd(today, 2), timeZone) };
  if (dow === 7)
    return { start: startOfDay(today, timeZone), end: startOfDay(dayKeyAdd(today, 1), timeZone) };
  const saturday = dayKeyAdd(today, (6 - dow + 7) % 7);
  return {
    start: startOfDay(saturday, timeZone),
    end: startOfDay(dayKeyAdd(saturday, 2), timeZone),
  };
}

/** Resolve any ?day= value (preset, weekday name, or ISO date) to its window. */
export function resolveDayWindow(
  day: DayFilter,
  now: Date,
  timeZone: string = PRODUCT_TIMEZONE,
): DayWindow {
  if (day === "today") return dayKeyWindow(dayKey(now, timeZone), timeZone);
  if (day === "tomorrow") return dayKeyWindow(dayKeyAdd(dayKey(now, timeZone), 1), timeZone);
  if (day === "weekend") return weekendWindow(now, timeZone);
  if ((WEEKDAYS as readonly string[]).includes(day)) {
    return dayKeyWindow(nextWeekdayDayKey(now, day as WeekdayName, timeZone), timeZone);
  }
  // The Zod schema guarantees only ISO dates remain.
  return dayKeyWindow(day, timeZone);
}

/** Resolve any ?when= preset; `week` is today plus the following six days. */
export function resolveWhenWindow(
  when: "today" | "tomorrow" | "weekend" | "week",
  now: Date,
  timeZone: string = PRODUCT_TIMEZONE,
): DayWindow {
  if (when === "week") {
    const today = dayKey(now, timeZone);
    return { start: startOfDay(today, timeZone), end: startOfDay(dayKeyAdd(today, 7), timeZone) };
  }
  return resolveDayWindow(when, now, timeZone);
}
