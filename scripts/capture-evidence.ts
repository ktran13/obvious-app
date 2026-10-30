/**
 * Visual dogfood capture for the save flow — before/after screenshots plus a
 * short WebM of the interaction. Standalone script (not a test); run:
 * pnpm tsx scripts/capture-evidence.ts
 * Requires the dev server on :3100 with AUTH_DEV_MOCK=true, and pnpm db:seed.
 */
import { chromium } from "@playwright/test";
import { mkdirSync, readdirSync, renameSync } from "node:fs";

const BASE = "http://localhost:3100";
const OUT = "/home/user/work/evidence";

async function main() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(`${OUT}/video-tmp`, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: `${OUT}/video-tmp`, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();

  // Before: anonymous home — the "Sign in to save" affordance.
  await page.goto(BASE);
  await page.waitForSelector('[data-slot="save-button"]');
  await page.screenshot({ path: `${OUT}/tc-1-before.png`, fullPage: true });

  // Flow: prompt → sign-in page → mock Google sign-in → save → Saved.
  await page.getByRole("button", { name: "Sign in to save" }).first().click();
  await page.waitForURL(/\/signin/);
  await page.locator('[data-slot="dev-sign-in"]').click();
  await page.waitForURL(new RegExp(`${BASE}/$`));
  const save = page.getByRole("button", { name: "Save", exact: true }).first();
  await save.click();
  await page.waitForSelector('[data-state="saved"]');
  await page.screenshot({ path: `${OUT}/tc-1-saved-home.png`, fullPage: true });

  // After: /profile shows the saved item.
  await page.goto(`${BASE}/profile`);
  await page.waitForSelector('[data-slot="saved-event"]');
  await page.screenshot({ path: `${OUT}/tc-1-after.png`, fullPage: true });

  await context.close();
  await browser.close();

  const [video] = readdirSync(`${OUT}/video-tmp`);
  renameSync(`${OUT}/video-tmp/${video}`, `${OUT}/tc-1-flow.webm`);
  console.log("Evidence written to", OUT);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
