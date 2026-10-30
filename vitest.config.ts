import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  test: {
    projects: [
      // Backend / pure-node tests (no DOM).
      {
        test: {
          name: "node",
          environment: "node",
          include: ["**/*.test.ts"],
          exclude: ["node_modules/**", ".next/**", "storybook-static/**"],
        },
      },
      // Component tests (jsdom + Testing Library).
      {
        plugins: [react()],
        test: {
          name: "ui",
          environment: "jsdom",
          include: ["**/*.test.tsx"],
          setupFiles: ["./vitest.setup.ts"],
          exclude: ["node_modules/**", ".next/**", "storybook-static/**"],
        },
      },
    ],
    // DB-backed test files (schema, saves) TRUNCATE shared tables in the one
    // compose/CI Postgres; running them in parallel truncates each other's
    // fixtures mid-test. Serializing files keeps that shared state safe.
    fileParallelism: false,
  },
});
