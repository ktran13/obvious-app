/**
 * Demo seed for local development and the Playwright e2e run. Idempotent:
 * fixed UUIDs + ON CONFLICT DO NOTHING, so re-running never duplicates.
 * Also clears the dev user's saves so e2e always starts from a clean slate.
 *
 * Run: pnpm db:seed
 */
import { eq } from "drizzle-orm";

import { getDb } from "../lib/db";
import { resolveDatabaseUrl } from "../lib/db/url";
import { communities, events, savedItems, sources } from "../lib/db/schema";

// Running outside Next, nothing loads .env.local — try Node's built-in loader,
// then fall back to the shared compose default.
try {
  process.loadEnvFile(".env.local");
} catch {
  // no .env.local — the default below still matches docker-compose
}
process.env.DATABASE_URL ??= resolveDatabaseUrl();

const DEV_USER_ID = "dev-user-001"; // matches lib/auth dev mock user id

const DEMO_SOURCE_SLUG = "demo-luma";

async function main() {
  const db = getDb();

  const [source] = await db
    .insert(sources)
    .values({ slug: DEMO_SOURCE_SLUG, kind: "manual" })
    .onConflictDoUpdate({ target: sources.slug, set: { kind: "manual" } })
    .returning();

  // Starts relative to "now" so the home page's upcoming filter always shows them.
  const day = 24 * 60 * 60 * 1000;
  const start = (offsetDays: number) => new Date(Date.now() + offsetDays * day);

  await db
    .insert(events)
    .values([
      {
        sourceId: source.id,
        externalId: "demo-indie-makers",
        canonicalUrl: "https://lu.ma/indie-makers-nyc",
        title: "Indie Web Makers Meetup",
        description: "Demo listing: show-and-tell for independent makers.",
        startsAt: start(2),
        venue: "Bushman Studios",
        neighborhood: "Bushwick",
        borough: "brooklyn",
        priceType: "free",
      },
      {
        sourceId: source.id,
        externalId: "demo-jazz-corner",
        canonicalUrl: "https://www.eventbrite.com/e/jazz-at-the-corner",
        title: "Jazz at the Corner",
        description: "Demo listing: late-night quartet sets.",
        startsAt: start(3),
        venue: "The Corner Social",
        neighborhood: "Lower East Side",
        borough: "manhattan",
        priceType: "paid",
        priceMin: 2500,
        priceMax: 2500,
      },
      {
        sourceId: source.id,
        externalId: "demo-run-club",
        canonicalUrl: "https://lu.ma/run-club",
        title: "Sunrise Run Club",
        description: "Demo listing: casual 5k, all paces.",
        startsAt: start(4),
        venue: "McCarren Park",
        neighborhood: "Williamsburg",
        borough: "brooklyn",
        priceType: "free",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(communities)
    .values({
      slug: "demo-run-club",
      name: "NYC Run Club",
      description: "Demo community: weekly runs across the boroughs.",
    })
    .onConflictDoNothing();

  // Deterministic e2e starting state: the dev user saves nothing yet.
  await db.delete(savedItems).where(eq(savedItems.userId, DEV_USER_ID));

  console.log("Demo seed applied.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
