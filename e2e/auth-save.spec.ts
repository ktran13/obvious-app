import { expect, test } from "@playwright/test";

/**
 * The binding acceptance flow: anonymous save click → sign-in prompt →
 * mock sign-in → save succeeds → item visible on /profile → unsave removes it.
 * Works against any seed: it saves the first homepage card and asserts on
 * that event's actual title (the curated seed pushes the demo event below
 * the homepage's 12-event fold).
 */

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

  // Back on home, signed in — save the first card and remember which event
  // it was, so the profile assertion follows whatever the seed shows.
  await expect(page).toHaveURL(/localhost:\d+\/$/);
  const firstCard = page.locator('[data-slot="event-card"]').first();
  const eventTitle = (await firstCard.locator("h3").textContent())?.trim();
  expect(eventTitle).toBeTruthy();
  const save = firstCard.getByRole("button", { name: "Save", exact: true });
  await expect(save).toBeVisible();
  await save.click();
  await expect(page.getByRole("button", { name: "Saved" }).first()).toBeVisible();

  // The saved item shows on /profile…
  await page.goto("/profile");
  const savedRow = page.locator('[data-slot="saved-event"]', {
    hasText: eventTitle as string,
  });
  await expect(savedRow).toBeVisible();
  await expect(page.locator('[data-slot="identity"]')).toContainText("Dev User");

  // …and unsave removes it.
  await savedRow.getByRole("button", { name: "Saved" }).click();
  await expect(
    page.locator('[data-slot="saved-event"]', { hasText: eventTitle as string }),
  ).toBeHidden();
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
