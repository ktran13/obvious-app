/** URL-param parsing and mapping tests — pure, no database. */
import { describe, expect, it } from "vitest";

import {
  filtersToEventPath,
  filtersToSearchParams,
  formatSlugLabel,
  parseEventFilterParams,
  hasExplicitFilterParams,
  savedFiltersToEventFilters,
  toEventFilter,
} from "./params";

describe("parseEventFilterParams", () => {
  it("parses every supported param", () => {
    expect(
      parseEventFilterParams({
        interest: "music",
        persona: "kids",
        when: "weekend",
        day: "2026-11-07",
        free: "1",
        n: "bushwick",
      }),
    ).toEqual({
      interests: ["music"],
      persona: "kids",
      when: "weekend",
      day: "2026-11-07",
      freeOnly: true,
      neighborhoods: ["bushwick"],
    });
  });

  it("accepts weekday names and presets for ?day", () => {
    expect(parseEventFilterParams({ day: "saturday" }).day).toBe("saturday");
    expect(parseEventFilterParams({ day: "today" }).day).toBe("today");
    expect(parseEventFilterParams({ day: "weekend" }).day).toBe("weekend");
  });

  it("drops invalid values instead of erroring — browsing never 400s", () => {
    const parsed = parseEventFilterParams({
      interest: "Not A Slug!",
      persona: "x".repeat(65),
      when: "someday",
      day: "fakeday",
      n: "",
    });
    expect(parsed).toEqual({
      interests: [],
      persona: null,
      when: null,
      day: null,
      freeOnly: false,
      neighborhoods: [],
    });
  });

  it("accepts over-range ISO dates the shared schema lets through, rolling over gracefully", () => {
    // Pre-existing quirk (PR #4): V8's Date.parse accepts 2026-02-30 as Mar 2,
    // so isoDateSchema's "real calendar date" refine never fires. The
    // directory resolves such values to the rolled-over day — no crash.
    expect(parseEventFilterParams({ day: "2026-02-30" }).day).toBe("2026-02-30");
  });

  it("handles bare and explicit free flags", () => {
    expect(parseEventFilterParams({ free: "" }).freeOnly).toBe(true);
    expect(parseEventFilterParams({ free: "1" }).freeOnly).toBe(true);
    expect(parseEventFilterParams({ free: "true" }).freeOnly).toBe(true);
    expect(parseEventFilterParams({ free: "0" }).freeOnly).toBe(false);
    expect(parseEventFilterParams({ free: "false" }).freeOnly).toBe(false);
    expect(parseEventFilterParams({}).freeOnly).toBe(false);
  });

  it("takes the first value of repeated params", () => {
    expect(parseEventFilterParams({ interest: ["music", "arts"] }).interests).toEqual(["music"]);
  });
});

describe("filtersToSearchParams / filtersToEventPath", () => {
  it("round-trips filters through the canonical param names", () => {
    const filters = parseEventFilterParams({
      interest: "music",
      persona: "kids",
      day: "saturday",
      free: "1",
      n: "astoria",
    });
    expect(filtersToEventPath(filters)).toBe(
      "/events?interest=music&persona=kids&day=saturday&free=1&n=astoria",
    );
    expect(parseEventFilterParams(Object.fromEntries(filtersToSearchParams(filters)))).toEqual(
      filters,
    );
  });

  it("omits empty filters entirely", () => {
    expect(filtersToEventPath(parseEventFilterParams({}))).toBe("/events");
  });
});

describe("toEventFilter", () => {
  it("maps the UI filter shape onto the query-layer shape", () => {
    expect(
      toEventFilter({
        interests: ["music"],
        persona: "kids",
        when: "week",
        day: null,
        freeOnly: true,
        neighborhoods: ["bushwick"],
      }),
    ).toEqual({
      interests: ["music"],
      personas: ["kids"],
      neighborhood: "bushwick",
      day: undefined,
      when: "week",
      free: true,
    });
  });

  it("keeps an explicit all-clear filter empty", () => {
    const filter = toEventFilter({
      interests: [],
      persona: null,
      when: null,
      day: null,
      freeOnly: false,
      neighborhoods: [],
    });
    expect(filter).toEqual({
      interests: [],
      personas: [],
      neighborhood: undefined,
      day: undefined,
      when: undefined,
      free: undefined,
    });
  });
});

describe("formatSlugLabel", () => {
  it("prettifies taxonomy slugs", () => {
    expect(formatSlugLabel("dog-owners")).toBe("Dog owners");
    expect(formatSlugLabel("lgbtq")).toBe("Lgbtq");
  });
});

describe("hasExplicitFilterParams", () => {
  it("detects every filter param as an explicit deep link", () => {
    for (const key of ["interest", "persona", "when", "day", "free", "n"]) {
      expect(hasExplicitFilterParams({ [key]: "x" })).toBe(true);
    }
  });

  it("is false for a bare /events visit, so saved prefs may pre-apply", () => {
    expect(hasExplicitFilterParams({})).toBe(false);
    expect(hasExplicitFilterParams({ page: "2" })).toBe(false);
  });
});

describe("savedFiltersToEventFilters", () => {
  it("maps the stored shape onto the FilterBar shape", () => {
    expect(
      savedFiltersToEventFilters({
        interests: ["music"],
        personas: ["professionals"],
        neighborhood: "bushwick",
        day: "2026-11-07",
        when: "week",
        free: true,
      }),
    ).toEqual({
      interests: ["music"],
      persona: "professionals",
      when: "week",
      day: "2026-11-07",
      freeOnly: true,
      neighborhoods: ["bushwick"],
    });
  });

  it("renders an all-clear saved set as defaults", () => {
    expect(savedFiltersToEventFilters({ interests: [], personas: [] })).toEqual({
      interests: [],
      persona: null,
      when: null,
      day: null,
      freeOnly: false,
      neighborhoods: [],
    });
  });
});
