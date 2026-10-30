/**
 * Shared connection-string resolution.
 *
 * The default matches docker-compose.yml and .env.example so that
 * `pnpm db:migrate` / `pnpm db:check` / tests work with no manual steps
 * against a fresh compose database. Production/CI supply DATABASE_URL.
 */
export const DEFAULT_DATABASE_URL = "postgresql://nyc_app:nyc_app@localhost:5432/nyc_app";

export function resolveDatabaseUrl(): string {
  return process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
}
