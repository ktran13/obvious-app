/**
 * Throwaway-database harness for DB-backed tests. Each caller gets its own
 * Postgres database, created from DATABASE_URL's credentials, migrated with
 * the repo's drizzle migrations, and dropped on dispose — so tests can
 * TRUNCATE freely without destroying shared dev/CI seed data.
 */
import { execSync } from "node:child_process";

import postgres from "postgres";

import { resolveDatabaseUrl } from "./url";

export interface IsolatedTestDb {
  /** Connection string for the throwaway database. */
  url: string;
  /** Closes nothing; drops the database. Call in afterAll. */
  dispose: () => Promise<void>;
}

/** Same host/credentials as DATABASE_URL, pointed at `database`. */
function adminUrl(database: string): string {
  const url = new URL(resolveDatabaseUrl());
  url.pathname = `/${database}`;
  return url.toString();
}

/** Create, migrate, and hand out a throwaway database named `name`. */
export async function createIsolatedTestDb(name: string): Promise<IsolatedTestDb> {
  const admin = postgres(adminUrl("postgres"), { max: 1, connect_timeout: 5 });
  try {
    await admin.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin.unsafe(`CREATE DATABASE ${name}`);
  } finally {
    await admin.end();
  }

  const url = adminUrl(name);
  execSync("pnpm db:migrate", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });

  return {
    url,
    dispose: async () => {
      const cleaner = postgres(adminUrl("postgres"), { max: 1, connect_timeout: 5 });
      try {
        await cleaner.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      } finally {
        await cleaner.end();
      }
    },
  };
}
