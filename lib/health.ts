import { sql, type SQL } from "drizzle-orm";

export interface HealthCheckResult {
  status: "ok";
  db: true;
}

/** Anything that can run a Drizzle SQL query — the real client in production, a stub in tests. */
export interface DbExecutor {
  execute: (query: SQL) => Promise<unknown>;
}

/** Placeholder probe until the schema task lands: verifies the DB answers a trivial query. */
export async function checkHealth(db: DbExecutor): Promise<HealthCheckResult> {
  await db.execute(sql`select 1`);
  return { status: "ok", db: true };
}
