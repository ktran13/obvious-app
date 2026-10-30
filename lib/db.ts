import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Lazily created so importing this module never opens a connection or throws
// at import time (unit tests import the health route without a database).
let client: postgres.Sql | undefined;

function getClient(): postgres.Sql {
  if (!client) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set — copy .env.example to .env.local (see README).");
    }
    client = postgres(connectionString, { max: 1, connect_timeout: 5 });
  }
  return client;
}

export function getDb(): PostgresJsDatabase<Record<string, never>> {
  return drizzle(getClient());
}
