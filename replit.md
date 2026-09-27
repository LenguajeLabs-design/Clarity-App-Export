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

Mobile-first ADHD task manager app built with React + Vite plus a native Expo client. Local storage provides the offline-first cache; Firebase Authentication and Cloud Firestore provide shared real-time sync.

**Features:**
- **Quick Capture** (`/`) — single-item textarea; "Brain dump mode" for rapid multi-item capture (numbered list, Enter to add lines, batch save to inbox)
- **Inbox Triage** (`/inbox`) — 5-step triage wizard (one item at a time, max 3 choices per screen); area filter bar (All/Work/Home/Family/Personal)
- **Today** (`/today`) — "Pick top 3" interactive priority picker; area filter bar; "Waiting on" section
- **Projects** (`/projects`) — cards with status segmented controls; inline next-action editing
- **Upcoming** (`/upcoming`) — grouped by day using date-fns
- **Review** (`/review`) — 5-step weekly review wizard
- **Settings** (`/settings`) — Appearance, accessibility, JSON import, Google account status, and automatic Firebase sync

**Sync architecture:**
- **Firebase** (background, automatic) — both clients sign in with Google and use the Firebase UID as the shared identity. Records live under `users/{uid}/clarity/{recordId}`. Web and mobile clients subscribe with Firestore `onSnapshot`, write optimistically with `setDoc`, and keep local/offline caches. A record's `kind` field distinguishes items from projects; `isDeleted` tombstones preserve deletes across devices.
- **Mobile client** — the Expo app uses the same Firebase project and canonical UUID-based record format. Both clients sign into the same Google account, so the Firebase UID identifies the shared cloud data. Older phone caches are migrated from timestamp IDs, and pending writes continue from the local cache when the app returns online/active.

**Firebase setup:**
- Enable Google under Firebase Authentication → Sign-in method.
- Create the Firestore database and apply rules scoped to `request.auth.uid`.
- Add the published web domain to Firebase Authentication → Authorized domains.
- Register the web app and add the native iOS/Android OAuth client IDs for Expo builds.

**Secrets needed:**
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` — Firebase web configuration
- `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`, `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `EXPO_PUBLIC_FIREBASE_APP_ID` — same Firebase configuration for Expo
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` — OAuth client IDs used by Expo Google sign-in; client IDs are not secrets

**Import:** Settings accepts localStorage dump format (`clarity_items`, `clarity_projects`) and standard Clarity exports (`{ items, projects, settings, syncedAt }`).

**Theme:** `ThemeSync` component reads `settings.theme` ('light'|'dark'|'auto') and toggles `.dark` class on `<html>`.

**Vite secrets:** `VITE_*` Replit secrets are injected at build time via the `define` block in `vite.config.ts` (reads `process.env.VITE_*`). Must restart Vite after changing secrets.

**localStorage / AsyncStorage keys:** `clarity_items`, `clarity_projects`, `clarity_settings`, `clarity_last_modified`

**Data model key fields on `CapturedItem`:** `waitingOn: string | null`, `nextAction: string | null`, `isPriority: boolean`

**Tech:** React 18, Vite, Tailwind CSS, framer-motion, date-fns, uuid, shadcn/ui, wouter, Firebase JS SDK, Expo AuthSession

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
