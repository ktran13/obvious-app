import { pgEnum } from "drizzle-orm/pg-core";

// free | paid | unknown — the directory's "free" flag is price_type = 'free'.
// Filter params themselves are validated by the shared Zod schema (lib/schemas),
// not by a Postgres enum; this enum only types the stored listing value.
export const priceTypeEnum = pgEnum("price_type", ["free", "paid", "unknown"]);
