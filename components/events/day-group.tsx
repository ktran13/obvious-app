import type { ReactNode } from "react";

import { cn } from "cn";

type DayGroupProps = {
  /** Calendar-day heading, e.g. "Saturday, Nov 7" (see formatDayHeading). */
  heading: string;
  /** EventCard elements for that day, in start-time order. */
  children?: ReactNode;
  className?: string;
};

/** Groups EventCards under a calendar-day heading. Purely presentational. */
export function DayGroup({ heading, children, className }: DayGroupProps) {
  return (
    <section
      data-slot="day-group"
      aria-label={`Events on ${heading}`}
      className={cn("space-y-3", className)}
    >
      <h2 className="text-lg font-semibold tracking-tight">{heading}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
