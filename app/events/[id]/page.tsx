import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppHeader } from "@/components/auth/app-header";
import { SourceBadge } from "@/components/events/source-badge";
import { SaveButtonContainer } from "@/components/events/save-button-container";
import { formatDayHeading, formatEventTime, formatPrice } from "@/lib/date-format";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { isEventSaved } from "@/lib/saves/queries";
import { getEventDetail } from "@/lib/seo/queries";
import { buildEventJsonLd, displayPriceCents } from "@/lib/seo/json-ld";
import { siteUrlFor } from "@/lib/seo/site";

export const dynamic = "force-dynamic";

type EventDetailPageProps = {
  params: Promise<{ id: string }>;
};

/**
 * The canonical title/description for one listing — shared by generateMetadata
 * and the page so the meta tags and the JSON-LD describe the same content.
 */
function metaDescription(description: string | null): string {
  const base = "Event details, time, and tickets";
  return description?.trim() ? description.slice(0, 200) : base;
}

export async function generateMetadata({ params }: EventDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const event = await getEventDetail(getDb(), id);
  if (!event) return {};

  return {
    title: `${event.title} — NYC Discovery`,
    description: metaDescription(event.description),
    alternates: { canonical: siteUrlFor(`/events/${event.id}`) },
    openGraph: {
      title: event.title,
      description: metaDescription(event.description),
      type: "website",
    },
  };
}

/**
 * Event detail — the full listing plus schema.org Event JSON-LD. The visible
 * listing and the structured data are built from the same row through the
 * same helpers (lib/seo/json-ld.displayPriceCents, the shared date
 * formatters), so the two can never disagree.
 */
export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const session = await auth();
  const signedIn = Boolean(session?.user);

  const db = getDb();
  const event = await getEventDetail(db, id);
  if (!event) notFound();

  const initialSaved =
    signedIn && session?.user?.id ? await isEventSaved(db, session.user.id, event.id) : false;

  const jsonLd = buildEventJsonLd({
    id: event.id,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    venue: event.venue,
    neighborhood: event.neighborhood,
    borough: event.borough,
    priceType: event.priceType,
    priceMin: event.priceMin,
    canonicalUrl: event.canonicalUrl,
    detailUrl: siteUrlFor(`/events/${event.id}`),
  });

  const priceCents = displayPriceCents(event);
  const locationBits = [event.venue, event.neighborhood, event.borough].filter(Boolean);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <script
          type="application/ld+json"
          data-slot="event-jsonld"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <article
          data-slot="event-detail"
          className="border-border bg-card rounded-xl border p-6"
        >
          <p className="text-muted-foreground text-xs font-medium">
            <span data-slot="event-detail-day">{formatDayHeading(event.startsAt)}</span>
            {" · "}
            <span data-slot="event-detail-time">
              {formatEventTime(event.startsAt)}
            </span>{" "}
            (ET)
            {event.endsAt ? ` – ${formatEventTime(event.endsAt)} (ET)` : null}
          </p>
          <h1 data-slot="event-detail-title" className="mt-1 text-2xl font-semibold">
            {event.title}
          </h1>
          {locationBits.length > 0 ? (
            <p className="text-muted-foreground mt-2 text-sm">
              <span data-slot="event-detail-venue">{event.venue}</span>
              {event.neighborhood || event.borough ? " · " : ""}
              <span>
                {[event.neighborhood, event.borough].filter(Boolean).join(", ")}
              </span>
            </p>
          ) : null}

          {event.description ? (
            <p className="text-foreground/90 mt-4 text-sm leading-relaxed">
              {event.description}
            </p>
          ) : null}

          <div className="border-border mt-6 flex items-center gap-3 border-t pt-4">
            <span data-slot="event-detail-price" className="text-sm font-medium">
              {priceCents !== null
                ? priceCents === 0
                  ? "Free"
                  : formatPrice(priceCents)
                : "Price unknown"}
            </span>
            <SourceBadge source={{ slug: event.sourceSlug, label: event.sourceSlug }} />
            <a
              href={event.canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary ml-auto text-sm font-medium underline-offset-4 hover:underline"
            >
              View at {event.sourceSlug} <span aria-hidden>↗</span>
            </a>
          </div>
        </article>

        <div className="mt-4">
          <SaveButtonContainer
            targetType="event"
            targetId={event.id}
            initialSaved={initialSaved}
            signedIn={signedIn}
            nextPath={`/events/${event.id}`}
          />
        </div>
      </main>
    </div>
  );
}
