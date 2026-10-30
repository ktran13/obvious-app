/**
 * Grouping tests run against fixed instants: Fri Oct 30 – Sun Nov 1, 2026,
 * with `now` far enough earlier that no Today/Tomorrow prefix applies unless
 * the case asks for one.
 */
import { describe, expect, it } from "vitest";

import { groupEventsByDay } from "./grouping";

// Fri Oct 30, 2026, 11:00am EDT — "now" for the grouping tests.
const NOW = new Date("2026-10-30T15:00:00Z");

function event(startsAt: string) {
  return { id: `evt-${startsAt}`, title: `Event at ${startsAt}`, startsAt };
}

describe("groupEventsByDay", () => {
  it("orders multi-day input ascending and folds each NY calendar day into one group", () => {
    const groups = groupEventsByDay(
      [
        event("2026-11-01T13:00:00Z"), // Sun 9am EDT
        event("2026-10-30T22:00:00Z"), // Fri 6pm EDT
        event("2026-10-31T14:00:00Z"), // Sat 10am EDT
        event("2026-10-31T18:00:00Z"), // Sat 2pm EDT
      ],
      "America/New_York",
      NOW,
    );

    expect(groups.map((g) => g.key)).toEqual(["2026-10-30", "2026-10-31", "2026-11-01"]);
    expect(groups[0].events).toHaveLength(1);
    expect(groups[1].events).toHaveLength(2);
    expect(groups[2].events).toHaveLength(1);
  });

  it("keeps a late-night 1am Saturday start grouped under Saturday", () => {
    const groups = groupEventsByDay(
      [event("2026-10-31T05:00:00Z")], // 1am EDT Saturday
      "America/New_York",
      NOW,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("2026-10-31");
  });

  it("attributes an 8pm Saturday start to Saturday even though the UTC instant is Sunday", () => {
    // Sat 8pm EDT = Sun 00:00Z; Fri 11pm EDT = Sat 03:00Z. NY-day grouping
    // puts the evening event with Saturday, not with the Sunday events.
    const groups = groupEventsByDay(
      [
        event("2026-11-01T01:00:00-04:00"), // Sun 1am EDT
        event("2026-10-31T20:00:00-04:00"), // Sat 8pm EDT (UTC Sunday)
        event("2026-11-01T13:00:00Z"), // Sun 9am EDT
        event("2026-10-31T03:00:00Z"), // Fri 11pm EDT (UTC Saturday)
      ],
      "America/New_York",
      NOW,
    );

    expect(groups.map((g) => g.key)).toEqual(["2026-10-30", "2026-10-31", "2026-11-01"]);
    expect(groups[0].events.map((e) => e.id)).toEqual(["evt-2026-10-31T03:00:00Z"]);
    expect(groups[1].events.map((e) => e.id)).toEqual(["evt-2026-10-31T20:00:00-04:00"]);
    expect(groups[2].events).toHaveLength(2);
  });

  it("renders headings from the group's calendar day and is order-independent", () => {
    const input = [event("2026-11-07T19:00:00-05:00"), event("2026-11-06T22:00:00Z")];
    const shuffled = groupEventsByDay([...input].reverse(), "America/New_York", NOW);

    expect(shuffled.map((g) => g.heading)).toEqual(["Friday, Nov 6", "Saturday, Nov 7"]);
  });

  it("prefixes Today and Tomorrow headings relative to now", () => {
    const groups = groupEventsByDay(
      [
        event("2026-10-30T18:00:00-04:00"),
        event("2026-10-31T18:00:00-04:00"),
        event("2026-11-02T18:00:00-05:00"),
      ],
      "America/New_York",
      NOW,
    );

    expect(groups.map((g) => g.heading)).toEqual([
      "Today — Friday, Oct 30",
      "Tomorrow — Saturday, Oct 31",
      "Monday, Nov 2",
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [event("2026-11-01T13:00:00Z"), event("2026-10-30T22:00:00Z")];
    groupEventsByDay(input, "America/New_York", NOW);
    expect(input.map((e) => e.id)).toEqual([
      "evt-2026-11-01T13:00:00Z",
      "evt-2026-10-30T22:00:00Z",
    ]);
  });

  it("returns an empty list for no events", () => {
    expect(groupEventsByDay([], "America/New_York", NOW)).toEqual([]);
  });
});
