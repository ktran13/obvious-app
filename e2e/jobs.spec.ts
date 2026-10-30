import { expect, test } from "@playwright/test";

// Seed contract (scripts/seed.mjs): at least 6 postings across 5 interests,
// two of them tagged "tech". The board may show extra rows if other dev
// data exists, so counts are lower bounds.

test.describe("/jobs board", () => {
  test("renders seeded postings with apply links", async ({ page }) => {
    await page.goto("/jobs");

    await expect(page.getByRole("heading", { name: "Jobs" })).toBeVisible();
    const cards = page.locator("[data-slot='job-posting']");
    expect(await cards.count()).toBeGreaterThanOrEqual(6);

    // Title + company: the title alone is not unique across dev data.
    const frontend = cards
      .filter({ hasText: "Senior Frontend Engineer" })
      .filter({ hasText: "Brooklyn Brickworks" });
    await expect(frontend).toHaveCount(1);
    const apply = frontend.getByRole("link", { name: /Apply/ });
    await expect(apply).toHaveAttribute(
      "href",
      "https://jobs.example.com/brooklyn-brickworks/senior-frontend-engineer",
    );
    // Application links are not affiliate links — no sponsored marker.
    await expect(apply).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("filters by interest via the chips", async ({ page }) => {
    await page.goto("/jobs");

    await page
      .getByRole("navigation", { name: "Filter by interest" })
      .getByRole("link", { name: "tech" })
      .click();

    await expect(page).toHaveURL(/\/jobs\?interest=tech$/);
    const cards = page.locator("[data-slot='job-posting']");
    expect(await cards.count()).toBeGreaterThanOrEqual(2);

    // Every visible posting carries the selected interest badge.
    const badges = cards.locator("span", { hasText: /^tech$/ });
    expect(await badges.count()).toBe(await cards.count());
  });

  test("shows an empty state for an interest with no postings", async ({ page }) => {
    await page.goto("/jobs?interest=nonexistent");
    await expect(page.getByText("No postings for this interest yet")).toBeVisible();
  });
});
