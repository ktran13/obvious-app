import { defineConfig } from "@playwright/test";

/**
 * E2E for the auth + save flow and the monetization surfaces. Starts the Next
 * dev server itself with the dev mock provider enabled; requires migrations
 * applied and demo data seeded (pnpm db:migrate && pnpm db:seed). Run: pnpm e2e
 *
 * Point E2E_BASE_URL at an already-running server to skip the webServer.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 0,
  expect: { timeout: 5_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    trace: "on-first-retry",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm dev -p 3100",
        url: "http://localhost:3100",
        reuseExistingServer: true,
        timeout: 120_000,
        env: {
          AUTH_DEV_MOCK: "true",
          AUTH_SECRET: "e2e-only-secret-not-for-production",
        },
      },
  projects: [{ name: "chromium" }],
});
