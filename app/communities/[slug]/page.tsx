import Link from "next/link";
import { notFound } from "next/navigation";

import { AppHeader } from "@/components/auth/app-header";
import { DayGroup } from "@/components/events/day-group";
import { EventCard } from "@/components/events/event-card";
import { SaveButtonContainer } from "@/components/events/save-button-container";
import type { EventSummary } from "@/components/events/types";
import { getCommunityDetail } from "@/lib/communities/queries";
import { isCommunitySaved } from "@/lib/saves/queries";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { dayKey, formatDayHeading } from "@/lib/date-format";

export const dynamic = "force-dynamic";

type CommunityDetailPageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * Community detail — an external organizer's page: description, interests,
 * its aggregated upcoming events grouped by NYC calendar day, and the same
 * save affordance the events surface uses (prompt when anonymous).
 */
export default async function CommunityDetailPage({ params }: CommunityDetailPageProps) {
  const { slug } = await params;
  const session = await auth();
  const signedIn = Boolean(session?.user);

  const db = getDb();
  const detail = await getCommunityDetail(db, slug);
  if (!detail) notFound();

  const { community, interests, upcomingEvents } = detail;
  const initialSaved =
    signedIn && session?.user?.id
      ? await isCommunitySaved(db, session.user.id, community.id)
      : false;

  // Group under NYC calendar-day headings; the query already sorts ascending.
  const groups = new Map<string, typeof upcomingEvents>();
  for (const event of upcomingEvents) {
    const key = dayKey(event.startsAt);
    const list = groups.get(key);
    if (list) {
      list.push(event);
    } else {
      groups.set(key, [event]);
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <header data-slot="community-header" className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold">{community.name}</h1>
              {community.description ? (
                <p className="mt-1 text-sm text-muted-foreground">{community.description}</p>
              ) : null}
              {interests.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                  {interests.map((interest) => (
                    <span key={interest} className="rounded-full border border-border px-2 py-0.5">
                      {interest}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <SaveButtonContainer
                targetType="community"
                targetId={community.id}
                initialSaved={initialSaved}
                signedIn={signedIn}
                nextPath={`/communities/${community.slug}`}
              />
              {community.canonicalUrl ? (
                <a
                  href={community.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Visit organizer&apos;s page <span aria-hidden>↗</span>
                </a>
              ) : null}
            </div>
          </div>
        </header>

        <section className="mt-8">
          <h2 className="text-lg font-semibold tracking-tight">Upcoming events</h2>
          {upcomingEvents.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              This organizer has no upcoming events right now.
            </p>
          ) : (
            <div className="mt-4 space-y-6">
              {[...groups.entries()].map(([key, dayEvents]) => (
                <DayGroup key={key} heading={formatDayHeading(dayEvents[0].startsAt)}>
                  {dayEvents.map((event) => {
                    const summary: EventSummary = {
                      id: event.id,
                      title: event.title,
                      startsAt: event.startsAt.toISOString(),
                      venue: event.venue ?? "",
                      neighborhood: event.neighborhood ?? "",
                      isFree: event.priceType === "free",
                      priceCents:
                        event.priceType === "paid" ? (event.priceMin ?? undefined) : undefined,
                      source: { slug: event.sourceSlug, label: event.sourceSlug },
                      url: event.canonicalUrl,
                    };
                    return (
                      <EventCard
                        key={event.id}
                        event={summary}
                        saveButton={
                          <SaveButtonContainer
                            targetType="event"
                            targetId={event.id}
                            initialSaved={false}
                            signedIn={signedIn}
                            nextPath={`/communities/${community.slug}`}
                          />
                        }
                      />
                    );
                  })}
                </DayGroup>
              ))}
            </div>
          )}
        </section>

        <p className="mt-8 text-sm text-muted-foreground">
          Browsing everything? Head back to the{" "}
          <Link href="/communities" className="font-medium text-primary underline-offset-4 hover:underline">
            community directory
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
