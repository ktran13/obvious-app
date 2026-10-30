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
  },
});
