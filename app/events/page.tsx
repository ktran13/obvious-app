import type { Metadata } from "next";

import { AppHeader } from "@/components/auth/app-header";
import { AdSlot } from "@/components/events/ad-slot";
import { DayGroup } from "@/components/events/day-group";
import { EventCard } from "@/components/events/event-card";
import { FilterBarUrl } from "@/components/events/filter-bar-url";
import { SaveMyFilters } from "@/components/events/save-my-filters";
import { SaveButtonContainer } from "@/components/events/save-button-container";
import type { EventSummary } from "@/components/events/types";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { dayKey } from "@/lib/date-format";
import { dayKeyAdd } from "@/lib/events/day-window";
import { groupEventsByDay } from "@/lib/events/grouping";
import {
  filtersToEventPath,
  filtersToSearchParams,
  hasExplicitFilterParams,
  parseEventFilterParams,
  savedFiltersToEventFilters,
  toEventFilter,
} from "@/lib/events/params";
import { getFilterOptions, listDirectoryEvents } from "@/lib/events/queries";
import { getFilterPreferences } from "@/lib/preferences/queries";
import type { EventFilter } from "@/lib/schemas/event-filters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Events directory — NYC Discovery",
  description: "Browse upcoming NYC events by day, interest, persona, neighborhood, and price.",
};

const WHEN_OPTIONS = ["today", "tomorrow", "weekend", "week"];
/** Presets plus the next seven NY calendar days as ISO dates. */
const DAY_PRESET_OPTIONS = ["today", "tomorrow", "weekend"];

type EventsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * The directory — anonymous-first, server-rendered from the URL. Filters
 * arrive as search params (?interest, ?persona, ?when, ?day, ?free, ?n);
 * results are ordered by startsAt ascending and grouped under NY
 * calendar-day headings. No session is required to browse; signing in
 * unlocks the save affordance on each card plus the saved-filter control.
 *
 * Rev 2.3 precedence: a URL with explicit filter params is a deep link and
 * wins wholesale; on a bare /events a signed-in user's saved filter set is
 * pre-applied server-side (URL stays clean — one source of truth per mode).
 */
export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = await searchParams;
  const session = await auth();
  const db = getDb();

  let filters = parseEventFilterParams(params);
  let savedFilters: EventFilter | null = null;
  if (session?.user?.id && !hasExplicitFilterParams(params)) {
    savedFilters = await getFilterPreferences(db, session.user.id);
    if (savedFilters) filters = savedFiltersToEventFilters(savedFilters);
  }

  const [rows, options] = await Promise.all([
    listDirectoryEvents(db, toEventFilter(filters)),
    getFilterOptions(db),
  ]);

  const now = new Date();
  const groups = groupEventsByDay(rows, "America/New_York", now);
  const dayOptions = [...DAY_PRESET_OPTIONS];
  const todayKey = dayKey(now);
  for (let offset = 0; offset < 7; offset++) dayOptions.push(dayKeyAdd(todayKey, offset));

  const query = filtersToSearchParams(filters).toString();
  const nextPath = query ? `/events?${query}` : "/events";

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Events in NYC</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Browse freely — no account needed. Sign in only to save events.
        </p>

        <FilterBarUrl
          className="mt-6"
          filters={filters}
          options={{
            interests: options.interests,
            personas: options.personas,
            when: WHEN_OPTIONS,
            days: dayOptions,
            neighborhoods: options.neighborhoods,
          }}
        />

        {session?.user && (
          <SaveMyFilters filters={filters} hasSaved={savedFilters !== null} className="mt-3" />
        )}

        <AdSlot label="Sponsored" className="mt-6" />

        {groups.length === 0 ? (
          <div className="border-border mt-8 rounded-xl border border-dashed p-8 text-center">
            <p className="text-muted-foreground text-sm">No events match these filters.</p>
            <a
              href={filtersToEventPath({
                interests: [],
                persona: null,
                when: null,
                day: null,
                freeOnly: false,
                neighborhoods: [],
              })}
              className="text-primary mt-2 inline-block text-sm font-medium underline-offset-4 hover:underline"
            >
              Clear all filters
            </a>
          </div>
        ) : (
          <div className="mt-8 space-y-10">
            {groups.map((group) => (
              <div key={group.key} data-day-group={group.key}>
                <DayGroup heading={group.heading}>
                  {group.events.map((event) => {
                    const summary: EventSummary = {
                      id: event.id,
                      title: event.title,
                      startsAt: event.startsAt.toISOString(),
                      venue: event.venue ?? "",
                      neighborhood: event.neighborhood ?? "",
                      isFree: event.priceType === "free",
                      priceCents:
                        event.priceType === "paid" ? (event.priceMin ?? undefined) : undefined,
                      source: { slug: event.sourceSlug, label: event.sourceLabel },
                      url: event.canonicalUrl,
                    };
                    return (
                      <EventCard
                        key={event.id}
                        event={summary}
                        detailHref={`/events/${event.id}`}
                        saveButton={
                          <SaveButtonContainer
                            targetType="event"
                            targetId={event.id}
                            initialSaved={false}
                            signedIn={Boolean(session?.user)}
                            nextPath={nextPath}
                          />
                        }
                      />
                    );
                  })}
                </DayGroup>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
