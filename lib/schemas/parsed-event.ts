/**
 * The adapter-contract event shape: fetchRaw() → normalize() → ParsedEvent[],
 * Zod-validated before insert. Ingestion tasks map a source's raw payload to
 * this shape; the DB insert resolves sourceId from `sourceSlug`.
 */
import { z } from "zod";

export const priceTypeSchema = z.enum(["free", "paid", "unknown"]);

/** "interest:tech" | "persona:female" | "persona:kids" — matches event_tags.tag. */
export const eventTagSchema = z
  .string()
  .regex(/^(interest|persona):[a-z0-9_-]+$/, 'Tags are prefixed slugs like "interest:tech"');

export const parsedEventSchema = z
  .object({
    sourceSlug: z.string().min(1).max(120),
    externalId: z.string().min(1).max(512),
    canonicalUrl: z.url(),
    title: z.string().min(1).max(300),
    description: z.string().max(5000).optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date().optional(),
    venue: z.string().max(300).optional(),
    neighborhood: z.string().max(120).optional(),
    borough: z.string().max(120).optional(),
    priceType: priceTypeSchema.default("unknown"),
    priceMin: z.number().int().min(0).optional(), // cents
    priceMax: z.number().int().min(0).optional(), // cents
    affiliateUrl: z.url().optional(),
    expiresAt: z.coerce.date().optional(),
    tags: z.array(eventTagSchema).max(50).default([]),
  })
  .refine((e) => !e.endsAt || e.endsAt.getTime() >= e.startsAt.getTime(), {
    message: "endsAt must not be before startsAt",
    path: ["endsAt"],
  });

export type ParsedEvent = z.infer<typeof parsedEventSchema>;

export function parseParsedEvent(value: unknown): ParsedEvent {
  return parsedEventSchema.parse(value);
}
