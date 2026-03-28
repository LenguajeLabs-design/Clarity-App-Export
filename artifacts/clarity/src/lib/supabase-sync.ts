import { CapturedItem, Project } from './types';
import { supabase } from './supabase';

// ─── Field Mappers ────────────────────────────────────────────────────────────

export function itemToDb(item: CapturedItem, userId: string) {
  return {
    id: item.id,
    user_id: userId,
    text: item.text,
    created_at: item.createdAt,
    updated_at: new Date().toISOString(),
    type: item.type,
    area: item.area,
    timing: item.timing,
    is_triaged: item.isTriaged,
    is_deleted: item.isDeleted,
    is_priority: item.isPriority,
    is_quick_win: item.isQuickWin,
    is_completed: item.isCompleted,
    scheduled_date: item.scheduledDate,
    project_id: item.projectId,
    next_action: item.nextAction,
    waiting_on: item.waitingOn,
  };
}

export function projectToDb(project: Project, userId: string) {
  return {
    id: project.id,
    user_id: userId,
    title: project.title,
    area: project.area,
    due_date: project.dueDate,
    next_action: project.nextAction,
    status: project.status,
    created_at: project.createdAt,
    updated_at: new Date().toISOString(),
  };
}

// ─── Sync Helpers (fire-and-forget) ──────────────────────────────────────────

export async function syncItem(
  item: CapturedItem,
  userId: string | null,
  setSyncing: () => void,
  setSynced: () => void,
  setSyncError: () => void,
): Promise<void> {
  if (!supabase || !userId) return;
  setSyncing();
  try {
    const { error } = await supabase
      .from('clarity_items')
      .upsert(itemToDb(item, userId), { onConflict: 'id' });
    if (error) throw error;
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
  if (!supabase || !userId || items.length === 0) return;
  setSyncing();
  try {
    const rows = items.map((i) => itemToDb(i, userId));
    const { error } = await supabase
      .from('clarity_items')
      .upsert(rows, { onConflict: 'id' });
    if (error) throw error;
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
  if (!supabase || !userId) return;
  setSyncing();
  try {
    const { error } = await supabase
      .from('clarity_projects')
      .upsert(projectToDb(project, userId), { onConflict: 'id' });
    if (error) throw error;
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
  if (!supabase || !userId || projects.length === 0) return;
  setSyncing();
  try {
    const rows = projects.map((p) => projectToDb(p, userId));
    const { error } = await supabase
      .from('clarity_projects')
      .upsert(rows, { onConflict: 'id' });
    if (error) throw error;
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
  if (!supabase) return false;
  try {
    const [{ count: itemCount }, { count: projectCount }] = await Promise.all([
      supabase
        .from('clarity_items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('clarity_projects')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
    ]);
    return itemCount === expectedItems && projectCount === expectedProjects;
  } catch (e) {
    console.error('[Clarity] verify migration error:', e);
    return false;
  }
}
