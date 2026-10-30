/**
 * The curated taxonomy the seed populates and the rest of the app filters on.
 * Slugs match event_tags.tag suffixes ("interest:<slug>", "persona:<slug>")
 * and events.neighborhood / events.borough values.
 */

export const INTERESTS = [
  "tech",
  "arts",
  "music",
  "food",
  "outdoors",
  "wellness",
  "community",
  "family",
  "learning",
  "film",
] as const;
export type InterestSlug = (typeof INTERESTS)[number];

export const PERSONAS = [
  "female",
  "kids",
  "students",
  "seniors",
  "lgbtq",
  "newcomers",
  "professionals",
  "dog-owners",
] as const;
export type PersonaSlug = (typeof PERSONAS)[number];

export const BOROUGHS = ["manhattan", "brooklyn", "queens", "bronx", "staten-island"] as const;
export type BoroughSlug = (typeof BOROUGHS)[number];

export interface Neighborhood {
  slug: string;
  borough: BoroughSlug;
}

/** At least two neighborhoods per borough, citywide spread for the seed. */
export const NEIGHBORHOODS: Neighborhood[] = [
  { slug: "upper-east-side", borough: "manhattan" },
  { slug: "east-village", borough: "manhattan" },
  { slug: "harlem", borough: "manhattan" },
  { slug: "chelsea", borough: "manhattan" },
  { slug: "soho", borough: "manhattan" },
  { slug: "bushwick", borough: "brooklyn" },
  { slug: "park-slope", borough: "brooklyn" },
  { slug: "williamsburg", borough: "brooklyn" },
  { slug: "sunset-park", borough: "brooklyn" },
  { slug: "brooklyn-heights", borough: "brooklyn" },
  { slug: "astoria", borough: "queens" },
  { slug: "long-island-city", borough: "queens" },
  { slug: "downtown-flushing", borough: "queens" },
  { slug: "jackson-heights", borough: "queens" },
  { slug: "south-bronx", borough: "bronx" },
  { slug: "riverdale", borough: "bronx" },
  { slug: "st-george", borough: "staten-island" },
];

export const INTEREST_TAGS: string[] = INTERESTS.map((i) => `interest:${i}`);
export const PERSONA_TAGS: string[] = PERSONAS.map((p) => `persona:${p}`);

/** Prefix guards for seed-time validation — tags must be prefixed slugs. */
export function isValidTag(tag: string): boolean {
  return /^(interest|persona|community):[a-z0-9_-]+$/.test(tag);
}
