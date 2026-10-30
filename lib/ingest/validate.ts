/**
 * The single validation gate between adapters and the database.
 *
 * Every normalized item must pass parsedEventSchema before it can be
 * upserted. Items that fail are collected (with their issues) and logged —
 * never silently dropped, never partially inserted.
 */
import { parsedEventSchema, type ParsedEvent } from "../schemas/parsed-event";
import type { IngestLogger, IngestResult, RejectedItem, SourceAdapter } from "./types";

const defaultLogger: IngestLogger = {
  warn: (message) => console.warn(message),
  error: (message) => console.error(message),
};

/** Validate a batch of normalized candidates; rejections are logged, not thrown. */
export function validateParsedEvents(
  sourceSlug: string,
  candidates: unknown[],
  logger: IngestLogger = defaultLogger,
): { accepted: ParsedEvent[]; rejected: RejectedItem[] } {
  const accepted: ParsedEvent[] = [];
  const rejected: RejectedItem[] = [];

  candidates.forEach((candidate, index) => {
    const result = parsedEventSchema.safeParse(candidate);
    if (result.success) {
      accepted.push(result.data);
      return;
    }
    const issues = result.error.issues.map(
      (issue) => `${issue.path.length ? issue.path.join(".") : "(root)"}: ${issue.message}`,
    );
    rejected.push({ index, issues, raw: candidate });
    logger.warn(
      `[${sourceSlug}] rejected item #${index} — ${issues.join("; ")}; item keys: ${typeof candidate === "object" && candidate !== null ? Object.keys(candidate).join(",") : String(candidate).slice(0, 80)}`,
    );
  });

  return { accepted, rejected };
}

/**
 * Run one adapter end to end: fetchRaw() → normalize() → Zod validation.
 * A source whose isEnabled() gate returns false is skipped before fetchRaw —
 * no I/O happens for disabled sources.
 */
export async function ingestSource<TRaw>(
  adapter: SourceAdapter<TRaw>,
  logger: IngestLogger = defaultLogger,
): Promise<IngestResult<TRaw>> {
  if (adapter.isEnabled && !adapter.isEnabled()) {
    return {
      sourceSlug: adapter.sourceSlug,
      fetched: 0,
      skipped: true,
      accepted: [],
      rejected: [],
      raw: [],
    };
  }

  const raw = await adapter.fetchRaw();
  const { accepted, rejected } = validateParsedEvents(
    adapter.sourceSlug,
    raw.map((item) => adapter.normalize(item)),
    logger,
  );

  return {
    sourceSlug: adapter.sourceSlug,
    fetched: raw.length,
    skipped: false,
    accepted,
    rejected,
    raw,
  };
}
