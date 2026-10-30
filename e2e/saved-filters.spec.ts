import { expect, test, type Page } from "@playwright/test";

/**
 * Saved-filter acceptance flow (Rev 2.3). Requires migrations applied and
 * seeds run (pnpm db:migrate && pnpm db:seed). The dev mock provider signs in
 * the same deterministic user on every session, which is exactly what the
 * pre-apply test needs: a fresh browser session, same user row.
 */

test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/signin");
  await page.locator('[data-slot="dev-sign-in"]').click();
  await expect(page.locator('[data-slot="nav-user"]')).toContainText("Dev User");
}

/**
 * A fresh browser session for the same persisted user: brand-new context
 * (no cookies) signed back in through the dev mock, which always resolves to
 * the deterministic dev-user-001 row — exactly the "fresh session visit" the
 * pre-apply criterion describes.
 */
async function freshSessionPage(browser: import("@playwright/test").Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page);
  return page;
}

/**
 * Wait for the server to re-render with the latest URL filters before the
 * next interaction: the FilterBar builds the next URL from the props it
 * re-renders with, so back-to-back changes race. Polling on server-rendered
 * results (like events-directory.spec does) proves the commit landed.
 */
async function expectResultsReflectFilters(
  page: Page,
  opts: { maxDayGroups?: boolean; allFree?: boolean },
) {
  const cards = page.locator('[data-slot="event-card"]');
  if (opts.maxDayGroups) {
    await expect
      .poll(async () => page.locator("[data-day-group]").count(), { timeout: 15_000 })
      .toBeLessThanOrEqual(1);
  }
  if (opts.allFree) {
    await expect
      .poll(
        async () => {
          const texts = await cards.allTextContents();
          return texts.length > 0 && texts.every((t) => t.includes("Free"));
        },
        { timeout: 15_000 },
      )
      .toBe(true);
  }
}

test("signed-in: save → fresh session pre-applies → URL wins → re-save → clear", async ({
  page,
  browser,
}) => {
  await signIn(page);
  await page.goto("/events");

  // Defensive cleanup so a failed earlier run can't poison this one.
  const staleClear = page.getByRole("button", { name: "Clear saved filters" });
  if (await staleClear.isVisible().catch(() => false)) {
    await staleClear.click();
    await expect(staleClear).toBeHidden();
  }

  await page.getByLabel("Day", { exact: true }).selectOption("today");
  await expect(page).toHaveURL(/\/events\?.*day=today/);
  await expectResultsReflectFilters(page, { maxDayGroups: true });
  await page.getByLabel("Free only", { exact: true }).click();
  await expect(page).toHaveURL(/free=1/);
  await expectResultsReflectFilters(page, { allFree: true });

  // Save the current URL filter set.
  await page.getByRole("button", { name: "Save as my filters" }).click();
  await expect(page.getByRole("button", { name: "Clear saved filters" })).toBeVisible();

  // Fresh session, bare /events: the saved set pre-applies server-side, with
  // the URL staying clean.
  const fresh = await freshSessionPage(browser);
  await fresh.goto("/events");
  await expect(fresh).toHaveURL(/\/events$/);
  await expect(fresh.getByLabel("Day", { exact: true })).toHaveValue("today");
  await expect(fresh.getByLabel("Free only", { exact: true })).toBeChecked();

  // Explicit URL params override saved preferences on deep links — wholesale,
  // not merged: this deep link names only a neighborhood, so day resets.
  await fresh.goto("/events?n=bushwick");
  await expect(fresh.getByLabel("Neighborhood", { exact: true })).toHaveValue("bushwick");
  await expect(fresh.getByLabel("Day", { exact: true })).toHaveValue("");
  await expect(fresh.getByLabel("Free only", { exact: true })).not.toBeChecked();

  // Changing a filter navigates with explicit params (URL wins over saved),
  // and re-saving snapshots the new set. ("tomorrow" stays a single-day
  // window, so the day-group poll remains deterministic — "weekend" spans
  // Sat+Sun by design.)
  await page.getByLabel("Day", { exact: true }).selectOption("tomorrow");
  await expect(page).toHaveURL(/\/events\?.*day=tomorrow/);
  await expect(page).toHaveURL(/free=1/);
  await expectResultsReflectFilters(page, { maxDayGroups: true });
  await page.getByRole("button", { name: "Update saved filters" }).click();

  const fresh2 = await freshSessionPage(browser);
  await fresh2.goto("/events");
  await expect(fresh2.getByLabel("Day", { exact: true })).toHaveValue("tomorrow");
  await expect(fresh2.getByLabel("Free only", { exact: true })).toBeChecked();

  // Clearing deletes the saved row — back to URL-only defaults.
  await page.getByRole("button", { name: "Clear saved filters" }).click();
  await expect(page.getByRole("button", { name: "Clear saved filters" })).toBeHidden();

  const fresh3 = await freshSessionPage(browser);
  await fresh3.goto("/events");
  await expect(fresh3.getByLabel("Day", { exact: true })).toHaveValue("");
  await expect(fresh3.getByLabel("Free only", { exact: true })).not.toBeChecked();
});

test("signed-out: no saved-filter control anywhere on /events", async ({ browser }) => {
  // Genuinely signed out: a fresh context that never signs in.
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("/events");
  await expect(page).toHaveURL(/\/events$/);
  await expect(page.locator('[data-slot="save-my-filters"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save as my filters" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Clear saved filters" })).toHaveCount(0);

  // Signed-out stays URL-only: filters still work through params.
  await page.getByLabel("Day", { exact: true }).selectOption("today");
  await expect(page).toHaveURL(/\/events\?.*day=today/);
  await expect(page.locator('[data-slot="save-my-filters"]')).toHaveCount(0);
});
