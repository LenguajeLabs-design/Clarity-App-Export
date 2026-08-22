import { createContext, useContext, useEffect, useRef } from "react";
import { useLocalStorage } from "./use-local-storage";
import { CapturedItem, Project, UserSettings, AppData } from "./types";
import { v4 as uuidv4 } from 'uuid';
import { useSyncStatus } from './useSyncStatus';
import {
  syncItem,
  syncItems,
  syncProject,
  syncProjects,
  fetchFromSupabase,
} from './supabase-sync';

export const BLANK_ITEM = (text: string): CapturedItem => ({
  id: uuidv4(),
  text,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  completedAt: null,
  type: null,
  area: null,
  timing: null,
  isTriaged: false,
  isDeleted: false,
  isPriority: false,
  isQuickWin: false,
  isCompleted: false,
  scheduledDate: null,
  projectId: null,
  nextAction: null,
  waitingOn: null,
});

const AppDataContext = createContext<AppData | null>(null);

/**
 * Record the current time as the "last data modification" timestamp.
 * This timestamp supports migration diagnostics and deterministic cloud merges.
 * Must be called on every real data mutation (add / update / delete).
 */
function touchModified() {
  try {
    localStorage.setItem('clarity_last_modified', new Date().toISOString());
  } catch { /* non-fatal */ }
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useLocalStorage<CapturedItem[]>('clarity_items', []);
  const [projects, setProjects] = useLocalStorage<Project[]>('clarity_projects', []);
  const [settings, setSettings] = useLocalStorage<UserSettings>('clarity_settings', {
    largeText: false, highContrast: false, reducedMotion: false, theme: 'auto',
  });

  const { userId, setSyncing, setSynced, setSyncError } = useSyncStatus();

  const hasStartedSync = useRef(false);
  useEffect(() => {
    if (!userId || hasStartedSync.current) return;
    hasStartedSync.current = true;

    const mergeRemote = async () => {
      if (document.visibilityState === 'hidden' || !navigator.onLine) return;
      setSyncing();
      const remote = await fetchFromSupabase(userId);
      if (!remote) { setSyncError(); return; }
      setItems((prev) => {
        const byId = new Map(prev.map((i) => [i.id, i]));
        for (const ri of remote.items) {
          const local = byId.get(ri.id);
          const localTime = local?.updatedAt ?? local?.createdAt ?? '';
          const remoteTime = ri.updatedAt ?? ri.createdAt;
          if (!local || remoteTime >= localTime) byId.set(ri.id, ri);
        }
        return Array.from(byId.values());
      });
      setProjects((prev) => {
        const byId = new Map(prev.map((p) => [p.id, p]));
        for (const rp of remote.projects) {
          const local = byId.get(rp.id);
          const localTime = local?.updatedAt ?? local?.createdAt ?? '';
          const remoteTime = rp.updatedAt ?? rp.createdAt;
          if (!local || remoteTime >= localTime) byId.set(rp.id, rp);
        }
        return Array.from(byId.values());
      });
      setSynced();
    };

    // Local-first: queue the complete cache, then merge canonical cloud state.
    void syncItems(items, userId, setSyncing, setSynced, setSyncError).then(mergeRemote);
    void syncProjects(projects, userId, setSyncing, setSynced, setSyncError);
    const interval = window.setInterval(() => void mergeRemote(), 30_000);
    const onFocus = () => void mergeRemote();
    window.addEventListener('online', onFocus);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', onFocus);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addItem = (text: string) => {
    const newItem = BLANK_ITEM(text);
    setItems((prev) => [newItem, ...prev]);
    touchModified();
    void syncItem(newItem, userId, setSyncing, setSynced, setSyncError);
  };

  const addItemsBatch = (texts: string[]) => {
    const newItems = texts.filter((t) => t.trim()).map((t) => BLANK_ITEM(t.trim()));
    setItems((prev) => [...newItems, ...prev]);
    if (newItems.length > 0) touchModified();
    void syncItems(newItems, userId, setSyncing, setSynced, setSyncError);
  };

  const addItemsBatchStructured = (structured: Array<{
    text: string;
    type?: CapturedItem['type'];
    area?: CapturedItem['area'];
    timing?: CapturedItem['timing'];
  }>) => {
    const newItems = structured
      .filter((s) => s.text.trim())
      .map((s) => ({
        ...BLANK_ITEM(s.text.trim()),
        ...(s.type ? { type: s.type } : {}),
        ...(s.area ? { area: s.area } : {}),
        ...(s.timing ? { timing: s.timing } : {}),
      }));
    setItems((prev) => [...newItems, ...prev]);
    if (newItems.length > 0) touchModified();
    void syncItems(newItems, userId, setSyncing, setSynced, setSyncError);
  };

  const updateItem = (id: string, updates: Partial<CapturedItem>) => {
    const updatedAt = new Date().toISOString();
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates, updatedAt } : i)));
    touchModified();
    const currentItem = items.find((i) => i.id === id);
    if (currentItem) {
      void syncItem({ ...currentItem, ...updates, updatedAt }, userId, setSyncing, setSynced, setSyncError);
    }
  };

  const completeItem = (id: string) => {
    updateItem(id, { isCompleted: true, completedAt: new Date().toISOString() });
  };

  const uncompleteItem = (id: string) => {
    updateItem(id, { isCompleted: false, completedAt: null });
  };

  const addProject = (p: Omit<Project, 'id' | 'createdAt'>) => {
    const now = new Date().toISOString();
    const newProject: Project = { ...p, id: uuidv4(), createdAt: now, updatedAt: now };
    setProjects((prev) => [newProject, ...prev]);
    touchModified();
    void syncProject(newProject, userId, setSyncing, setSynced, setSyncError);
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    const updatedAt = new Date().toISOString();
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt } : p)));
    touchModified();
    const currentProject = projects.find((p) => p.id === id);
    if (currentProject) {
      void syncProject({ ...currentProject, ...updates, updatedAt }, userId, setSyncing, setSynced, setSyncError);
    }
  };

  // Replace the full dataset at once after an import or device link.
  // Updates both React state and localStorage atomically.
  // syncedAt is the remote's modification timestamp; we store it so future
  // syncs compare modification times correctly rather than treating this
  // device as "freshly edited".
  const replaceAllData = (
    newItems: CapturedItem[],
    newProjects: Project[],
    newSettings: UserSettings,
    syncedAt?: string,
  ) => {
    setItems(newItems);
    setProjects(newProjects);
    setSettings(newSettings);
    try {
      localStorage.setItem('clarity_last_modified', syncedAt ?? new Date().toISOString());
    } catch { /* non-fatal */ }
  };

  const value: AppData = {
    items,
    projects,
    settings,
    addItem,
    addItemsBatch,
    addItemsBatchStructured,
    updateItem,
    completeItem,
    uncompleteItem,
    addProject,
    updateProject,
    updateSettings: setSettings,
    replaceAllData,
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
}

export const useAppData = (): AppData => {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData must be used within AppDataProvider");
  return context;
};
