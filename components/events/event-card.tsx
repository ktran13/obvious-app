"use client";

import { cn } from "cn";

import { formatEventTime } from "@/lib/date-format";
import { linkOutRel } from "@/lib/linkout/redirect-target";

import { SourceBadge } from "./source-badge";
import type { EventSummary } from "./types";

type EventCardProps = {
  event: EventSummary;
  /** IANA timezone the event time is rendered in. */
  timeZone?: string;
  /** Slot for a SaveButton (or any save affordance). */
  saveButton?: React.ReactNode;
  /**
   * Route the link-out through the tracked /go/[id] redirect instead of
   * linking to the canonical URL directly (monetization surfaces do this).
   */
  tracked?: boolean;
  /** The event's affiliate URL, when a partner link exists — adds rel="sponsored". */
  affiliateUrl?: string | null;
  className?: string;
};

export function formatPrice(priceCents: number): string {
  const dollars = priceCents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

/** Presentational event card: every value arrives via props, nothing fetches. */
export function EventCard({
  event,
  timeZone = "America/New_York",
  saveButton,
  tracked = false,
  affiliateUrl,
  className,
}: EventCardProps) {
  return (
    <article
      data-slot="event-card"
      className={cn("rounded-xl border border-border bg-card p-4", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">
            {formatEventTime(event.startsAt, timeZone)}
          </p>
          <h3 className="mt-0.5 text-base font-semibold">{event.title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <span>{event.venue}</span> · <span>{event.neighborhood}</span>
          </p>
        </div>
        {saveButton ? <div className="shrink-0">{saveButton}</div> : null}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm font-medium">
          {event.isFree ? "Free" : formatPrice(event.priceCents ?? 0)}
        </span>
        <SourceBadge source={event.source} />
        <a
          href={tracked && event.id ? `/go/${event.id}` : event.url}
          target="_blank"
          rel={linkOutRel(affiliateUrl)}
          className="ml-auto text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          View at {event.source.label} <span aria-hidden>↗</span>
        </a>
      </div>
    </article>
  );
}
