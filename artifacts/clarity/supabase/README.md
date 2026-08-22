# Clarity — Supabase Cloud Sync Setup

Follow these steps to enable optional cloud backup and cross-device sync.

---

## Step 1 — Create a free Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in (or create an account).
2. Click **New project**, pick a name (e.g. "clarity"), choose a region close to you, and set a database password.
3. Wait ~2 minutes for the project to finish provisioning.

---

## Step 2 — Authentication

Clarity's trusted API creates a private device identity automatically. No
browser key or anonymous-auth setting is required. Additional devices join the
same private account once with a short-lived code from **Settings → Sync to
another device**.

---

## Step 3 — Run the database schema

1. In your Supabase project, open the left sidebar → **SQL Editor**.
2. Click **New query**.
3. Paste the contents of `supabase/schema.sql` (the file next to this README) into the editor.
4. Click **Run**.

You should see "Success. No rows returned."

---

## Step 4 — Copy your API credentials

1. In your Supabase project, open the left sidebar → **Settings** → **API**.
2. Copy the **Project URL** (looks like `https://xxxx.supabase.co`).
3. Copy the **service_role** key. Treat it as a password: it belongs only in
   Replit Secrets and must never be placed in frontend code or chat.

---

## Step 5 — Add secrets to Replit

1. In your Replit project, open the **Secrets** panel (the lock icon in the left sidebar).
2. Add two secrets:

   | Key | Value |
   |-----|-------|
   | `SUPABASE_URL` | Your Project URL from step 4 |
   | `SUPABASE_SERVICE_KEY` | Your service_role key from step 4 (server-side only — never expose to the browser) |

3. Restart the **API Server** workflow so it picks up the new secret.

---

## Step 6 — Apply schema upgrades and migrate your data

Once the app reloads:

- A **"Migrate my data"** banner will appear at the top of any screen if you have existing local data.
- Tap it to copy your tasks, inbox items, and projects to Supabase.
- Your original local data is **never deleted** — a backup is saved automatically.

Re-run `supabase/schema.sql` when deploying this version. It is idempotent and
adds durable link codes, indexes, completion timestamps, and stale-write
protection to an existing Clarity database.

After migration, every change is queued locally, retried after connectivity
returns, and merged from Supabase on startup, focus, reconnect, and every 30
seconds while the app is visible.

---

## Notes

- Sync is bidirectional and offline-first. The newest timestamp wins; deleted
  items remain as cloud tombstones so another device cannot resurrect them.
- If you clear browser data, cloud data stays intact. Link that browser again
  from an already-authorized device.
- The `clarity_migrated` flag in localStorage prevents duplicate migrations.
