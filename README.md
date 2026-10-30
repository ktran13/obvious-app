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
| `pnpm format`       | Prettier — write                      |
| `pnpm format:check` | Prettier — check                      |

### Database

`docker-compose.yml` runs `postgres:16` with the credentials `.env.example`
points to (`nyc_app` / `nyc_app`, db `nyc_app`, port `5432`).

`GET /api/health` reports whether the database answers a probe query: `200
{ "status": "ok", "db": true }` when it does, `503 { "status": "error", "db":
false }` when it does not.

> **Note:** `db:migrate` and `db:seed` scripts land in follow-up tasks, along
> with the Drizzle schema and migrations.

## CI

GitHub Actions runs on every push and PR: the portability gate (fails if
`@aws-sdk/*` or `@azure/*` appears in `package.json`), then lint, typecheck,
tests, and build.
