import { Router, type IRouter } from "express";
import { createClient } from "@supabase/supabase-js";

const router: IRouter = Router();

const supabaseUrl = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
const supabaseServiceKey = process.env["SUPABASE_SERVICE_KEY"];

function getClient() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Auth: create or retrieve a Supabase user for a device UUID ───────────────
// The client sends its local device UUID; the server mints a real Supabase
// anonymous user (satisfies FK constraints) and returns the Supabase user ID.
// The client caches this Supabase UUID permanently in localStorage.
router.post("/clarity/auth", async (req, res) => {
  const { deviceId } = req.body as { deviceId?: string };

  if (!deviceId || !UUID_RE.test(deviceId)) {
    res.status(400).json({ error: "Missing or invalid deviceId" });
    return;
  }

  const sb = getClient();
  if (!sb) {
    res.status(503).json({ error: "Supabase not configured on server" });
    return;
  }

  try {
    // Create a confirmed user with a synthetic email. We use email-based creation
    // because anonymous admin creation requires Supabase v2.96+ and newer dashboard
    // config. The client only ever stores the returned UUID — the email/password
    // are never used again.
    const { data, error } = await sb.auth.admin.createUser({
      email: `device.${deviceId}@clarity-internal.local`,
      email_confirm: true,
      user_metadata: { clarity_device_id: deviceId },
    });

    if (error) throw error;
    res.json({ userId: data.user.id });
  } catch (e) {
    console.error("[clarity-auth] error:", e);
    res.status(500).json({ error: "Auth failed — please try again." });
  }
});

// ─── Sync: upsert items and/or projects ──────────────────────────────────────
router.post("/clarity/sync", async (req, res) => {
  const { userId, items, projects } = req.body as {
    userId?: string;
    items?: unknown[];
    projects?: unknown[];
  };

  if (!userId || !UUID_RE.test(userId)) {
    res.status(400).json({ error: "Missing or invalid userId" });
    return;
  }

  const sb = getClient();
  if (!sb) {
    res.status(503).json({ error: "Supabase not configured on server" });
    return;
  }

  const errors: string[] = [];

  if (Array.isArray(items) && items.length > 0) {
    const rows = items.map((item: unknown) => {
      const i = item as Record<string, unknown>;
      return {
        id: i.id,
        user_id: userId,
        text: i.text,
        created_at: i.createdAt ?? i.created_at,
        updated_at: new Date().toISOString(),
        type: i.type,
        area: i.area,
        timing: i.timing,
        is_triaged: i.isTriaged ?? i.is_triaged,
        is_deleted: i.isDeleted ?? i.is_deleted,
        is_priority: i.isPriority ?? i.is_priority,
        is_quick_win: i.isQuickWin ?? i.is_quick_win,
        is_completed: i.isCompleted ?? i.is_completed,
        scheduled_date: i.scheduledDate ?? i.scheduled_date,
        project_id: i.projectId ?? i.project_id,
        next_action: i.nextAction ?? i.next_action,
        waiting_on: i.waitingOn ?? i.waiting_on,
      };
    });

    const { error } = await sb
      .from("clarity_items")
      .upsert(rows, { onConflict: "id" });
    if (error) {
      console.error("[clarity-sync] items error:", error.message);
      errors.push(`items: ${error.message}`);
    }
  }

  if (Array.isArray(projects) && projects.length > 0) {
    const rows = projects.map((project: unknown) => {
      const p = project as Record<string, unknown>;
      return {
        id: p.id,
        user_id: userId,
        title: p.title,
        area: p.area,
        due_date: p.dueDate ?? p.due_date,
        next_action: p.nextAction ?? p.next_action,
        status: p.status,
        created_at: p.createdAt ?? p.created_at,
        updated_at: new Date().toISOString(),
      };
    });

    const { error } = await sb
      .from("clarity_projects")
      .upsert(rows, { onConflict: "id" });
    if (error) {
      console.error("[clarity-sync] projects error:", error.message);
      errors.push(`projects: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    res.status(500).json({ error: "Sync failed — please try again." });
    return;
  }

  res.json({ ok: true, syncedAt: new Date().toISOString() });
});

// ─── Cross-device link codes (in-memory, 10-min TTL) ─────────────────────────

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
const LINK_TTL_MS = 10 * 60 * 1000;
const linkCodes = new Map<string, { userId: string; expiresAt: number }>();

// Sweep expired codes every minute
setInterval(() => {
  const now = Date.now();
  for (const [code, val] of linkCodes.entries()) {
    if (val.expiresAt < now) linkCodes.delete(code);
  }
}, 60_000);

function makeCode(): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

// Generate a link code for this device's userId
router.post("/clarity/link/generate", (req, res) => {
  const { userId } = req.body as { userId?: string };
  if (!userId || !UUID_RE.test(userId)) {
    res.status(400).json({ error: "Missing or invalid userId" });
    return;
  }
  // Revoke any previous code from the same user
  for (const [code, val] of linkCodes.entries()) {
    if (val.userId === userId) linkCodes.delete(code);
  }
  const code = makeCode();
  const expiresAt = Date.now() + LINK_TTL_MS;
  linkCodes.set(code, { userId, expiresAt });
  res.json({ code, expiresAt: new Date(expiresAt).toISOString() });
});

// Redeem a link code: return the userId + all their data so the new device
// can adopt the account and replace its local state.
router.post("/clarity/link/redeem", async (req, res) => {
  const { code } = req.body as { code?: string };
  const normalized = (code ?? '').toUpperCase().trim();
  if (!normalized || !/^[A-Z2-9]{6}$/.test(normalized)) {
    res.status(400).json({ error: "Invalid code format" });
    return;
  }
  const entry = linkCodes.get(normalized);
  if (!entry || entry.expiresAt < Date.now()) {
    res.status(404).json({ error: "Code not found or expired — generate a new one" });
    return;
  }

  const sb = getClient();
  if (!sb) {
    res.status(503).json({ error: "Sync not configured on server" });
    return;
  }

  const { userId } = entry;
  const [itemsRes, projectsRes] = await Promise.all([
    sb.from("clarity_items").select("*").eq("user_id", userId).eq("is_deleted", false),
    sb.from("clarity_projects").select("*").eq("user_id", userId),
  ]);

  // Consume the code after a successful redemption
  linkCodes.delete(normalized);

  res.json({
    userId,
    items: itemsRes.data ?? [],
    projects: projectsRes.data ?? [],
  });
});

// ─── Count: verify migration ──────────────────────────────────────────────────
router.get("/clarity/sync/count/:userId", async (req, res) => {
  const { userId } = req.params;

  if (!userId || !UUID_RE.test(userId)) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }

  const sb = getClient();
  if (!sb) {
    res.status(503).json({ error: "Supabase not configured on server" });
    return;
  }

  const [{ count: itemCount }, { count: projectCount }] = await Promise.all([
    sb.from("clarity_items").select("id", { count: "exact", head: true }).eq("user_id", userId),
    sb.from("clarity_projects").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  res.json({ items: itemCount ?? 0, projects: projectCount ?? 0 });
});

export default router;
