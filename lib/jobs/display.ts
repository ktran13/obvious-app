// Display helpers for the jobs board. Pure — trivially testable.

/** "Nov 6, 2026" style posted-date label in the given IANA timezone. */
export function formatPostedDate(
  date: Date | string,
  timeZone = "America/New_York",
): string {
  const instant = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(instant);
}
