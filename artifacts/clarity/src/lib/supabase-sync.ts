import { CapturedItem, Project } from './types';

// All Supabase writes go through /api/clarity/sync on the API server.
// The server uses the service_role key safely server-side and never exposes it
// to the browser.

async function callSyncApi(
  deviceId: string,
  payload: { items?: CapturedItem[]; projects?: Project[] },
): Promise<void> {
  const res = await fetch('/api/clarity/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, ...payload }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
}

// ─── Sync Helpers (fire-and-forget wrappers) ─────────────────────────────────

export async function syncItem(
  item: CapturedItem,
  userId: string | null,
  setSyncing: () => void,
  setSynced: () => void,
  setSyncError: () => void,
): Promise<void> {
  if (!userId) return;
  setSyncing();
  try {
    await callSyncApi(userId, { items: [item] });
    setSynced();
  } catch (e) {
    console.error('[Clarity] sync item error:', e);
    setSyncError();
  }
}

export async function syncItems(
  items: CapturedItem[],
  userId: string | null,
  setSyncing: () => void,
  setSynced: () => void,
  setSyncError: () => void,
): Promise<void> {
  if (!userId || items.length === 0) return;
  setSyncing();
  try {
    await callSyncApi(userId, { items });
    setSynced();
  } catch (e) {
    console.error('[Clarity] sync items error:', e);
    setSyncError();
  }
}

export async function syncProject(
  project: Project,
  userId: string | null,
  setSyncing: () => void,
  setSynced: () => void,
  setSyncError: () => void,
): Promise<void> {
  if (!userId) return;
  setSyncing();
  try {
    await callSyncApi(userId, { projects: [project] });
    setSynced();
  } catch (e) {
    console.error('[Clarity] sync project error:', e);
    setSyncError();
  }
}

export async function syncProjects(
  projects: Project[],
  userId: string | null,
  setSyncing: () => void,
  setSynced: () => void,
  setSyncError: () => void,
): Promise<void> {
  if (!userId || projects.length === 0) return;
  setSyncing();
  try {
    await callSyncApi(userId, { projects });
    setSynced();
  } catch (e) {
    console.error('[Clarity] sync projects error:', e);
    setSyncError();
  }
}

// ─── Migration: verify counts ─────────────────────────────────────────────────

export async function verifyMigrationCounts(
  userId: string,
  expectedItems: number,
  expectedProjects: number,
): Promise<boolean> {
  try {
    const res = await fetch(`/api/clarity/sync/count/${userId}`);
    if (!res.ok) return false;
    const { items, projects } = await res.json() as { items: number; projects: number };
    return items === expectedItems && projects === expectedProjects;
  } catch (e) {
    console.error('[Clarity] verify migration error:', e);
    return false;
  }
}
