# Clarity GitHub Pages migration

The web app can run on GitHub Pages using the existing Firebase project. Brain Dump has been removed; ordinary capture, tasks, projects, review, settings, Google sign-in, and Firestore sync remain. The Express server, Supabase, PostgreSQL, and Expo build are not deployed by this workflow.

## Deployment

- Migration branch: `codex/github-pages-migration`, based on production-source commit `8f0f4ac`.
- Pages source: **GitHub Actions**, using `.github/workflows/clarity-pages.yml`.
- Expected site: https://lenguajelabs-design.github.io/Clarity-App-Export/
- The workflow intentionally deploys the migration branch only. Change its branch trigger to `main` after the migration is verified and the changes are reviewed.
- Build: `pnpm --filter @workspace/clarity run build`.
- Publish only `artifacts/clarity/dist/public`, never repository attachments, backups, or server files.
- Build base: `BASE_PATH=/Clarity-App-Export/`.
- All seven non-root routes get physical `index.html` entry pages. Wouter accepts their trailing slashes, preserving direct navigation and refresh without a 404 redirect or hash URLs.
- The manifest and icons work beneath the project path. Unknown routes use the app's not-found screen.

The six `VITE_FIREBASE_*` web configuration values are supplied through GitHub repository **variables**. These identify the public Firebase web app; they are not service-account credentials. Actual server credentials, access tokens, and personal backups must never be committed or put in frontend variables. `.env.example` lists the required fields without an API key.

Keep project `my-notes-e2010` and auth domain `my-notes-e2010.firebaseapp.com`. No database migration is needed. The workflow rejects a different Firebase project or auth domain.

## Authentication approval

Before Google sign-in can be tested, obtain the owner's approval to add **`lenguajelabs-design.github.io`** under Firebase Authentication → Settings → Authorized domains. Keep the existing Replit domain. This authorization applies to the hostname, not `/Clarity-App-Export/`.

Do not change deployed Firestore rules, API-key restrictions, Google OAuth configuration, or App Check enforcement without first inspecting the current configuration and explaining any necessary change. The repository rules are UID-scoped and do not restrict the hosting domain, but the deployed rules have not been verified.

## Backups and imports

Settings → **Export My Data** downloads a version 1 `clarity-backup` JSON file. It includes an export timestamp, all task and project records (including completion and deletion states), IDs, relationships, user edit times, and appearance settings. It exports explicit model fields and excludes authentication state and unknown keys.

Existing `{ items, projects, settings }` exports, localStorage dumps, and raw task arrays remain accepted. Imports validate record types, timestamps, dates, and duplicate IDs before any mutation. Unknown versions and invalid files are rejected.

Selecting a file only opens a preview. Confirmation downloads the current browser's recovery backup before replacing its local data and uploading imported records. Imports do **not** delete cloud records absent from the file; those records may return through sync. Matching IDs can be overwritten. Large cloud uploads occur in batches and are not atomic across batches. A failed upload is reported as incomplete instead of a successful import.

Never test imports against the owner's real Google account. Use synthetic data and an isolated browser profile/test account in the existing Firebase project. Local cache keys are not separated by account. No new project or database is required for these tests.

Normal startup waits for a server snapshot before preparing initial uploads and does not upload unchanged records. A fresh browser with empty storage has nothing to upload or delete. Recovery is disabled until cloud loading finishes and the device has records; it also requires an explicit confirmation because it can mark cloud-only records deleted.

## Verification before using Pages as the daily app

- [ ] Owner approves and authorizes the GitHub hostname.
- [ ] Compare the new and existing sites using the same Google account: active tasks, completed tasks, deleted records, and projects. Compare IDs and representative timestamps, priorities, next actions, and project links.
- [ ] Export a complete independent JSON backup after cloud loading finishes and verify its record counts. Separately preserve any unsynced data and local-only settings on the old device/origin.
- [ ] Confirm Google sign-in on desktop and mobile.
- [ ] Create a clearly labeled disposable test task, edit it, and complete it. Verify the same ID and changes on a second browser/device, including the existing Replit client.
- [ ] Test disconnection, an offline edit, and reconnection. Confirm the acknowledged cloud record on another device. The app has data caches but no service worker, so a fresh offline page load is not guaranteed.
- [ ] Open and refresh `/Clarity-App-Export/today/`, `/inbox/`, `/projects/`, `/upcoming/`, `/review/`, `/done/`, and `/settings/` under the same project base. Check navigation and mobile layout.
- [ ] Verify an export download and an import round trip with synthetic data only. Test invalid files and cancellation without changing data.
- [ ] Confirm production assets contain no active Replit API, Supabase sync, or AI parsing dependency.
- [ ] Keep the old Replit deployment operational throughout an agreed observation period.
- [ ] Record any deployed Firebase rule/domain restrictions and inspect actual Firebase usage/billing.

## Checks available in the repository

`pnpm --filter @workspace/clarity run test` exercises synthetic export/import round trips, legacy formats, invalid files, secret-field exclusion, timestamps and relationships, tombstones, empty-browser merges, and stale-client conflicts. No test contacts Firebase.

The Pages workflow also builds in Linux, checks TypeScript, checks each static route and referenced asset, and scans the built JavaScript for the removed backend dependencies. Existing workspace overrides target Linux build binaries; a Mac build may need its platform binaries installed separately. The migration does not change the dependency lockfile to work around that existing configuration.

## Rollback and eventual Replit retirement

During testing, return to https://adhd-focus-hub.replit.app/today if the new frontend fails. A previous successful Pages deployment can also be redeployed from its commit. Keep the migration branch separate from `main` until verification is complete.

Both sites share Firestore. Returning to the old URL does not undo cloud writes. Keep the independent JSON backups; inspect a backup before any explicit restore. Never run recovery from an empty or incomplete device.

Only after every verification item passes: stop the old Replit deployment manually; inspect deployment, database, storage, and other usage charges; cancel an unnecessary Core subscription; and retain the account, source archive, and backups temporarily. Do not delete the Replit project, cancel subscriptions, change production DNS, or shut down deployments automatically.
