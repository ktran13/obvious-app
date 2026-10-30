/**
 * Source adapter contract — fetchRaw() → normalize() → ParsedEvent[].
 *
 * An adapter owns one external source (Luma calendar, manual CSV drop,
 * Meetup GraphQL). `fetchRaw` is the only place network/disk I/O may happen;
 * `normalize` is a pure mapping from one raw item to an unvalidated
 * ParsedEventInput. The pipeline (ingestSource) runs every normalized item
 * through the shared Zod contract (lib/schemas/parsed-event.ts) before any
 * insert — malformed items are rejected and logged, never partially inserted.
 */
import type { z } from "zod";

import type { parsedEventSchema } from "../schemas/parsed-event";

/** The unvalidated output of an adapter's normalize() — pipeline input. */
export type ParsedEventInput = z.input<typeof parsedEventSchema>;

/** Minimal logger seam so the pipeline can run in scripts and tests. */
export interface IngestLogger {
  warn(message: string): void;
  error(message: string): void;
}

export interface SourceAdapter<TRaw = unknown> {
  /** Stable slug matching sources.slug (e.g. "luma-nyc", "freenyc", "meetup"). */
  readonly sourceSlug: string;

  /**
   * Optional enablement gate. When it returns false the pipeline skips the
   * adapter entirely — fetchRaw is never called, so a disabled source makes
   * no network (or disk) calls by construction.
   */
  isEnabled?(): boolean;

  /** Transport: fetch the source's payload and split it into raw items. */
  fetchRaw(): Promise<TRaw[]>;

  /** Pure mapping from one raw item to a ParsedEventInput (unvalidated). */
  normalize(raw: TRaw): ParsedEventInput;
}

/** A normalized item that failed parsedEventSchema validation. */
export interface RejectedItem {
  /** Position of the item in fetchRaw's output (0-based). */
  index: number;
  /** Human-readable Zod issue summaries ("path: message"). */
  issues: string[];
  raw: unknown;
}

export interface IngestResult<TRaw = unknown> {
  sourceSlug: string;
  /** Number of raw items fetchRaw produced (0 when skipped). */
  fetched: number;
  /** True when the adapter's isEnabled gate skipped the source. */
  skipped: boolean;
  /** Zod-validated events, safe to upsert. */
  accepted: z.output<typeof parsedEventSchema>[];
  rejected: RejectedItem[];
  raw: TRaw[];
}
