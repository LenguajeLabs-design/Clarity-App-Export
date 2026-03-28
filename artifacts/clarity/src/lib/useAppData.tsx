import { createContext, useContext } from "react";
import { useLocalStorage } from "./use-local-storage";
import { CapturedItem, Project, UserSettings, AppData } from "./types";
import { v4 as uuidv4 } from 'uuid';
import { useSyncStatus } from './useSyncStatus';
import {
  syncItem,
  syncItems,
  syncProject,
  syncProjects,
} from './supabase-sync';

export const BLANK_ITEM = (text: string): CapturedItem => ({
  id: uuidv4(),
  text,
  createdAt: new Date().toISOString(),
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

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useLocalStorage<CapturedItem[]>('clarity_items', []);
  const [projects, setProjects] = useLocalStorage<Project[]>('clarity_projects', []);
  const [settings, setSettings] = useLocalStorage<UserSettings>('clarity_settings', {
    largeText: false, highContrast: false, reducedMotion: false,
  });

  const { userId, setSyncing, setSynced, setSyncError } = useSyncStatus();

  const addItem = (text: string) => {
    const newItem = BLANK_ITEM(text);
    setItems((prev) => [newItem, ...prev]);
    void syncItem(newItem, userId, setSyncing, setSynced, setSyncError);
  };

  const addItemsBatch = (texts: string[]) => {
    const newItems = texts.filter((t) => t.trim()).map((t) => BLANK_ITEM(t.trim()));
    setItems((prev) => [...newItems, ...prev]);
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
    void syncItems(newItems, userId, setSyncing, setSynced, setSyncError);
  };

  const updateItem = (id: string, updates: Partial<CapturedItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
    const currentItem = items.find((i) => i.id === id);
    if (currentItem) {
      void syncItem({ ...currentItem, ...updates }, userId, setSyncing, setSynced, setSyncError);
    }
  };

  const completeItem = (id: string) => {
    updateItem(id, { isCompleted: true });
  };

  const addProject = (p: Omit<Project, 'id' | 'createdAt'>) => {
    const newProject: Project = { ...p, id: uuidv4(), createdAt: new Date().toISOString() };
    setProjects((prev) => [newProject, ...prev]);
    void syncProject(newProject, userId, setSyncing, setSynced, setSyncError);
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    const currentProject = projects.find((p) => p.id === id);
    if (currentProject) {
      void syncProject({ ...currentProject, ...updates }, userId, setSyncing, setSynced, setSyncError);
    }
  };

  // Replace the full dataset at once — used after GitHub sync detects a newer
  // remote version. Updates both React state and localStorage atomically.
  const replaceAllData = (
    newItems: CapturedItem[],
    newProjects: Project[],
    newSettings: UserSettings,
  ) => {
    setItems(newItems);
    setProjects(newProjects);
    setSettings(newSettings);
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
