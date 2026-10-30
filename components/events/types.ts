export type EventSource = {
  slug: string;
  label: string;
};

export type EventSummary = {
  id: string;
  title: string;
  /** ISO 8601 instant. */
  startsAt: string;
  endsAt?: string;
  venue: string;
  neighborhood: string;
  /** Free events carry no price; paid events carry the ticket price in cents. */
  isFree: boolean;
  priceCents?: number;
  source: EventSource;
  /** Canonical link-out to the original listing. */
  url: string;
};

export type SaveState = "idle" | "prompting" | "saved";

export type EventFilters = {
  interests: string[];
  persona: string | null;
  /** Named preset: today | tomorrow | weekend. */
  when: string | null;
  /** Weekday name, ISO date, or preset. */
  day: string | null;
  freeOnly: boolean;
  neighborhoods: string[];
};
