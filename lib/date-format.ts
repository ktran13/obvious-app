// All helpers are pure: they format a single instant for display in a
// supplied IANA timezone. America/New_York is the product's canonical
// grouping timezone — events are grouped by NYC calendar day regardless
// of the viewer's local timezone.

const DEFAULT_TIME_ZONE = "America/New_York";

function toDate(instant: string | Date): Date {
  const date = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Invalid date: ${String(instant)}`);
  }
  return date;
}

/** Calendar-day key (YYYY-MM-DD) for an instant, in the supplied timezone. */
export function dayKey(
  instant: string | Date,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(toDate(instant));
}

/** Day-group heading, e.g. "Saturday, Nov 7". */
export function formatDayHeading(
  instant: string | Date,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(toDate(instant));
}

/** Wall-clock time for a single event, e.g. "7:00 PM". */
export function formatEventTime(
  instant: string | Date,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(toDate(instant));
}
