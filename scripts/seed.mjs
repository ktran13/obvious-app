/**
 * Idempotent dev/CI seed: a curated source, a few events (one affiliate,
 * one canonical-only) for the /go redirect surface, and job postings for
 * the /jobs board. Safe to re-run — events upsert on (source_id,
 * external_id); postings insert only when title+company are absent.
 *
 * Run: pnpm db:seed  (DATABASE_URL from the environment or .env.local)
 */
import { readFileSync } from "node:fs";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) process.env[match[1]] ??= match[2];
    }
  } catch {
    // No .env.local — DATABASE_URL must come from the environment.
  }
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — copy .env.example to .env.local.");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

function daysFromNow(days, hourNY) {
  // Noon-ish on a future day, expressed as an absolute instant.
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000 + (hourNY - 12) * 60 * 60 * 1000);
}

const [source] = await sql`
  INSERT INTO sources (slug, kind)
  VALUES ('curated', 'manual')
  ON CONFLICT (slug) DO UPDATE SET kind = EXCLUDED.kind
  RETURNING id
`;

const events = [
  {
    // Fixed ids so e2e can hit /go/<id> directly.
    id: "11111111-1111-4111-8111-111111111111",
    externalId: "curated-rooftop-film-night",
    title: "Rooftop Film Night — Williamsburg",
    description: "Outdoor screening of a classic NYC film, blankets provided.",
    startsAt: daysFromNow(2, 19),
    venue: "William Vale Rooftop",
    neighborhood: "Williamsburg",
    borough: "Brooklyn",
    priceType: "paid",
    priceMin: 1800,
    priceMax: 1800,
    affiliateUrl: "https://partner.example.com/rooftop-film-night?ref=nycdiscover",
    canonicalUrl: "https://luma.example.com/rooftop-film-night",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    externalId: "curated-prospect-park-cleanup",
    title: "Prospect Park Volunteer Cleanup",
    description: "Lend a hand with trail upkeep; gloves and bags supplied.",
    startsAt: daysFromNow(4, 10),
    venue: "Prospect Park Picnic House",
    neighborhood: "Park Slope",
    borough: "Brooklyn",
    priceType: "free",
    priceMin: null,
    priceMax: null,
    affiliateUrl: null,
    canonicalUrl: "https://nycparks.example.com/events/prospect-park-cleanup",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    externalId: "curated-les-food-crawl",
    title: "Lower East Side Food Crawl",
    description: "Five stops, five tastings, one walking tour of the old neighborhood.",
    startsAt: daysFromNow(6, 15),
    venue: "Essex Street Market",
    neighborhood: "Lower East Side",
    borough: "Manhattan",
    priceType: "paid",
    priceMin: 3500,
    priceMax: 3500,
    affiliateUrl: "https://tastemaker.example.com/les-food-crawl?aff=nycdiscover",
    canonicalUrl: "https://partiful.example.com/les-food-crawl",
  },
];

for (const e of events) {
  await sql`
    INSERT INTO events
      (id, source_id, external_id, canonical_url, title, description, starts_at,
       venue, neighborhood, borough, price_type, price_min, price_max, affiliate_url)
    VALUES
      (${e.id}, ${source.id}, ${e.externalId}, ${e.canonicalUrl}, ${e.title}, ${e.description},
       ${e.startsAt}, ${e.venue}, ${e.neighborhood}, ${e.borough}, ${e.priceType},
       ${e.priceMin}, ${e.priceMax}, ${e.affiliateUrl})
    ON CONFLICT (source_id, external_id) DO UPDATE SET
      canonical_url = EXCLUDED.canonical_url,
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      starts_at = EXCLUDED.starts_at,
      venue = EXCLUDED.venue,
      neighborhood = EXCLUDED.neighborhood,
      borough = EXCLUDED.borough,
      price_type = EXCLUDED.price_type,
      price_min = EXCLUDED.price_min,
      price_max = EXCLUDED.price_max,
      affiliate_url = EXCLUDED.affiliate_url
  `;
}

const jobs = [
  {
    title: "Senior Frontend Engineer",
    company: "Brooklyn Brickworks",
    description: "Next.js and React for a civic-tech studio of twelve.",
    applyUrl: "https://jobs.example.com/brooklyn-brickworks/senior-frontend-engineer",
    interestSlug: "tech",
  },
  {
    title: "Data Engineer, Open Data",
    company: "CivicSignal",
    description: "Pipelines for open city datasets; SQL-first, dbt-friendly.",
    applyUrl: "https://jobs.example.com/civicsignal/data-engineer-open-data",
    interestSlug: "tech",
  },
  {
    title: "Gallery Coordinator",
    company: "Bushwick Open Studios",
    description: "Exhibit logistics and artist liaison for a volunteer-run space.",
    applyUrl: "https://jobs.example.com/bushwick-open-studios/gallery-coordinator",
    interestSlug: "arts",
  },
  {
    title: "Seasonal Urban Forestry Associate",
    company: "CityCanopy Collective",
    description: "Street-tree stewardship and volunteer crew coordination.",
    applyUrl: "https://jobs.example.com/citycanopy/urban-forestry-associate",
    interestSlug: "outdoors",
  },
  {
    title: "Pastry Cook (AM shift)",
    company: "Sunset Sourdough",
    description: "Viennoiserie production in a Sunset Park bakery.",
    applyUrl: "https://jobs.example.com/sunset-sourdough/pastry-cook",
    interestSlug: "food",
  },
  {
    title: "Afterschool STEM Instructor",
    company: "RoboWorks Brooklyn",
    description: "Lead weekly robotics sessions for grades 3-8.",
    applyUrl: "https://jobs.example.com/roboworks/afterschool-stem-instructor",
    interestSlug: "education",
  },
];

for (const j of jobs) {
  await sql`
    INSERT INTO job_postings (title, company, description, apply_url, interest_slug)
    SELECT ${j.title}, ${j.company}, ${j.description}, ${j.applyUrl}, ${j.interestSlug}
    WHERE NOT EXISTS (
      SELECT 1 FROM job_postings
      WHERE title = ${j.title} AND company = ${j.company}
    )
  `;
}

const eventCount = await sql`SELECT count(*)::int AS n FROM events`;
const jobCount = await sql`SELECT count(*)::int AS n FROM job_postings`;
console.log(
  `Seeded: ${eventCount[0].n} events, ${jobCount[0].n} job postings.`,
);
await sql.end();
