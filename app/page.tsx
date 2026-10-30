import { asc, eq, gte } from "drizzle-orm";

import { AppHeader } from "@/components/auth/app-header";
import { EventCard } from "@/components/events/event-card";
import { SaveButtonContainer } from "@/components/events/save-button-container";
import type { EventSummary } from "@/components/events/types";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { events, sources } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/**
 * Anonymous-first browse surface: upcoming events, each with a save affordance.
 * No session requirement anywhere on this page — anonymous visitors get the
 * sign-in prompt on the button, not a redirect.
 */
export default async function Home() {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  const db = getDb();
  const upcoming = await db
    .select({
      id: events.id,
      title: events.title,
      startsAt: events.startsAt,
      venue: events.venue,
      neighborhood: events.neighborhood,
      canonicalUrl: events.canonicalUrl,
      priceType: events.priceType,
      priceMin: events.priceMin,
      sourceSlug: sources.slug,
    })
    .from(events)
    .innerJoin(sources, eq(events.sourceId, sources.id))
    .where(gte(events.startsAt, new Date()))
    .orderBy(asc(events.startsAt))
    .limit(12);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Upcoming in NYC</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse freely — sign in only if you want to save things.
        </p>
        {upcoming.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No upcoming events yet. Run <code>pnpm db:seed</code> to load demo
            listings.
          </p>
        ) : (
          <ul className="mt-6 flex flex-col gap-4">
            {upcoming.map((event) => {
              const summary: EventSummary = {
                id: event.id,
                title: event.title,
                startsAt: event.startsAt.toISOString(),
                venue: event.venue ?? "",
                neighborhood: event.neighborhood ?? "",
                isFree: event.priceType === "free",
                priceCents: event.priceType === "paid" ? (event.priceMin ?? undefined) : undefined,
                source: { slug: event.sourceSlug, label: event.sourceSlug },
                url: event.canonicalUrl,
              };
              return (
                <li key={event.id}>
                  <EventCard
                    event={summary}
                    saveButton={
                      <SaveButtonContainer
                        targetType="event"
                        targetId={event.id}
                        initialSaved={false}
                        signedIn={signedIn}
                        nextPath="/"
                      />
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
