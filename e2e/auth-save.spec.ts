import { expect, test } from "@playwright/test";

/**
 * The binding acceptance flow: anonymous save click → sign-in prompt →
 * mock sign-in → save succeeds → item visible on /profile → unsave removes it.
 * Requires demo data seeded: pnpm db:seed:demo.
 */

const EVENT_TITLE = "Indie Web Makers Meetup";

test.describe.configure({ mode: "serial" });

test("anonymous save click prompts sign-in, mock sign-in, save, profile, unsave", async ({
  page,
}) => {
  await page.goto("/");

  // Anonymous default: the save affordance is the sign-in prompt itself.
  const prompt = page.getByRole("button", { name: "Sign in to save" }).first();
  await expect(prompt).toBeVisible();
  await prompt.click();

  // Clicking the prompt is the only redirect in the browse surface.
  await expect(page).toHaveURL(/\/signin/);
  await page.locator('[data-slot="dev-sign-in"]').click();

  // Back on home, signed in — the same card now offers a plain Save.
  await expect(page).toHaveURL(/localhost:\d+\/$/);
  const save = page.getByRole("button", { name: "Save", exact: true }).first();
  await expect(save).toBeVisible();
  await save.click();
  await expect(page.getByRole("button", { name: "Saved" }).first()).toBeVisible();

  // The saved item shows on /profile…
  await page.goto("/profile");
  const savedRow = page.locator('[data-slot="saved-event"]', { hasText: EVENT_TITLE });
  await expect(savedRow).toBeVisible();
  await expect(page.locator('[data-slot="identity"]')).toContainText("Dev User");

  // …and unsave removes it.
  await savedRow.getByRole("button", { name: "Saved" }).click();
  await expect(page.locator('[data-slot="saved-event"]', { hasText: EVENT_TITLE })).toBeHidden();
});

test("signed-out /profile redirects to sign-in; browse stays auth-free", async ({ page }) => {
  await page.context().clearCookies();

  await page.goto("/profile");
  await expect(page).toHaveURL(/\/signin\?next=/);

  // Anonymous-first browsing: home renders with no redirect and full content.
  await page.goto("/");
  await expect(page).toHaveURL(/localhost:\d+\/$/);
  await expect(page.getByText("Upcoming in NYC")).toBeVisible();
});
