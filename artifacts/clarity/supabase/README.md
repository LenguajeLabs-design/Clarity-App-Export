# Clarity — Supabase Cloud Sync Setup

Follow these steps to enable optional cloud backup and cross-device sync.

---

## Step 1 — Create a free Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in (or create an account).
2. Click **New project**, pick a name (e.g. "clarity"), choose a region close to you, and set a database password.
3. Wait ~2 minutes for the project to finish provisioning.

---

## Step 2 — Enable Anonymous Auth

1. In your Supabase project, open the left sidebar → **Authentication** → **Providers**.
2. Find **Anonymous sign-ins** and toggle it **on**.
3. Click **Save**.

This lets Clarity sign in silently without asking you for an email or password.

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
3. Copy the **anon / public** key (a long JWT string).

---

## Step 5 — Add secrets to Replit

1. In your Replit project, open the **Secrets** panel (the lock icon in the left sidebar).
2. Add two secrets:

   | Key | Value |
   |-----|-------|
   | `VITE_SUPABASE_URL` | Your Project URL from step 4 |
   | `VITE_SUPABASE_ANON_KEY` | Your anon key from step 4 |

3. Restart the **Clarity web** workflow so Vite picks up the new env vars.

---

## Step 6 — Migrate your data

Once the app reloads:

- A **"Migrate my data"** banner will appear at the top of any screen if you have existing local data.
- Tap it to copy your tasks, inbox items, and projects to Supabase.
- Your original local data is **never deleted** — a backup is saved automatically.

After migration, every new item you add or edit will sync to Supabase in the background.

---

## Notes

- Sync is **one-direction write** (local → cloud). Real-time multi-device sync is a future feature.
- If you clear your browser data, your cloud data stays intact; you can re-migrate from another device after setting the same env vars.
- The `clarity_migrated` flag in localStorage prevents duplicate migrations.
