/**
 * The saved filter set (Rev 2.1) — one Zod definition, two persistence
 * surfaces: URL search params on /events and the JSON snapshot in
 * user_filter_preferences.filters. `day` (Rev 2.2) accepts a weekday, an ISO
 * date, or the today/tomorrow/weekend presets.
 */
import { z } from "zod";

export const weekdaySchema = z.enum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

export const dayPresetSchema = z.enum(["today", "tomorrow", "weekend"]);

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected an ISO date (YYYY-MM-DD)")
  .refine((s) => !Number.isNaN(Date.parse(`${s}T12:00:00Z`)), "Not a real calendar date");

/** Weekday name, ISO date, or preset — the Rev 2.2 day filter. */
export const dayFilterSchema = z.union([dayPresetSchema, weekdaySchema, isoDateSchema]);
export type DayFilter = z.infer<typeof dayFilterSchema>;

export const whenFilterSchema = z.enum(["today", "tomorrow", "weekend", "week"]);

export const eventFilterSchema = z.strictObject({
  interests: z.array(z.string().min(1).max(64)).max(20).default([]),
  personas: z.array(z.string().min(1).max(64)).max(20).default([]),
  neighborhood: z.string().min(1).max(120).optional(),
  borough: z.string().min(1).max(120).optional(),
  day: dayFilterSchema.optional(),
  when: whenFilterSchema.optional(),
  free: z.boolean().optional(),
});
export type EventFilter = z.infer<typeof eventFilterSchema>;

/** Parses the raw JSON stored in user_filter_preferences.filters. */
export const storedEventFiltersSchema = z
  .string()
  .transform((raw, ctx) => {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      ctx.addIssue({ code: "custom", message: "filters column is not valid JSON" });
      return z.NEVER;
    }
  })
  .pipe(eventFilterSchema);

/**
 * Validates a stored (or in-flight) preference snapshot. Malformed JSON and
 * shape violations both raise ZodError — never trust the column contents.
 */
export function parseStoredEventFilters(json: string): EventFilter {
  return storedEventFiltersSchema.parse(json);
}

export function serializeEventFilters(filters: EventFilter): string {
  return JSON.stringify(eventFilterSchema.parse(filters));
}
