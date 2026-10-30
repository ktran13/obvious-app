import Link from "next/link";

import { AppHeader } from "@/components/auth/app-header";
import { AdSlot } from "@/components/events/ad-slot";
import { EventCard } from "@/components/events/event-card";
import { SaveButtonContainer } from "@/components/events/save-button-container";
import type { EventSummary } from "@/components/events/types";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { filtersToEventPath, formatSlugLabel } from "@/lib/events/params";
import {
  getHomepageHighlights,
  getPersonaEntryPoints,
  type DirectoryEvent,
} from "@/lib/events/queries";

export const dynamic = "force-dynamic";

const PER_SECTION = 6;

function EventList({
  events,
  signedIn,
  nextPath,
}: {
  events: DirectoryEvent[];
  signedIn: boolean;
  nextPath: string;
}) {
  return (
    <ul className="flex flex-col gap-4">
      {events.map((event) => {
        const summary: EventSummary = {
          id: event.id,
          title: event.title,
          startsAt: event.startsAt.toISOString(),
          venue: event.venue ?? "",
          neighborhood: event.neighborhood ?? "",
          isFree: event.priceType === "free",
          priceCents:
            event.priceType === "paid"
              ? (event.priceMax ?? event.priceMin ?? undefined)
              : undefined,
          source: { slug: event.sourceSlug, label: event.sourceLabel },
          url: event.canonicalUrl,
        };
        return (
          <li key={event.id}>
            <EventCard
              event={summary}
              tracked
              affiliateUrl={event.affiliateUrl}
              saveButton={
                <SaveButtonContainer
                  targetType="event"
                  targetId={event.id}
                  initialSaved={false}
                  signedIn={signedIn}
                  nextPath={nextPath}
                />
              }
            />
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Homepage — tonight / weekend highlights and persona entry points feeding
 * the /events directory. Anonymous-first: no session requirement anywhere;
 * the save affordance prompts sign-in instead of gating the page.
 */
export default async function Home() {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  const db = getDb();
  const [{ tonight, weekend }, personas] = await Promise.all([
    getHomepageHighlights(db, new Date(), PER_SECTION),
    getPersonaEntryPoints(db),
  ]);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Upcoming in NYC</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Browse freely — sign in only if you want to save things.
        </p>
        <Link
          href="/events"
          className="text-primary mt-3 inline-block text-sm font-medium underline-offset-4 hover:underline"
        >
          Browse the full events directory →
        </Link>

        <section className="mt-8" aria-label="Tonight">
          <h2 className="text-lg font-semibold tracking-tight">Tonight</h2>
          {tonight.length === 0 ? (
            <p className="border-border text-muted-foreground mt-3 rounded-xl border border-dashed p-6 text-center text-sm">
              Nothing left on today&rsquo;s calendar — the weekend picks are below.
            </p>
          ) : (
            <div className="mt-3">
              <EventList events={tonight} signedIn={signedIn} nextPath="/" />
            </div>
          )}
        </section>

        <AdSlot label="Sponsored" className="mt-8" />

        <section className="mt-8" aria-label="This weekend">
          <h2 className="text-lg font-semibold tracking-tight">This weekend</h2>
          {weekend.length === 0 ? (
            <p className="border-border text-muted-foreground mt-3 rounded-xl border border-dashed p-6 text-center text-sm">
              No weekend listings yet. Run <code>pnpm db:seed</code> to load demo data.
            </p>
          ) : (
            <div className="mt-3">
              <EventList events={weekend} signedIn={signedIn} nextPath="/" />
            </div>
          )}
        </section>

        {personas.length > 0 && (
          <section className="mt-10" aria-label="Browse by who it's for">
            <h2 className="text-lg font-semibold tracking-tight">What brings you to the city?</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {personas.map(({ persona, eventCount }) => (
                <Link
                  key={persona}
                  href={filtersToEventPath({
                    interests: [],
                    persona,
                    when: null,
                    day: null,
                    freeOnly: false,
                    neighborhoods: [],
                  })}
                  data-slot="persona-entry"
                  data-persona={persona}
                  className="block"
                >
                  <Card className="p-4">
                    <span className="block text-sm font-semibold">{formatSlugLabel(persona)}</span>
                    <span className="text-muted-foreground mt-0.5 block text-xs">
                      {eventCount} upcoming {eventCount === 1 ? "event" : "events"}
                    </span>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
