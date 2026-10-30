/**
 * Calendar-day grouping for the /events directory.
 *
 * Grouping is by the event's America/New_York calendar day (via dayKey), so
 * late-night events land on the day their NY wall-clock start falls on — a
 * 1am Saturday start groups under Saturday, and an 8pm Saturday start stays
 * Saturday even when its UTC instant is already Sunday.
 */
import { dayKey, formatDayHeading } from "@/lib/date-format";

import { dayKeyAdd } from "./day-window";

export interface DayGrouping<T> {
  /** Calendar-day key (YYYY-MM-DD, NY) — stable anchor for data attributes. */
  key: string;
  /** Display heading, e.g. "Saturday, Nov 7", optionally prefixed Today/Tomorrow. */
  heading: string;
  events: T[];
}

const NOON_UTC_SUFFIX = "T12:00:00Z"; // Noon UTC is always mid-morning in NY — same calendar date.

/** Heading for a day key, with Today/Tomorrow prefix when relative to `now`. */
export function formatDayGroupHeading(
  key: string,
  now: Date,
  timeZone: string = "America/New_York",
): string {
  const heading = formatDayHeading(`${key}${NOON_UTC_SUFFIX}`, timeZone);
  const today = dayKey(now, timeZone);
  if (key === today) return `Today — ${heading}`;
  if (key === dayKeyAdd(today, 1)) return `Tomorrow — ${heading}`;
  return heading;
}

/**
 * Sort by start time ascending, then fold consecutive events sharing a NY
 * calendar day into groups. Pure: never mutates the input.
 */
export function groupEventsByDay<T extends { startsAt: Date | string }>(
  events: readonly T[],
  timeZone: string = "America/New_York",
  now: Date = new Date(),
): DayGrouping<T>[] {
  const instant = (e: { startsAt: Date | string }) =>
    e.startsAt instanceof Date ? e.startsAt.getTime() : Date.parse(e.startsAt);
  const sorted = [...events].sort((a, b) => instant(a) - instant(b));

  const groups: DayGrouping<T>[] = [];
  for (const event of sorted) {
    const key = dayKey(event.startsAt, timeZone);
    const current = groups.at(-1);
    if (current && current.key === key) {
      current.events.push(event);
    } else {
      groups.push({ key, heading: formatDayGroupHeading(key, now, timeZone), events: [event] });
    }
  }
  return groups;
}
