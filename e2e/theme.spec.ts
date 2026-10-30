import { expect, test } from "@playwright/test";

/**
 * Photocopy night theme e2e (deliverable 5). Fresh contexts per test mean
 * clean localStorage — the system-preference default is asserted against a
 * genuinely empty store.
 */

test("toggle switches to dark and persists across reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveClass(/dark/);

  await page.getByRole("button", { name: "Toggle dark mode" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.reload();
  // Persisted choice, applied by the inline no-flash script before paint.
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.getByRole("button", { name: "Toggle dark mode" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("system dark preference is the default with clean storage", async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: "dark" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await context.close();
});

test("system light preference stays light with clean storage", async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: "light" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await context.close();
});

test("no flash of wrong theme: the class is set at DOMContentLoaded", async ({ page }) => {
  // Dark choice stored, then a fresh load — the inline script must have the
  // class on before any app script runs.
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle dark mode" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(
    await page.evaluate(() => document.documentElement.classList.contains("dark")),
  ).toBe(true);
});
