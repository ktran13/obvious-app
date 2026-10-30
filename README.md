# NYC Community Discovery

An **anonymous-first aggregator for NYC events and communities**. The app helps
newcomers and long-time residents discover what is happening across the city —
events, community groups, and jobs — by pulling listings from external sources
and linking back to them. You can browse and filter everything without an
account; optional accounts just let you save events, communities, and filter
preferences.

## Stack

- [Next.js 15](https://nextjs.org/) (App Router) + React 19, strict TypeScript
- Tailwind CSS 4 + shadcn/ui
- Drizzle ORM + PostgreSQL
- Auth.js (next-auth v5) with a dev-only mock Google provider
- Vitest + Testing Library, Playwright, Storybook
- pnpm

Portability is a locked decision: **no cloud-provider SDKs** (`@aws-sdk/*`,
`@azure/*`, …) may be added as dependencies — CI enforces this with a
portability gate.

## Quick start

Prerequisites: Node 20+, pnpm (`corepack enable` or `npm i -g pnpm`), and
Docker.

```sh
pnpm install          # install dependencies
docker compose up -d  # start local Postgres 16 on localhost:5432
cp .env.example .env.local
pnpm db:migrate       # apply Drizzle migrations
pnpm db:seed          # seed 300+ curated future events, communities, jobs
pnpm dev              # http://localhost:3000
```

Every step is idempotent — re-running `db:migrate` or `db:seed` never
duplicates data. `GET /api/health` should report `200 { "status": "ok",
"db": true }` once the database is up.

### Scripts

| Script              | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `pnpm dev`          | Start the dev server (Turbopack)                          |
| `pnpm build`        | Production build                                          |
| `pnpm lint`         | ESLint (flat config, Next + Prettier)                     |
| `pnpm typecheck`    | `tsc --noEmit` (strict)                                   |
| `pnpm test`         | Vitest unit tests                                         |
| `pnpm db:migrate`   | Apply pending Drizzle migrations                          |
| `pnpm db:seed`      | Idempotent seed: curated events, communities, jobs, demo  |
| `pnpm db:seed:demo` | Demo seed only (a few events + the dev user's save slate) |
| `pnpm e2e`          | Playwright e2e (starts its own dev server on :3100)       |
| `pnpm format`       | Prettier — write                                          |
| `pnpm format:check` | Prettier — check                                          |

## Environment flags

Copy `.env.example` to `.env.local` and adjust. The flags that gate behavior:

| Flag                | Default | What it does |
| ------------------- | ------- | ------------ |
| `DATABASE_URL`      | compose default (`nyc_app`/`nyc_app@localhost:5432/nyc_app`) | Postgres connection string. |
| `AUTH_SECRET`       | none (required) | Random string signing Auth.js session JWTs (`openssl rand -base64 32`). Dev convenience value in `.env.example`; set a real value wherever the app is deployed. |
| `AUTH_DEV_MOCK`     | unset | **Dev-auth flag.** `true` enables the dev-only mock Google provider: signs in a single deterministic user (`dev-user-001` / "Dev User") with no external calls, so the save flow works locally without OAuth credentials. Works **only outside production** — both gates (the env flag AND non-production) are load-bearing; never set it in a deployed environment. For real Google OAuth, unset it and set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` instead. |
| `MEETUP_ENABLED`    | unset (disabled) | Ingestion flag. When truthy (`1`/`true`/`yes`, case-insensitive) the Meetup GraphQL adapter makes real network calls during sync; any other value keeps it disabled with **zero network calls**. Disabled by default because Meetup API credentials are not part of the repo. |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Canonical origin for SEO surfaces — JSON-LD urls, `/sitemap.xml` entries, and the sitemap pointer in `/robots.txt`. Set it to the deployed origin in production. |

## Authentication

Auth.js (next-auth v5) with the Drizzle adapter over the
`users` / `accounts` / `sessions` tables; sessions are JWTs. Browsing is
anonymous-first: nothing requires an account, and the only redirect to sign-in
is on `/profile` and inside the save button's prompt state.

See the environment-flag table above for the `AUTH_DEV_MOCK` dev-auth flag and
the real-Google-OAuth path.

## SEO surfaces

- **`/events/[id]`** — full event listing with schema.org Event JSON-LD built
  from the same row as the rendered listing (name, startDate, location,
  offers with price/free).
- **`/sitemap.xml`** — generated per request from the static discovery routes
  plus every live event detail page and community page. Listings the
  directory would no longer render (started, ended, or past their takedown
  cutoff) are excluded.
- **`/robots.txt`** — allows crawlers on public pages; disallows `/profile`,
  `/signin`, `/api/`, and the tracked `/go` redirects.

## E2E (Playwright)

```sh
pnpm db:migrate && pnpm db:seed
pnpm e2e   # boots a dev server on :3100 with AUTH_DEV_MOCK=true
```

`e2e/auth-save.spec.ts` covers the full save flow: anonymous save click →
sign-in prompt → mock sign-in → save succeeds → item visible on `/profile` →
unsave removes it. It also asserts that signed-out `/profile` redirects to
sign-in while `/` stays auth-free. `e2e/seo.spec.ts` covers the SEO surfaces
above (JSON-LD/listing match, sitemap, robots).

## CI

GitHub Actions runs on every push and PR: the portability gate (fails if
`@aws-sdk/*` or `@azure/*` appears in `package.json`), then migrations, a
Drizzle drift check, lint, typecheck, tests, Storybook build, production
build, seed, and Playwright e2e against a Postgres 16 service.
