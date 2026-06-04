# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `artifacts/clarity` (`@workspace/clarity`)

Mobile-first ADHD task manager app built with React + Vite. Primary storage is localStorage; Supabase and GitHub provide optional cloud sync.

**Features:**
- **Quick Capture** (`/`) — single-item textarea; "Brain dump mode" for rapid multi-item capture (numbered list, Enter to add lines, batch save to inbox)
- **Inbox Triage** (`/inbox`) — 5-step triage wizard (one item at a time, max 3 choices per screen); area filter bar (All/Work/Home/Family/Personal)
- **Today** (`/today`) — "Pick top 3" interactive priority picker; area filter bar; "Waiting on" section
- **Projects** (`/projects`) — cards with status segmented controls; inline next-action editing
- **Upcoming** (`/upcoming`) — grouped by day using date-fns
- **Review** (`/review`) — 5-step weekly review wizard
- **Settings** (`/settings`) — Appearance (Light/Auto/Dark theme), 3 accessibility toggles, Import data (JSON file upload), GitHub sync, Supabase sync

**Sync architecture:**
- **Supabase** (background, automatic) — all DB writes go through `POST /api/clarity/sync` on the API server. The server uses `VITE_SUPABASE_ANON_KEY` (service_role JWT) to write with service_role (bypasses RLS). The browser calls `POST /api/clarity/auth` once on startup to create a real Supabase auth user (satisfies FK constraint on `user_id`); the returned UUID is cached in `clarity_supabase_user_id` in localStorage. No browser-side Supabase client calls DB directly. Tables: `clarity_items`, `clarity_projects`.
- **GitHub** (user-triggered) — stores `clarity-data.json` in a private repo; latest-write-wins; PAT with Contents read+write permission.

**API server sync endpoints** (`artifacts/api-server/src/routes/clarity-sync.ts`):
- `POST /api/clarity/auth` — creates Supabase user via admin API using service_role key; returns `{ userId }` (UUID cached client-side)
- `POST /api/clarity/sync` — accepts `{ userId, items?, projects? }`, upserts to Supabase
- `GET /api/clarity/sync/count/:userId` — returns `{ items, projects }` counts for migration verification

**Secrets needed:**
- `SUPABASE_URL` — the project URL (https://xxx.supabase.co) — server-side only, never exposed to the browser
- `SUPABASE_SERVICE_KEY` — the service_role JWT key (used server-side only; NOT exposed to browser)

**Import:** Settings page has a JSON importer that handles localStorage dump format (`clarity_items`, `clarity_projects` keys) and GitHub sync format (`{ items, projects, settings, syncedAt }`).

**Theme:** `ThemeSync` component reads `settings.theme` ('light'|'dark'|'auto') and toggles `.dark` class on `<html>`.

**Vite secrets:** `VITE_*` Replit secrets are injected at build time via the `define` block in `vite.config.ts` (reads `process.env.VITE_*`). Must restart Vite after changing secrets.

**localStorage keys:** `clarity_items`, `clarity_projects`, `clarity_settings`, `clarity_github_config`, `clarity_github_backup`, `clarity_last_modified`, `clarity_migrated`, `clarity_supabase_auth`

**Data model key fields on `CapturedItem`:** `waitingOn: string | null`, `nextAction: string | null`, `isPriority: boolean`

**Tech:** React 18, Vite, Tailwind CSS, framer-motion, date-fns, uuid, shadcn/ui, wouter, @supabase/supabase-js v2.100+

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
