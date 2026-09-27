import { Router, type IRouter } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const router: IRouter = Router();

const supabaseUrl = process.env["SUPABASE_URL"];
const supabaseServiceKey = process.env["SUPABASE_SERVICE_KEY"];

function getClient() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T/;

function safeTimestamp(value: unknown, fallback: string): string {
  return typeof value === "string" && ISO_DATE_RE.test(value) && !Number.isNaN(Date.parse(value))
    ? value
    : fallback;
}

// ─── Shared helper: verify that deviceId owns userId ─────────────────────────
// Returns true if the device is the primary owner OR an authorized linked device.
// authorized_devices is a list added by /clarity/link/redeem when a second device
// links to this account via a link code.
async function verifyDeviceOwnsUser(
  sb: SupabaseClient,
  userId: string,
  deviceId: string
): Promise<boolean> {
  try {
    const { data, error } = await sb.auth.admin.getUserById(userId);
    if (error || !data?.user) return false;
    const meta = data.user.user_metadata ?? {};
    const primary = meta["clarity_device_id"] as string | undefined;
    const authorized = meta["authorized_devices"] as string[] | undefined;
    if (primary === deviceId) return true;
    if (Array.isArray(authorized) && authorized.includes(deviceId)) return true;
    return false;
  } catch {
    return false;
  }
}

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

  const email = `device.${deviceId}@clarity-internal.local`;

  try {
    // Try to create a confirmed user with a synthetic email.
    // If the user already exists (e.g. localStorage was cleared), look them up instead.
    const { data, error } = await sb.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { clarity_device_id: deviceId },
    });

    if (!error) {
      res.json({ userId: data.user.id });
      return;
    }

    // User already exists — look them up via the Admin REST API
    const lookupUrl = `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}&page=1&per_page=1`;
    const lookupRes = await fetch(lookupUrl, {
      headers: {
        apikey: supabaseServiceKey!,
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
    });

    if (!lookupRes.ok) {
      console.error("[clarity-auth] lookup failed:", await lookupRes.text());
      res.status(500).json({ error: "Auth failed — please try again." });
      return;
    }

    const { users } = await lookupRes.json() as { users?: { id: string }[] };
    if (users && users.length > 0) {
      res.json({ userId: users[0].id });
      return;
    }

    console.error("[clarity-auth] create error and no existing user:", error);
    res.status(500).json({ error: "Auth failed — please try again." });
  } catch (e) {
    console.error("[clarity-auth] error:", e);
    res.status(500).json({ error: "Auth failed — please try again." });
  }
});

// ─── Sync: upsert items and/or projects ──────────────────────────────────────
// Requires deviceId in body; ownership is verified before any writes occur.
router.post("/clarity/sync", async (req, res) => {
  const { userId, deviceId, items, projects } = req.body as {
    userId?: string;
    deviceId?: string;
    items?: unknown[];
    projects?: unknown[];
  };

  if (!userId || !UUID_RE.test(userId)) {
    res.status(400).json({ error: "Missing or invalid userId" });
    return;
  }

  if (!deviceId || !UUID_RE.test(deviceId)) {
    res.status(400).json({ error: "Missing or invalid deviceId" });
    return;
  }

  const sb = getClient();
  if (!sb) {
    res.status(503).json({ error: "Supabase not configured on server" });
    return;
  }

  const authorized = await verifyDeviceOwnsUser(sb, userId, deviceId);
  if (!authorized) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const errors: string[] = [];

  if (Array.isArray(items) && items.length > 0) {
    if (items.length > 500) {
      res.status(413).json({ error: "Too many items in one sync request" });
      return;
    }
    const now = new Date().toISOString();
    const rows = items.filter((item: unknown) => {
      const i = item as Record<string, unknown>;
      return typeof i.id === "string" && UUID_RE.test(i.id) && typeof i.text === "string" && i.text.length <= 10_000;
    }).map((item: unknown) => {
      const i = item as Record<string, unknown>;
      return {
        id: i.id,
        user_id: userId,
        text: i.text,
        created_at: i.createdAt ?? i.created_at,
        updated_at: safeTimestamp(
          i.updatedAt ?? i.updated_at,
          safeTimestamp(i.createdAt ?? i.created_at, now),
        ),
        type: i.type,
        area: i.area,
        timing: i.timing,
        is_triaged: i.isTriaged ?? i.is_triaged,
        is_deleted: i.isDeleted ?? i.is_deleted,
        is_priority: i.isPriority ?? i.is_priority,
        is_quick_win: i.isQuickWin ?? i.is_quick_win,
        is_completed: i.isCompleted ?? i.is_completed,
        completed_at: i.completedAt ?? i.completed_at,
        scheduled_date: i.scheduledDate ?? i.scheduled_date,
        project_id: i.projectId ?? i.project_id,
        next_action: i.nextAction ?? i.next_action,
        waiting_on: i.waitingOn ?? i.waiting_on,
      };
    });

    if (items.length > 0 && rows.length === 0) {
      errors.push("items: no valid rows");
    }
    if (rows.length > 0) {
      const { error } = await sb
        .from("clarity_items")
        .upsert(rows, { onConflict: "id" });
      if (error) {
        console.error("[clarity-sync] items error:", error.message);
        errors.push(`items: ${error.message}`);
      }
    }
  }

  if (Array.isArray(projects) && projects.length > 0) {
    if (projects.length > 500) {
      res.status(413).json({ error: "Too many projects in one sync request" });
      return;
    }
    const now = new Date().toISOString();
    const rows = projects.filter((project: unknown) => {
      const p = project as Record<string, unknown>;
      return typeof p.id === "string" && UUID_RE.test(p.id) && typeof p.title === "string" && p.title.length <= 1_000;
    }).map((project: unknown) => {
      const p = project as Record<string, unknown>;
      return {
        id: p.id,
        user_id: userId,
        title: p.title,
        area: p.area === "work" || p.area === "home" || p.area === "family" || p.area === "personal"
          ? p.area
          : "personal",
        due_date: p.dueDate ?? p.due_date,
        next_action: p.nextAction ?? p.next_action,
        status: p.status === "in-progress" || p.status === "done" ? p.status : "not-started",
        is_deleted: Boolean(p.isDeleted ?? p.is_deleted),
        created_at: p.createdAt ?? p.created_at,
        updated_at: safeTimestamp(
          p.updatedAt ?? p.updated_at,
          safeTimestamp(p.createdAt ?? p.created_at, now),
        ),
      };
    });

    if (projects.length > 0 && rows.length === 0) {
      errors.push("projects: no valid rows");
    }
    if (rows.length > 0) {
      const { error } = await sb
        .from("clarity_projects")
        .upsert(rows, { onConflict: "id" });
      if (error) {
        console.error("[clarity-sync] projects error:", error.message);
        errors.push(`projects: ${error.message}`);
      }
    }
  }

  if (errors.length > 0) {
    res.status(500).json({ error: "Sync failed — please try again." });
    return;
  }

  res.json({ ok: true, syncedAt: new Date().toISOString() });
});

// ─── Cross-device link codes (durable in Supabase, 10-min TTL) ───────────────

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
const LINK_TTL_MS = 10 * 60 * 1000;
function makeCode(): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

// Generate a link code for this device's userId
router.post("/clarity/link/generate", async (req, res) => {
  const { userId, deviceId } = req.body as { userId?: string; deviceId?: string };
  if (!userId || !UUID_RE.test(userId)) {
    res.status(400).json({ error: "Missing or invalid userId" });
    return;
  }
  if (!deviceId || !UUID_RE.test(deviceId)) {
    res.status(400).json({ error: "Missing or invalid deviceId" });
    return;
  }
  const sb = getClient();
  if (!sb) {
    res.status(503).json({ error: "Sync not configured on server" });
    return;
  }
  if (!await verifyDeviceOwnsUser(sb, userId, deviceId)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await sb.from("clarity_link_codes").delete().eq("user_id", userId);
  const code = makeCode();
  const expiresAt = Date.now() + LINK_TTL_MS;
  const { error } = await sb.from("clarity_link_codes").insert({
    code,
    user_id: userId,
    expires_at: new Date(expiresAt).toISOString(),
  });
  if (error) {
    console.error("[clarity-link] create error:", error.message);
    res.status(500).json({ error: "Could not create a link code" });
    return;
  }
  res.json({ code, expiresAt: new Date(expiresAt).toISOString() });
});

// Redeem a link code: register the new device as authorized, return userId + data.
// deviceId is the *new* device's ID — it gets added to authorized_devices on the
// account so future sync calls from this device pass the ownership check.
router.post("/clarity/link/redeem", async (req, res) => {
  const { code, deviceId } = req.body as { code?: string; deviceId?: string };
  const normalized = (code ?? '').toUpperCase().trim();
  if (!normalized || !/^[A-Z2-9]{6}$/.test(normalized)) {
    res.status(400).json({ error: "Invalid code format" });
    return;
  }
  if (!deviceId || !UUID_RE.test(deviceId)) {
    res.status(400).json({ error: "Missing or invalid deviceId" });
    return;
  }
  const sb = getClient();
  if (!sb) {
    res.status(503).json({ error: "Sync not configured on server" });
    return;
  }

  const { data: entry, error: codeError } = await sb
    .from("clarity_link_codes")
    .select("user_id, expires_at")
    .eq("code", normalized)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (codeError || !entry) {
    res.status(404).json({ error: "Code not found or expired — generate a new one" });
    return;
  }
  const userId = entry.user_id as string;

  // Register deviceId as authorized on the account so future syncs pass
  const { data: userData } = await sb.auth.admin.getUserById(userId);
  const existing = (userData?.user?.user_metadata?.["authorized_devices"] as string[] | undefined) ?? [];
  if (!existing.includes(deviceId)) {
    await sb.auth.admin.updateUserById(userId, {
      user_metadata: { authorized_devices: [...existing, deviceId] },
    });
  }

  const [itemsRes, projectsRes] = await Promise.all([
    sb.from("clarity_items").select("*").eq("user_id", userId),
    sb.from("clarity_projects").select("*").eq("user_id", userId),
  ]);

  // Consume the code after a successful redemption
  await sb.from("clarity_link_codes").delete().eq("code", normalized);

  res.json({
    userId,
    items: itemsRes.data ?? [],
    projects: projectsRes.data ?? [],
  });
});

// ─── Fetch: pull all items and projects for a user ───────────────────────────
// Requires deviceId query param; server verifies it matches the userId's
// stored device metadata to prevent IDOR access by guessing a userId.
router.get("/clarity/data/:userId", async (req, res) => {
  const { userId } = req.params;
  const deviceId = req.query["deviceId"] as string | undefined;

  if (!userId || !UUID_RE.test(userId)) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }

  if (!deviceId || !UUID_RE.test(deviceId)) {
    res.status(400).json({ error: "Missing or invalid deviceId" });
    return;
  }

  const sb = getClient();
  if (!sb) {
    res.status(503).json({ error: "Supabase not configured on server" });
    return;
  }

  const authorized = await verifyDeviceOwnsUser(sb, userId, deviceId);
  if (!authorized) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [itemsResult, projectsResult] = await Promise.all([
    sb
      .from("clarity_items")
      .select("*")
      .eq("user_id", userId),
    sb
      .from("clarity_projects")
      .select("*")
      .eq("user_id", userId),
  ]);

  if (itemsResult.error || projectsResult.error) {
    console.error("[clarity-data] error:", itemsResult.error?.message, projectsResult.error?.message);
    res.status(500).json({ error: "Failed to fetch data" });
    return;
  }

  const items = (itemsResult.data ?? []).map((row: Record<string, unknown>) => ({
    id: row["id"],
    text: row["text"],
    type: row["type"] ?? null,
    area: row["area"] ?? null,
    timing: row["timing"] ?? null,
    isCompleted: row["is_completed"] ?? false,
    completedAt: row["completed_at"] ?? null,
    isTriaged: row["is_triaged"] ?? false,
    isDeleted: row["is_deleted"] ?? false,
    isPriority: row["is_priority"] ?? false,
    isQuickWin: row["is_quick_win"] ?? false,
    scheduledDate: row["scheduled_date"] ?? null,
    projectId: row["project_id"] ?? null,
    nextAction: row["next_action"] ?? null,
    waitingOn: row["waiting_on"] ?? null,
    createdAt: row["created_at"],
    updatedAt: row["updated_at"],
  }));

  const projects = (projectsResult.data ?? []).map((row: Record<string, unknown>) => ({
    id: row["id"],
    title: row["title"],
    area: row["area"] ?? null,
    dueDate: row["due_date"] ?? null,
    nextAction: row["next_action"] ?? null,
    status: row["status"] ?? "active",
    isDeleted: row["is_deleted"] ?? false,
    createdAt: row["created_at"],
    updatedAt: row["updated_at"],
  }));

  res.json({ items, projects });
});

// ─── Count: verify migration ──────────────────────────────────────────────────
router.get("/clarity/sync/count/:userId", async (req, res) => {
  const { userId } = req.params;
  const deviceId = req.query["deviceId"] as string | undefined;

  if (!userId || !UUID_RE.test(userId)) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }

  const sb = getClient();
  if (!sb) {
    res.status(503).json({ error: "Supabase not configured on server" });
    return;
  }
  if (!deviceId || !UUID_RE.test(deviceId) || !await verifyDeviceOwnsUser(sb, userId, deviceId)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [{ count: itemCount }, { count: projectCount }] = await Promise.all([
    sb.from("clarity_items").select("id", { count: "exact", head: true }).eq("user_id", userId),
    sb.from("clarity_projects").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  res.json({ items: itemCount ?? 0, projects: projectCount ?? 0 });
});

export default router;
