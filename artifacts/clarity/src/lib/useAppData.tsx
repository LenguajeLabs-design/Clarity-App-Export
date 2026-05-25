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
 * This is what GitHub sync uses for "latest write wins" comparisons.
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

  // Pull from Supabase once when userId first becomes available (on app load
  // and after cross-device linking). Remote items are merged in: items/projects
  // in Supabase but missing locally are added; existing local entries are kept
  // (the server already has the authoritative push from whichever device wrote
  // them, so remote wins for items we don't have yet).
  const hasPulled = useRef(false);
  useEffect(() => {
    if (!userId || hasPulled.current) return;
    hasPulled.current = true;
    void (async () => {
      const remote = await fetchFromSupabase(userId);
      if (!remote) return;
      setItems((prev) => {
        const byId = new Map(prev.map((i) => [i.id, i]));
        for (const ri of remote.items) {
          if (!byId.has(ri.id)) byId.set(ri.id, ri);
          else {
            // Remote wins if it marks an item deleted or completed
            const li = byId.get(ri.id)!;
            if ((ri.isDeleted && !li.isDeleted) || (ri.isCompleted && !li.isCompleted)) {
              byId.set(ri.id, ri);
            }
          }
        }
        return Array.from(byId.values());
      });
      setProjects((prev) => {
        const byId = new Map(prev.map((p) => [p.id, p]));
        for (const rp of remote.projects) {
          if (!byId.has(rp.id)) byId.set(rp.id, rp);
        }
        return Array.from(byId.values());
      });
    })();
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
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
    touchModified();
    const currentItem = items.find((i) => i.id === id);
    if (currentItem) {
      void syncItem({ ...currentItem, ...updates }, userId, setSyncing, setSynced, setSyncError);
    }
  };

  const completeItem = (id: string) => {
    updateItem(id, { isCompleted: true, completedAt: new Date().toISOString() });
  };

  const uncompleteItem = (id: string) => {
    updateItem(id, { isCompleted: false, completedAt: null });
  };

  const addProject = (p: Omit<Project, 'id' | 'createdAt'>) => {
    const newProject: Project = { ...p, id: uuidv4(), createdAt: new Date().toISOString() };
    setProjects((prev) => [newProject, ...prev]);
    touchModified();
    void syncProject(newProject, userId, setSyncing, setSynced, setSyncError);
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    touchModified();
    const currentProject = projects.find((p) => p.id === id);
    if (currentProject) {
      void syncProject({ ...currentProject, ...updates }, userId, setSyncing, setSynced, setSyncError);
    }
  };

  // Replace the full dataset at once — used after GitHub sync detects a newer
  // remote version. Updates both React state and localStorage atomically.
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
