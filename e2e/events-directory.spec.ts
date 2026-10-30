import { expect, test } from "@playwright/test";

/**
 * Directory acceptance flow. Requires migrations applied and seeds run
 * (pnpm db:migrate && pnpm db:seed && pnpm db:seed:demo). The curated seed
 * stores neighborhoods as lowercase slugs, matching the URL filter values.
 */

test("anonymous browsing renders the directory with no auth wall", async ({ page }) => {
  await page.goto("/events");

  // No redirect: the URL stays on the directory.
  await expect(page).toHaveURL(/\/events$/);
  await expect(page.getByRole("heading", { name: "Events in NYC" })).toBeVisible();

  // Ad placement lives on the directory.
  await expect(page.locator('[data-slot="ad-slot"]').first()).toBeVisible();

  // Anonymous-first: cards render, and the save affordance is a sign-in
  // prompt rather than a gate.
  await expect(page.locator('[data-slot="event-card"]').first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in to save" }).first()).toBeVisible();
});

test("filters update the URL and the results together", async ({ page }) => {
  await page.goto("/events");

  // Neighborhood filter → URL param AND cards all belong to it.
  await page.getByLabel("Neighborhood", { exact: true }).selectOption("bushwick");
  await expect(page).toHaveURL(/\/events\?.*n=bushwick/);
  const cards = page.locator('[data-slot="event-card"]');
  await expect(cards.first()).toBeVisible();
  await expect
    .poll(async () => {
      const texts = await cards.allTextContents();
      return texts.length > 0 && texts.every((t) => t.toLowerCase().includes("bushwick"));
    })
    .toBe(true);

  // Free-only compounds with the neighborhood. The checkbox is controlled by
  // the URL, so assert the navigation outcome rather than instant state.
  await page.getByLabel("Free only", { exact: true }).click();
  await expect(page).toHaveURL(/\/events\?.*free=1/);
  await expect(page.getByLabel("Free only", { exact: true })).toBeChecked();
  await expect
    .poll(async () => {
      const texts = await cards.allTextContents();
      return texts.length > 0 && texts.every((t) => t.includes("Free"));
    })
    .toBe(true);

  // Clearing the checkbox drops the param.
  await page.getByLabel("Free only", { exact: true }).click();
  await expect(page).not.toHaveURL(/free=1/);
});

test("day filter narrows results to a single NY calendar day", async ({ page }) => {
  await page.goto("/events");

  await page.getByLabel("Day", { exact: true }).selectOption("today");
  await expect(page).toHaveURL(/\/events\?.*day=today/);

  // A single-day window can yield at most one day group (or the empty state).
  const groups = page.locator("[data-day-group]");
  const count = await groups.count();
  expect(count).toBeLessThanOrEqual(1);
});

test("day headings render in ascending date order", async ({ page }) => {
  await page.goto("/events");

  const keys = await page
    .locator("[data-day-group]")
    .evaluateAll((els) => els.map((el) => el.getAttribute("data-day-group")));
  expect(keys.length).toBeGreaterThan(0);
  expect([...keys].sort()).toEqual(keys); // ISO keys sort as dates
});

test("FilterBar reflects the active URL state on load", async ({ page }) => {
  await page.goto("/events?interest=music&persona=professionals&when=week&free=1&n=bushwick");

  await expect(page.getByLabel("Interest", { exact: true })).toHaveValue("music");
  await expect(page.getByLabel("Persona", { exact: true })).toHaveValue("professionals");
  await expect(page.getByLabel("When", { exact: true })).toHaveValue("week");
  await expect(page.getByLabel("Free only", { exact: true })).toBeChecked();
  await expect(page.getByLabel("Neighborhood", { exact: true })).toHaveValue("bushwick");
});

test("homepage highlights tonight and weekend with persona entry points", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Tonight" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "This weekend" })).toBeVisible();
  await expect(page.locator('[data-slot="ad-slot"]').first()).toBeVisible();

  // A persona entry card links into the filtered directory.
  const entry = page.locator('[data-slot="persona-entry"]').first();
  await expect(entry).toBeVisible();
  const href = await entry.getAttribute("href");
  expect(href).toMatch(/^\/events\?persona=/);
});
