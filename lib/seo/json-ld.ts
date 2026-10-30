/**
 * schema.org Event JSON-LD for /events/[id].
 *
 * One pure builder feeds both the structured data and (through the shared
 * formatters) the rendered page, so the two can never disagree: name,
 * startDate, location, and offers are derived from the same row the listing
 * displays. Follows Google's Event structured-data requirements: name,
 * startDate, and an offers block with an absolute price are mandatory.
 */

/** The listing fields JSON-LD is built from — the detail page's own shape. */
export interface EventJsonLdInput {
  id: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date | null;
  venue: string | null;
  neighborhood: string | null;
  borough: string | null;
  priceType: "free" | "paid" | "unknown";
  priceMin: number | null;
  canonicalUrl: string;
  /** Absolute URL of the /events/[id] page itself. */
  detailUrl: string;
}

/**
 * The single source of truth for a listing's displayed price, in cents.
 * Free events price at 0; paid events use priceMin (the card shows the
 * "from" price); unknown pricing also surfaces as free-entry (price 0)
 * only when the event is verifiably free — unknown stays unknown, and
 * JSON-LD omits the Offer rather than asserting a wrong price.
 */
export function displayPriceCents(event: {
  priceType: "free" | "paid" | "unknown";
  priceMin: number | null;
}): number | null {
  if (event.priceType === "free") return 0;
  if (event.priceType === "paid" && event.priceMin !== null) return event.priceMin;
  return null;
}

/** schema.org Event node for one listing. */
export function buildEventJsonLd(event: EventJsonLdInput): Record<string, unknown> {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    url: event.detailUrl,
    startDate: event.startsAt.toISOString(),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
  };

  if (event.endsAt) node.endDate = event.endsAt.toISOString();
  if (event.description) node.description = event.description;

  const venueName = event.venue ?? event.neighborhood ?? event.borough;
  if (venueName) {
    const address = [event.neighborhood, event.borough].filter(Boolean).join(", ");
    node.location = {
      "@type": "Place",
      name: venueName,
      ...(address ? { address } : {}),
    };
  }

  const priceCents = displayPriceCents(event);
  if (priceCents !== null) {
    const dollars = priceCents / 100;
    node.offers = {
      "@type": "Offer",
      url: event.canonicalUrl,
      price: dollars.toFixed(2),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      ...(event.priceType === "free" ? { isAccessibleForFree: true } : {}),
    };
  }

  return node;
}
