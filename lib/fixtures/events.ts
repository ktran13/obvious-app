import type { EventFilters, EventSummary } from "@/components/events/types";

// Fixture data shared by stories and component tests. Instants are fixed
// so tests never depend on the clock: Fri Nov 6 and Sat Nov 7, 2026, in
// America/New_York (EST, UTC-5, after the Nov 1 DST fallback).

export const fixtureEvents: EventSummary[] = [
  {
    id: "evt-luma-indie-makers",
    title: "Indie Web Makers Meetup",
    startsAt: "2026-11-07T00:00:00.000Z",
    venue: "Bushman Studios",
    neighborhood: "Bushwick",
    isFree: true,
    source: { slug: "luma", label: "Luma" },
    url: "https://lu.ma/indie-makers-nyc",
  },
  {
    id: "evt-eventbrite-jazz-corner",
    title: "Jazz at the Corner",
    startsAt: "2026-11-07T02:30:00.000Z",
    venue: "The Corner Social",
    neighborhood: "Lower East Side",
    isFree: false,
    priceCents: 2500,
    source: { slug: "eventbrite", label: "Eventbrite" },
    url: "https://www.eventbrite.com/e/jazz-at-the-corner",
  },
  {
    id: "evt-meetup-run-club",
    title: "Astoria Morning Run Club",
    startsAt: "2026-11-07T14:00:00.000Z",
    venue: "Astoria Park bandshell",
    neighborhood: "Astoria",
    isFree: true,
    source: { slug: "meetup", label: "Meetup" },
    url: "https://www.meetup.com/astoria-run-club",
  },
  {
    id: "evt-luma-harlem-art-walk",
    title: "Harlem Open Studio Art Walk",
    startsAt: "2026-11-07T18:00:00.000Z",
    venue: "Suite 429 Gallery",
    neighborhood: "Harlem",
    isFree: true,
    source: { slug: "luma", label: "Luma" },
    url: "https://lu.ma/harlem-open-studios",
  },
  {
    id: "evt-eventbrite-nightcap",
    title: "Founders & Funders Nightcap",
    startsAt: "2026-11-08T01:00:00.000Z",
    venue: "The Dead Rabbit",
    neighborhood: "Financial District",
    isFree: false,
    priceCents: 4000,
    source: { slug: "eventbrite", label: "Eventbrite" },
    url: "https://www.eventbrite.com/e/founders-funders-nightcap",
  },
  {
    id: "evt-partiful-garden-volunteer",
    title: "Community Garden Volunteering",
    startsAt: "2026-11-07T15:00:00.000Z",
    endsAt: "2026-11-07T18:00:00.000Z",
    venue: "Suarez Nursery",
    neighborhood: "Sunset Park",
    isFree: true,
    source: { slug: "curated", label: "Curated" },
    url: "https://nycparks.greenthumb.example/garden-day",
  },
];

export const fixtureFilters: EventFilters = {
  interests: [],
  persona: null,
  when: null,
  day: null,
  freeOnly: false,
  neighborhoods: [],
};

export const fixtureFilterOptions = {
  interests: ["Tech", "Music", "Outdoors", "Food", "Art"],
  personas: ["Newcomer", "Parent", "Student", "Retiree"],
  when: ["today", "tomorrow", "weekend"],
  days: ["Friday", "Saturday", "2026-11-07", "weekend"],
  neighborhoods: [
    "Astoria",
    "Bushwick",
    "Financial District",
    "Harlem",
    "Lower East Side",
    "Sunset Park",
  ],
};
