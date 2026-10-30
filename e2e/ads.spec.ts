import { expect, test } from "@playwright/test";

test("ad slot renders on the homepage and /jobs", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-slot='ad-slot']")).toBeVisible();

  await page.goto("/jobs");
  await expect(page.locator("[data-slot='ad-slot']")).toBeVisible();
});
