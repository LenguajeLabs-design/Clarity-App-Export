import { CapturedItem, Project } from './types';
import { getDeviceId } from './supabase';

// ─── Pull: fetch canonical state from Supabase ────────────────────────────────
// Called on app load so all linked devices converge to the same state.
// Returns null on any error (caller falls back to local state).
export async function fetchFromSupabase(
  userId: string,
): Promise<{ items: CapturedItem[]; projects: Project[] } | null> {
  try {
    const deviceId = getDeviceId();
    const res = await fetch(
      `/api/clarity/data/${userId}?deviceId=${encodeURIComponent(deviceId)}`,
    );
    if (!res.ok) return null;

    const data = await res.json() as {
      items: Record<string, unknown>[];
      projects: Record<string, unknown>[];
    };

    const items: CapturedItem[] = (data.items ?? []).map((row) => ({
      id: row['id'] as string,
      text: row['text'] as string,
      type: (row['type'] as CapturedItem['type']) ?? null,
      area: (row['area'] as CapturedItem['area']) ?? null,
      timing: (row['timing'] as CapturedItem['timing']) ?? null,
      isCompleted: Boolean(row['isCompleted']),
      completedAt: (row['completedAt'] as string | null) ?? null,
      isTriaged: Boolean(row['isTriaged']),
      isDeleted: Boolean(row['isDeleted']),
      isPriority: Boolean(row['isPriority']),
      isQuickWin: Boolean(row['isQuickWin']),
      scheduledDate: (row['scheduledDate'] as string | null) ?? null,
      projectId: (row['projectId'] as string | null) ?? null,
      nextAction: (row['nextAction'] as string | null) ?? null,
      waitingOn: (row['waitingOn'] as string | null) ?? null,
      createdAt: row['createdAt'] as string,
    }));

    const projects: Project[] = (data.projects ?? []).map((row) => ({
      id: row['id'] as string,
      title: row['title'] as string,
      area: (row['area'] as Project['area']) ?? 'personal',
      dueDate: (row['dueDate'] as string | null) ?? null,
      nextAction: (row['nextAction'] as string) ?? '',
      status: (row['status'] as Project['status']) ?? 'not-started',
      createdAt: row['createdAt'] as string,
    }));

    return { items, projects };
  } catch {
    return null;
  }
}

// All Supabase writes go through /api/clarity/sync on the API server.
// The server uses the service_role key safely server-side and never exposes it
// to the browser.

async function callSyncApi(
  userId: string,
  payload: { items?: CapturedItem[]; projects?: Project[] },
): Promise<void> {
  const res = await fetch('/api/clarity/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, deviceId: getDeviceId(), ...payload }),
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
