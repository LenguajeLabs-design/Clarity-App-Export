import { CapturedItem, Project } from './types';
import { getApiUrl } from './api';
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
      getApiUrl(`/api/clarity/data/${userId}?deviceId=${encodeURIComponent(deviceId)}`),
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
      updatedAt: (row['updatedAt'] as string | undefined) ?? row['createdAt'] as string,
    }));

    const projects: Project[] = (data.projects ?? []).map((row) => ({
      id: row['id'] as string,
      title: row['title'] as string,
      area: (row['area'] as Project['area']) ?? 'personal',
      dueDate: (row['dueDate'] as string | null) ?? null,
      nextAction: (row['nextAction'] as string) ?? '',
      status: (row['status'] as Project['status']) ?? 'not-started',
      isDeleted: Boolean(row['isDeleted'] ?? row['is_deleted']),
      createdAt: row['createdAt'] as string,
      updatedAt: (row['updatedAt'] as string | undefined) ?? row['createdAt'] as string,
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
  const res = await fetch(getApiUrl('/api/clarity/sync'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, deviceId: getDeviceId(), ...payload }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
}

type PendingSync = { items: CapturedItem[]; projects: Project[] };
const PENDING_KEY = 'clarity_pending_sync_v1';
let flushPromise: Promise<void> | null = null;

function readPending(): PendingSync {
  try {
    const value = JSON.parse(localStorage.getItem(PENDING_KEY) ?? '{}') as Partial<PendingSync>;
    return { items: value.items ?? [], projects: value.projects ?? [] };
  } catch {
    return { items: [], projects: [] };
  }
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const merged = new Map(current.map((entry) => [entry.id, entry]));
  for (const entry of incoming) merged.set(entry.id, entry);
  return [...merged.values()];
}

function queuePending(payload: Partial<PendingSync>): void {
  const current = readPending();
  const next = {
    items: mergeById(current.items, payload.items ?? []),
    projects: mergeById(current.projects, payload.projects ?? []),
  };
  localStorage.setItem(PENDING_KEY, JSON.stringify(next));
}

async function flushPending(userId: string): Promise<void> {
  if (flushPromise) return flushPromise;
  flushPromise = (async () => {
    // Drain repeatedly so edits added while a request is in flight are not left
    // waiting for another user action.
    for (;;) {
      const pending = readPending();
      if (pending.items.length === 0 && pending.projects.length === 0) return;
      await callSyncApi(userId, pending);
      const latest = readPending();
      const sentItems = new Set(pending.items.map((entry) => JSON.stringify(entry)));
      const sentProjects = new Set(pending.projects.map((entry) => JSON.stringify(entry)));
      const remaining = {
        items: latest.items.filter((entry) => !sentItems.has(JSON.stringify(entry))),
        projects: latest.projects.filter((entry) => !sentProjects.has(JSON.stringify(entry))),
      };
      if (remaining.items.length || remaining.projects.length) {
        localStorage.setItem(PENDING_KEY, JSON.stringify(remaining));
      } else {
        localStorage.removeItem(PENDING_KEY);
      }
    }
  })().finally(() => { flushPromise = null; });
  return flushPromise;
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
  queuePending({ items: [item] });
  setSyncing();
  try {
    await flushPending(userId);
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
  queuePending({ items });
  setSyncing();
  try {
    await flushPending(userId);
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
  queuePending({ projects: [project] });
  setSyncing();
  try {
    await flushPending(userId);
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
  queuePending({ projects });
  setSyncing();
  try {
    await flushPending(userId);
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
    const res = await fetch(getApiUrl(`/api/clarity/sync/count/${userId}?deviceId=${encodeURIComponent(getDeviceId())}`));
    if (!res.ok) return false;
    const { items, projects } = await res.json() as { items: number; projects: number };
    return items === expectedItems && projects === expectedProjects;
  } catch (e) {
    console.error('[Clarity] verify migration error:', e);
    return false;
  }
}
