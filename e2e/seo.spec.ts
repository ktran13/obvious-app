import { expect, test } from "@playwright/test";

/**
 * SEO acceptance: the event detail page renders the full listing with
 * schema.org Event JSON-LD whose fields match the visible listing exactly;
 * /sitemap.xml lists live event and community URLs; /robots.txt excludes
 * /profile. Requires migrations applied and seeds run
 * (pnpm db:migrate && pnpm db:seed).
 */

const NY_TIME = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  minute: "2-digit",
});

type EventJsonLd = {
  "@type": string;
  name: string;
  startDate: string;
  location?: { "@type": string; name?: string; address?: string };
  offers?: { "@type": string; price?: string; isAccessibleForFree?: boolean };
};

test("event detail JSON-LD matches the rendered listing", async ({ page }) => {
  await page.goto("/events");
  await expect(page.locator('[data-slot="event-card"]').first()).toBeVisible();

  // Follow the in-app detail link from the first directory card.
  await page.locator('[data-slot="event-card"] a[href^="/events/"]').first().click();
  await expect(page).toHaveURL(/\/events\/[0-9a-f-]{36}$/i);

  const jsonLdRaw = await page.locator('script[data-slot="event-jsonld"]').textContent();
  expect(jsonLdRaw).toBeTruthy();
  const jsonLd = JSON.parse(jsonLdRaw!) as EventJsonLd;

  // name matches the visible heading.
  await expect(page.getByRole("heading", { name: jsonLd.name })).toBeVisible();
  expect(jsonLd["@type"]).toBe("Event");
  expect(jsonLd.name).toBeTruthy();

  // startDate matches the rendered wall-clock time in the product timezone.
  expect(jsonLd.startDate).toBeTruthy();
  const renderedTime = await page.locator('[data-slot="event-detail-time"]').textContent();
  expect(renderedTime?.trim()).toBe(NY_TIME.format(new Date(jsonLd.startDate)).trim());

  // location matches the rendered venue.
  const renderedVenue = await page.locator('[data-slot="event-detail-venue"]').textContent();
  expect(renderedVenue?.trim()).toBeTruthy();
  expect(jsonLd.location?.name).toBe(renderedVenue?.trim());

  // offers matches the rendered price: free → price 0 + isAccessibleForFree,
  // paid → the displayed dollar amount.
  const renderedPrice = (await page
    .locator('[data-slot="event-detail-price"]')
    .textContent())!.trim();
  expect(jsonLd.offers).toBeTruthy();
  if (renderedPrice === "Free") {
    expect(jsonLd.offers!.price).toBe("0.00");
    expect(jsonLd.offers!.isAccessibleForFree).toBe(true);
  } else {
    expect(jsonLd.offers!.price).toBe(renderedPrice.replace("$", "") + ".00");
  }

  // Standard meta tags describe the same listing.
  await expect(page).toHaveTitle(new RegExp(`${jsonLd.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
});

test("unknown event ids render the not-found page", async ({ page }) => {
  const response = await page.goto("/events/00000000-0000-0000-0000-000000000000");
  expect(response?.status()).toBe(404);
});

test("/sitemap.xml lists event, community, and static URLs", async ({ page }) => {
  const response = await page.goto("/sitemap.xml");
  expect(response?.status()).toBe(200);

  const body = (await response!.text()).toLowerCase();
  expect(body).toContain("<urlset");
  // Seeded data guarantees live events and communities exist.
  expect(body).toContain("/events/");
  expect(body).toContain("/communities/");
  expect(body).toContain("<loc>http://localhost:3000/events</loc>");
  expect(body).toContain("<loc>http://localhost:3000/jobs</loc>");
});

test("/robots.txt excludes /profile and the auth surfaces", async ({ page }) => {
  const response = await page.goto("/robots.txt");
  expect(response?.status()).toBe(200);

  const body = await response!.text();
  expect(body).toContain("User-Agent: *");
  expect(body).toContain("Allow: /");
  expect(body).toContain("Disallow: /profile");
  expect(body).toContain("Disallow: /signin");
  expect(body).toContain("Disallow: /api/");
  expect(body).toContain("Sitemap: http://localhost:3000/sitemap.xml");
});
