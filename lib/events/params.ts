/**
 * URL-param mapping for the /events directory.
 *
 * Search params are the one filter surface (Rev 2.3: URL filters override
 * saved preferences): ?interest, ?persona, ?when, ?day, ?free, ?n
 * (neighborhood). Parsing is fail-open — a malformed or unknown value is
 * ignored, never a 400, so browsing never breaks on a hand-typed URL.
 */
import {
  dayFilterSchema,
  eventFilterSchema,
  whenFilterSchema,
  type EventFilter,
} from "@/lib/schemas/event-filters";

import type { EventFilters } from "@/components/events/types";

/** Next's searchParams page prop shape. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

/** Tag-shaped filter values (interest/persona slugs, neighborhood slugs). */
const SLUG_PATTERN = /^[a-z0-9_-]{1,64}$/;

function firstValue(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  const trimmed = first?.trim();
  return trimmed ? trimmed : undefined;
}

function firstSlug(value: string | string[] | undefined): string | undefined {
  const raw = firstValue(value)?.toLowerCase();
  return raw && SLUG_PATTERN.test(raw) ? raw : undefined;
}

/** Bare ?free means true; ?free=0 and ?free=false mean false. */
function isFlagOn(value: string | string[] | undefined): boolean {
  if (value === undefined) return false;
  const raw = (Array.isArray(value) ? value[0] : value)?.toLowerCase();
  return raw !== "0" && raw !== "false";
}

/**
 * Parse /events search params into the FilterBar's filter shape. Unknown or
 * invalid values are dropped silently — the directory degrades to fewer
 * filters, never an error page.
 */
export function parseEventFilterParams(params: RawSearchParams): EventFilters {
  const day = firstValue(params.day);
  const when = firstValue(params.when);

  return {
    interests: firstSlug(params.interest) ? [firstSlug(params.interest) as string] : [],
    persona: firstSlug(params.persona) ?? null,
    when: when && whenFilterSchema.safeParse(when).success ? when : null,
    day: day && dayFilterSchema.safeParse(day).success ? day : null,
    freeOnly: isFlagOn(params.free),
    neighborhoods: firstSlug(params.n) ? [firstSlug(params.n) as string] : [],
  };
}

/** Inverse of parseEventFilterParams — the canonical /events query string. */
export function filtersToSearchParams(filters: EventFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.interests[0]) params.set("interest", filters.interests[0]);
  if (filters.persona) params.set("persona", filters.persona);
  if (filters.when) params.set("when", filters.when);
  if (filters.day) params.set("day", filters.day);
  if (filters.freeOnly) params.set("free", "1");
  if (filters.neighborhoods[0]) params.set("n", filters.neighborhoods[0]);
  return params;
}

/** The /events URL for a filter set — used by the homepage cards and the client FilterBar. */
export function filtersToEventPath(filters: EventFilters): string {
  const query = filtersToSearchParams(filters).toString();
  return query ? `/events?${query}` : "/events";
}

/**
 * Map the UI filter shape onto the validated query-layer shape. The Zod
 * schema normalizes defaults and rejects anything malformed before SQL sees it.
 */
export function toEventFilter(filters: EventFilters) {
  return eventFilterSchema.parse({
    interests: filters.interests,
    personas: filters.persona ? [filters.persona] : [],
    neighborhood: filters.neighborhoods[0],
    day: filters.day ?? undefined,
    when: filters.when ?? undefined,
    free: filters.freeOnly || undefined,
  });
}

/** Query keys that make a /events URL an explicit filter deep link. */
const FILTER_PARAM_KEYS = ["interest", "persona", "when", "day", "free", "n"] as const;

/**
 * True when the URL carries any explicit filter param. Rev 2.3 precedence:
 * a URL with explicit params is a deep link — it wins over saved preferences
 * wholesale; saved preferences only pre-apply when the URL names no filters.
 */
export function hasExplicitFilterParams(params: RawSearchParams): boolean {
  return FILTER_PARAM_KEYS.some((key) => params[key] !== undefined);
}

/**
 * Saved-preference shape → the FilterBar's UI shape (the storage path inverse
 * of toEventFilter). Pure mapping, so the directory can render the saved set
 * through the exact same controls the URL path uses.
 */
export function savedFiltersToEventFilters(saved: EventFilter): EventFilters {
  return {
    interests: saved.interests,
    persona: saved.personas[0] ?? null,
    when: saved.when ?? null,
    day: saved.day ?? null,
    freeOnly: saved.free ?? false,
    neighborhoods: saved.neighborhood ? [saved.neighborhood] : [],
  };
}

/** "dog-owners" → "Dog owners" — display labels for taxonomy slugs. */
export function formatSlugLabel(slug: string): string {
  const words = slug.split("-").filter(Boolean);
  if (words.length === 0) return "";
  const [first, ...rest] = words;
  const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
  return [capitalize(first), ...rest.map((word) => word.toLowerCase())].join(" ");
}
