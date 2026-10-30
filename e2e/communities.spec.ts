import { expect, test } from "@playwright/test";

/**
 * Communities surfaces: the /communities directory renders seeded organizers
 * with aggregated upcoming-event counts, /communities/[slug] renders a
 * seeded community with its upcoming events grouped by day, the save
 * affordance follows the PR #6 auth/save flow (prompt when anonymous, saves
 * when signed in), and unknown slugs 404. Requires migrations + curated
 * seed: pnpm db:migrate && pnpm db:seed.
 */

const COMMUNITY_NAME = "Chelsea Wellness Co-op";
const COMMUNITY_PATH = "/communities/chelsea-wellness-coop";

test("directory renders seeded communities with upcoming counts", async ({ page }) => {
  await page.goto("/communities");

  // Seeded organizers appear with aggregated activity.
  const card = page.locator('[data-slot="community-card"]', { hasText: COMMUNITY_NAME });
  await expect(card).toBeVisible();
  await expect(card.locator('[data-slot="community-upcoming"]')).toContainText(
    /upcoming event/,
  );
  // Communities with no seeded series render too.
  await expect(
    page.locator('[data-slot="community-card"]', { hasText: "FreeNYC Volunteers" }),
  ).toContainText("No upcoming events");

  // The header links the directory from the shared nav.
  await expect(page.locator('[data-slot="nav-communities"]')).toBeVisible();
});

test("detail page renders a seeded community with its upcoming events", async ({ page }) => {
  await page.goto("/communities");
  await page.locator('[data-slot="community-card"]', { hasText: COMMUNITY_NAME }).click();
  await expect(page).toHaveURL(new RegExp(`${COMMUNITY_PATH}$`));

  await expect(page.locator('[data-slot="community-header"]')).toContainText(COMMUNITY_NAME);
  // Aggregated events reuse the day-group + event-card presentation.
  await expect(page.locator('[data-slot="day-group"]').first()).toBeVisible();
  await expect(page.locator('[data-slot="event-card"]').first()).toBeVisible();
  // Link-out to the organizer's own page, never re-hosted.
  await expect(page.getByRole("link", { name: /Visit organizer's page/ })).toBeVisible();
});

test("unknown slug renders 404", async ({ page }) => {
  const response = await page.goto("/communities/not-a-real-community");
  expect(response?.status()).toBe(404);
});

test("save affordance prompts when anonymous and saves when signed in", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto(COMMUNITY_PATH);

  // Anonymous: the save affordance is the sign-in prompt itself.
  const prompt = page.getByRole("button", { name: "Sign in to save" }).first();
  await expect(prompt).toBeVisible();
  await prompt.click();
  await expect(page).toHaveURL(/\/signin/);

  // Dev mock sign-in returns to the community page.
  await page.locator('[data-slot="dev-sign-in"]').click();
  await expect(page).toHaveURL(new RegExp(`${COMMUNITY_PATH}$`));

  const save = page.getByRole("button", { name: "Save", exact: true }).first();
  await expect(save).toBeVisible();
  await save.click();
  await expect(page.getByRole("button", { name: "Saved" }).first()).toBeVisible();

  // The saved community shows on /profile.
  await page.goto("/profile");
  await expect(
    page.locator('[data-slot="saved-community"]', { hasText: COMMUNITY_NAME }),
  ).toBeVisible();
});
