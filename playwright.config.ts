import { defineConfig } from "@playwright/test";

/**
 * E2E for the auth + save flow. Starts the Next dev server itself with the
 * dev mock provider enabled; requires migrations applied and demo data
 * seeded (pnpm db:migrate && pnpm db:seed:demo). Run: pnpm e2e
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm dev -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      AUTH_DEV_MOCK: "true",
      AUTH_SECRET: "e2e-only-secret-not-for-production",
    },
  },
});
