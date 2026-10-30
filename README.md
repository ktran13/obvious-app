# NYC Community Discovery

An **anonymous-first aggregator for NYC events and communities**. The app helps
newcomers and long-time residents discover what is happening across the city —
events, community groups, and (later) jobs — by pulling listings from external
sources and linking back to them. You can browse and filter everything without
an account; optional accounts just let you save events, communities, and filter
preferences.

This repository is currently at the **scaffold** stage: app bootstrap, tooling,
CI, and local setup. Feature work (schema, seeding, discovery UI, ingestion)
lands in follow-up tasks.

## Stack

- [Next.js 15](https://nextjs.org/) (App Router) + React 19, strict TypeScript
- Tailwind CSS 4 + shadcn/ui
- Drizzle ORM + PostgreSQL
- Vitest
- pnpm

Portability is a locked decision: **no cloud-provider SDKs** (`@aws-sdk/*`,
`@azure/*`, …) may be added as dependencies — CI enforces this with a
portability gate.

## Local setup

Prerequisites: Node 20+, pnpm (`corepack enable` or `npm i -g pnpm`), and
Docker.

```sh
pnpm install          # install dependencies
docker compose up -d  # start local Postgres 16 on localhost:5432
cp .env.example .env.local
pnpm dev              # http://localhost:3000
```

### Scripts

| Script              | What it does                          |
| ------------------- | ------------------------------------- |
| `pnpm dev`          | Start the dev server (Turbopack)      |
| `pnpm build`        | Production build                      |
| `pnpm lint`         | ESLint (flat config, Next + Prettier) |
| `pnpm typecheck`    | `tsc --noEmit` (strict)               |
| `pnpm test`         | Vitest unit tests                     |
| `pnpm db:seed`      | Idempotent demo seed (source, events, one community) |
| `pnpm e2e`          | Playwright e2e (starts its own dev server on :3100) |
| `pnpm format`       | Prettier — write                      |
| `pnpm format:check` | Prettier — check                      |

### Database

`docker-compose.yml` runs `postgres:16` with the credentials `.env.example`
points to (`nyc_app` / `nyc_app`, db `nyc_app`, port `5432`).

`GET /api/health` reports whether the database answers a probe query: `200
{ "status": "ok", "db": true }` when it does, `503 { "status": "error", "db":
false }` when it does not.

## Authentication

Auth.js (next-auth v5) with the Drizzle adapter over the existing
`users` / `accounts` / `sessions` tables; sessions are JWTs. Browsing is
anonymous-first: nothing requires an account, and the only redirect to sign-in
is on `/profile` and inside the save button's prompt state.

Two provider modes, selected by environment:

- **Real Google OAuth** — set `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`.
  This is the production path; no OAuth secrets exist in dev.
- **Dev-only mock Google provider** — set `AUTH_DEV_MOCK=true` outside
  production. Signs in a single deterministic user (`dev-user-001` / "Dev
  User") with no external calls, so the save flow works end-to-end locally
  without OAuth credentials. Both gates (the env flag AND non-production) are
  load-bearing — never set `AUTH_DEV_MOCK` in a deployed environment.

## E2E (Playwright)

```sh
pnpm db:migrate && pnpm db:seed
pnpm e2e   # boots a dev server on :3100 with AUTH_DEV_MOCK=true
```

`e2e/auth-save.spec.ts` covers the full save flow: anonymous save click →
sign-in prompt → mock sign-in → save succeeds → item visible on `/profile` →
unsave removes it. It also asserts that signed-out `/profile` redirects to
sign-in while `/` stays auth-free.

## CI

GitHub Actions runs on every push and PR: the portability gate (fails if
`@aws-sdk/*` or `@azure/*` appears in `package.json`), then lint, typecheck,
tests, and build.
