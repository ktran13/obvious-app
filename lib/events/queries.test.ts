/**
 * Directory query tests — isolated in a throwaway Postgres database (see
 * lib/db/test-db), so they neither see nor destroy the shared dev/CI seed
 * data (306 curated events).
 *
 * Fixture clock: Fri Oct 30, 2026, 11:00am EDT ("now"). Events span Fri
 * evening through the next week, including the late-night cases: a 1am
 * Saturday start and an 8pm Saturday start whose UTC instant lands on Sunday.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { z } from "zod";

import { dayKey } from "@/lib/date-format";
import { createIsolatedTestDb, type IsolatedTestDb } from "@/lib/db/test-db";
import { eventTags, events, sources } from "@/lib/db/schema";
import { eventFilterSchema } from "@/lib/schemas/event-filters";
import { resolveDatabaseUrl } from "@/lib/db/url";

import {
  getFilterOptions,
  getHomepageHighlights,
  getPersonaEntryPoints,
  listDirectoryEvents,
} from "./queries";

const TEST_DB = "nyc_events_query_test";

const client = postgres(resolveDatabaseUrl(), {
  database: TEST_DB,
  max: 1,
  connect_timeout: 5,
});
const db = drizzle(client);

let testDb: IsolatedTestDb;

beforeAll(async () => {
  testDb = await createIsolatedTestDb(TEST_DB);
}, 30_000);

afterAll(async () => {
  await client.end();
  await testDb.dispose();
});

beforeEach(async () => {
  await db.execute(`TRUNCATE sources CASCADE`);
});

const NOW = new Date("2026-10-30T15:00:00Z"); // Fri 11am EDT

interface FixtureEvent {
  title: string;
  startsAt: string; // ISO with explicit NY offset
  neighborhood?: string;
  priceType?: "free" | "paid" | "unknown";
  priceMin?: number;
  endsAtHours?: number;
  expiresAt?: string;
  tags?: string[];
}

const FIXTURES: FixtureEvent[] = [
  {
    title: "Friday Evening String Trio",
    startsAt: "2026-10-30T18:00:00-04:00", // Fri 6pm EDT
    neighborhood: "bushwick",
    priceType: "free",
    tags: ["interest:music", "persona:female"],
  },
  {
    title: "Late Night Comedy",
    startsAt: "2026-10-31T01:00:00-04:00", // 1am Sat EDT — late-night attribution case
    neighborhood: "astoria",
    priceType: "paid",
    priceMin: 1500,
    tags: ["interest:arts", "persona:students"],
  },
  {
    title: "Saturday Night Warehouse Party",
    startsAt: "2026-10-31T20:00:00-04:00", // Sat 8pm EDT = Sun 00:00Z — UTC-day trap
    neighborhood: "bushwick",
    priceType: "paid",
    priceMin: 3000,
    tags: ["interest:music", "persona:professionals"],
  },
  {
    title: "Sunday Morning Bird Walk",
    startsAt: "2026-11-01T09:00:00-04:00", // Sun 9am EDT
    neighborhood: "park-slope",
    priceType: "free",
    tags: ["interest:outdoors", "persona:kids"],
  },
  {
    title: "Tuesday Tech Talks",
    startsAt: "2026-11-03T18:30:00-05:00", // Tue 6:30pm EST
    neighborhood: "astoria",
    priceType: "free",
    tags: ["interest:tech", "persona:professionals"],
  },
  {
    title: "Already Ended",
    startsAt: "2026-10-30T09:00:00-04:00", // two hours before NOW
    neighborhood: "soho",
    tags: ["interest:music"],
  },
  {
    title: "Expired Listing",
    startsAt: "2026-11-07T19:00:00-05:00",
    neighborhood: "soho",
    expiresAt: "2026-10-30T00:00:00Z", // takedown cutoff already fired
    tags: ["interest:arts"],
  },
  {
    title: "Next Saturday Gala",
    startsAt: "2026-11-07T19:00:00-05:00", // beyond the week window
    neighborhood: "harlem",
    priceType: "paid",
    priceMin: 9000,
    tags: ["interest:arts", "persona:female"],
  },
];

async function seedFixtureEvents() {
  const [source] = await db.insert(sources).values({ slug: "luma-test", kind: "ical" }).returning();
  const inserted: Array<{ id: string; title: string }> = [];
  for (const fixture of FIXTURES) {
    const startsAt = new Date(fixture.startsAt);
    const [row] = await db
      .insert(events)
      .values({
        sourceId: source.id,
        externalId: `evt-${fixture.title.toLowerCase().replace(/\W+/g, "-")}`,
        canonicalUrl: `https://lu.ma/${encodeURIComponent(fixture.title.toLowerCase().replace(/\W+/g, "-"))}`,
        title: fixture.title,
        startsAt,
        endsAt: fixture.endsAtHours
          ? new Date(startsAt.getTime() + fixture.endsAtHours * 3_600_000)
          : null,
        venue: `${fixture.neighborhood ?? "soho"} hall`,
        neighborhood: fixture.neighborhood ?? "soho",
        borough: "brooklyn",
        priceType: fixture.priceType ?? "unknown",
        priceMin: fixture.priceMin ?? null,
        expiresAt: fixture.expiresAt ? new Date(fixture.expiresAt) : null,
      })
      .returning({ id: events.id, title: events.title });
    inserted.push(row);
    if (fixture.tags?.length) {
      await db
        .insert(eventTags)
        .values(fixture.tags.map((tag) => ({ eventId: row.id, tag })))
        .onConflictDoNothing();
    }
  }
  return inserted;
}

const titles = (rows: Array<{ title: string }>) => rows.map((r) => r.title);

/** The real call-site contract: filters arrive Zod-validated (defaults applied). */
const directory = (filter: z.input<typeof eventFilterSchema>, now: Date = NOW) =>
  listDirectoryEvents(db, eventFilterSchema.parse(filter), now);

describe("listDirectoryEvents", () => {
  it("orders across many days by startsAt ascending and hides stale/expired rows", async () => {
    await seedFixtureEvents();

    const rows = await directory({});

    expect(titles(rows)).toEqual([
      "Friday Evening String Trio",
      "Late Night Comedy",
      "Saturday Night Warehouse Party",
      "Sunday Morning Bird Walk",
      "Tuesday Tech Talks",
      "Next Saturday Gala",
    ]);
    const dayKeys = rows.map((r) => dayKey(r.startsAt));
    expect([...dayKeys].sort()).toEqual(dayKeys); // non-decreasing NY calendar days
  });

  it("every ?day= ISO date keeps late-night and UTC-crossover events on their NY day", async () => {
    await seedFixtureEvents();

    const saturday = await directory({ day: "2026-10-31" });

    // Late Night Comedy (1am Sat) and the Warehouse Party (8pm Sat = 00:00Z
    // Sunday) both belong to Saturday's NY window; the Sunday bird walk does not.
    expect(titles(saturday)).toEqual(["Late Night Comedy", "Saturday Night Warehouse Party"]);
  });

  it("every ?day= weekday resolves to the next occurrence (today inclusive)", async () => {
    await seedFixtureEvents();

    expect(titles(await directory({ day: "saturday" }))).toEqual([
      "Late Night Comedy",
      "Saturday Night Warehouse Party",
    ]);
    expect(titles(await directory({ day: "friday" }))).toEqual(["Friday Evening String Trio"]);
    expect(await directory({ day: "thursday" })).toEqual([]); // next Thursday (Nov 5) has no fixture
  });

  it("every ?day= preset: today shows today's remaining events, tomorrow tomorrow's", async () => {
    await seedFixtureEvents();

    expect(titles(await directory({ day: "today" }))).toEqual(["Friday Evening String Trio"]);
    expect(titles(await directory({ day: "tomorrow" }))).toEqual([
      "Late Night Comedy",
      "Saturday Night Warehouse Party",
    ]);
  });

  it("every ?day= preset: weekend spans Sat+Sun starting today when already inside it", async () => {
    await seedFixtureEvents();

    expect(titles(await directory({ day: "weekend" }))).toEqual([
      "Late Night Comedy",
      "Saturday Night Warehouse Party",
      "Sunday Morning Bird Walk",
    ]);
  });

  it("?when=week covers today through the next six days", async () => {
    await seedFixtureEvents();

    const rows = await directory({ when: "week" });
    expect(titles(rows)).toEqual([
      "Friday Evening String Trio",
      "Late Night Comedy",
      "Saturday Night Warehouse Party",
      "Sunday Morning Bird Walk",
      "Tuesday Tech Talks",
    ]);
  });

  it("filters combine: free + day, neighborhood + interest, persona + interest", async () => {
    await seedFixtureEvents();

    // free + day=weekend → free weekend events.
    expect(titles(await directory({ free: true, day: "weekend" }))).toEqual([
      "Sunday Morning Bird Walk",
    ]);

    // neighborhood + interest → bushwick music.
    expect(titles(await directory({ neighborhood: "bushwick", interests: ["music"] }))).toEqual([
      "Friday Evening String Trio",
      "Saturday Night Warehouse Party",
    ]);

    // persona + interest AND across groups: music ∩ professionals → warehouse party only.
    expect(titles(await directory({ interests: ["music"], personas: ["professionals"] }))).toEqual([
      "Saturday Night Warehouse Party",
    ]);
  });

  it("multiple interests OR within the group", async () => {
    await seedFixtureEvents();

    expect(titles(await directory({ interests: ["music", "tech"] }))).toEqual([
      "Friday Evening String Trio",
      "Saturday Night Warehouse Party",
      "Tuesday Tech Talks",
    ]);
  });

  it("a tagless combined filter that matches nothing returns an empty list", async () => {
    await seedFixtureEvents();

    expect(
      await directory({ interests: ["family"], personas: ["seniors"], day: "2026-11-07" }),
    ).toEqual([]);
  });
});

describe("getFilterOptions", () => {
  it("derives the filter vocabulary from live rows", async () => {
    await seedFixtureEvents();

    const options = await getFilterOptions(db);
    expect(options.interests).toEqual(["arts", "music", "outdoors", "tech"]);
    expect(options.personas).toEqual(["female", "kids", "professionals", "students"]);
    expect(options.neighborhoods).toEqual(["astoria", "bushwick", "harlem", "park-slope", "soho"]);
  });
});

describe("getPersonaEntryPoints", () => {
  it("counts upcoming events per persona", async () => {
    await seedFixtureEvents();

    const entries = await getPersonaEntryPoints(db, NOW);
    const byPersona = Object.fromEntries(entries.map((e) => [e.persona, e.eventCount]));
    expect(byPersona).toEqual({
      professionals: 2,
      female: 2,
      students: 1,
      kids: 1,
    });
  });
});

describe("getHomepageHighlights", () => {
  it("returns tonight's remaining events and the weekend, capped per section", async () => {
    await seedFixtureEvents();

    const { tonight, weekend } = await getHomepageHighlights(db, NOW);
    expect(titles(tonight)).toEqual(["Friday Evening String Trio"]);
    expect(titles(weekend)).toEqual([
      "Late Night Comedy",
      "Saturday Night Warehouse Party",
      "Sunday Morning Bird Walk",
    ]);
  });

  it("caps each section", async () => {
    await seedFixtureEvents();

    const { weekend } = await getHomepageHighlights(db, NOW, 2);
    expect(weekend).toHaveLength(2);
  });
});
