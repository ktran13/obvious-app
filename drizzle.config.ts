import { defineConfig } from "drizzle-kit";

import { resolveDatabaseUrl } from "./lib/db/url";

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: resolveDatabaseUrl(),
  },
});
