# Ingestion

Source adapters and the seed pipeline. Everything flows through one contract:

```
adapter.fetchRaw()  →  adapter.normalize(raw)  →  parsedEventSchema (Zod)  →  upsert
```

- **fetchRaw** is the only place I/O happens (HTTP for Luma/Meetup, disk for
  CSV). A source whose `isEnabled()` gate returns false is skipped before
  `fetchRaw` runs — disabled sources make no network calls.
- **normalize** is a pure mapping from one raw item to a `ParsedEventInput`.
- **Validation gate** (`lib/ingest/validate.ts`): every normalized item is
  validated against the shared `parsedEventSchema` (`lib/schemas/parsed-event.ts`).
  Malformed items are collected as rejections (with Zod issue messages and the
  item index/row number) and logged — they are **never partially inserted**.
- **Upsert** (`lib/ingest/sync.ts`): dedupe key is `(source_id, external_id)`
  (enforced by a unique index); re-running a sync **updates in place** and
  never duplicates. Staleness follows the schema semantics: an event is stale
  when `now > expires_at` **or** the event has already ended
  (`ends_at ?? starts_at <= now`). `isEventStale()` is the shared predicate;
  the seed skips stale fixtures, and the directory query layer uses it for
  takedown/exclusion.

## Adapters

| Adapter        | File                    | Raw items                       | Notes |
|----------------|-------------------------|---------------------------------|-------|
| Luma iCal      | `adapters/luma-ical.ts` | VEVENT blocks from an iCal export | Set `calendarUrl` or `LUMA_CALENDAR_URL`. RFC 5545 reader in `adapters/ical-text.ts`. Recurrence is out of scope — Luma exports one concrete VEVENT per occurrence. |
| Manual CSV     | `adapters/csv.ts`       | Data rows of a CSV file         | See CSV schema below. Default source slug `freenyc`. |
| Meetup GraphQL | `adapters/meetup.ts`    | GraphQL `events.edges[].node`   | **Disabled by default.** Enabled only when `MEETUP_ENABLED=true`; disabled mode makes no network calls. |

Canonical URLs always link out to the source; the directory never re-hosts
listings. Long descriptions are truncated to 5000 characters (the schema cap)
rather than dropping the event.

## Manual CSV schema

The header row is required; column order does not matter. Required columns:
`external_id`, `title`, `canonical_url`, `starts_at`. All others optional.

| Column            | Format | Notes |
|-------------------|--------|-------|
| `external_id`     | nonempty text | Stable at the source; dedupe key with the source slug. |
| `title`           | 1–300 chars | |
| `canonical_url`   | absolute URL | Where the listing lives. |
| `description`     | ≤ 5000 chars | Facts only — no expressive third-party copy. |
| `starts_at`       | ISO 8601 | Explicit offset (`-05:00`), `Z`, or a naive local time (read as America/New_York). |
| `ends_at`         | ISO 8601 or empty | Optional. |
| `venue`           | text | |
| `neighborhood`    | slug | e.g. `bushwick`, `sunset-park`. |
| `borough`         | slug | `manhattan` \| `brooklyn` \| `queens` \| `bronx` \| `staten-island`. |
| `price_type`      | `free` \| `paid` \| `unknown` | Empty = `unknown`; any other value rejects the row. |
| `price_min_cents` | integer ≥ 0 | Cents; empty when free/unknown. |
| `price_max_cents` | integer ≥ 0 | Cents. |
| `affiliate_url`   | absolute URL or empty | Empty → canonical link-out only. |
| `expires_at`      | ISO 8601 or empty | Hard staleness cutoff for takedown. |
| `tags`            | `;`-separated | Prefixed slugs: `interest:tech`, `persona:kids`. Unknown prefixes reject the row. |

Example rows live in `fixtures/manual-events.csv`; deliberately broken rows
in `fixtures/manual-events-malformed.csv` are covered by tests.

## Seeding

`pnpm db:seed` (against a fresh **migrated** Postgres) loads curated fixture
data — no bulk scraping:

- **Sources** — `luma-nyc` (ical), `freenyc` (manual), `curated` (manual),
  `meetup` (api, disabled).
- **Events** — several hundred future-dated listings expanded deterministically
  from curated templates (`seed/fixtures.ts`) across all interest categories,
  persona tags, and neighborhoods. External ids are derived from the template,
  week, and weekday, so re-running the seed updates in place — the event count
  and the `(source_id, external_id)` set are identical after every run.
- **Communities / organizers** — upserted by slug.
- **Job postings** — keyed by `apply_url`; re-runs only add what is missing.

See `seed/taxonomy.ts` for the interest / persona / neighborhood taxonomy the
rest of the app filters on.

## Test data

`fixtures/` holds committed, hand-written fixtures used by the Vitest suites:
real RFC 5545 iCal feeds (valid + malformed) and CSV files (valid + malformed).
No test hits the network.
