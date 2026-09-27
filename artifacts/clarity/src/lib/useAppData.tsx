import { createContext, useContext, useEffect, useRef } from "react";
import { useLocalStorage } from "./use-local-storage";
import { CapturedItem, Project, UserSettings, AppData } from "./types";
import { v4 as uuidv4 } from "uuid";
import { useSyncStatus } from "./useSyncStatus";
import { saveClarityRecord, saveClarityRecords, subscribeToClarity } from "./firestore-sync";

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

function touchModified() {
  try {
    localStorage.setItem("clarity_last_modified", new Date().toISOString());
  } catch {
    // Local metadata is non-critical.
  }
}

function recordTime(record: { createdAt: string; updatedAt?: string }): number {
  const time = Date.parse(record.updatedAt ?? record.createdAt);
  return Number.isNaN(time) ? 0 : time;
}

function mergeByTimestamp<T extends { id: string; createdAt: string; updatedAt?: string }>(
  local: T[],
  remote: T[],
): T[] {
  const byId = new Map(local.map((record) => [record.id, record]));
  for (const candidate of remote) {
    const current = byId.get(candidate.id);
    if (!current || recordTime(candidate) >= recordTime(current)) byId.set(candidate.id, candidate);
  }
  return [...byId.values()];
}

function recordsToUpload<T extends { id: string; createdAt: string; updatedAt?: string }>(
  local: T[],
  remote: T[],
): T[] {
  const remoteById = new Map(remote.map((record) => [record.id, record]));
  return local.filter((record) => {
    const remoteRecord = remoteById.get(record.id);
    return !remoteRecord || recordTime(record) >= recordTime(remoteRecord);
  });
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useLocalStorage<CapturedItem[]>("clarity_items", []);
  const [projects, setProjects] = useLocalStorage<Project[]>("clarity_projects", []);
  const [settings, setSettings] = useLocalStorage<UserSettings>("clarity_settings", {
    largeText: false,
    highContrast: false,
    reducedMotion: false,
    theme: "auto",
  });

  const { userId, setSyncing, setSynced, setSyncError } = useSyncStatus();
  const itemsRef = useRef(items);
  const projectsRef = useRef(projects);

  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { projectsRef.current = projects; }, [projects]);

  useEffect(() => {
    if (!userId) return;
    let firstSnapshot = true;
    setSyncing();

    const unsubscribe = subscribeToClarity(userId, (remote) => {
      const localItems = itemsRef.current;
      const localProjects = projectsRef.current;
      const mergedItems = mergeByTimestamp(localItems, remote.items);
      const mergedProjects = mergeByTimestamp(localProjects, remote.projects);
      itemsRef.current = mergedItems;
      projectsRef.current = mergedProjects;
      setItems(mergedItems);
      setProjects(mergedProjects);

      if (firstSnapshot) {
        firstSnapshot = false;
        const uploads = [
          ...recordsToUpload(localItems, remote.items).map((record) => ({ record, kind: "item" as const })),
          ...recordsToUpload(localProjects, remote.projects).map((record) => ({ record, kind: "project" as const })),
        ];
        if (uploads.length > 0) {
          void saveClarityRecords(userId, uploads).catch((error: unknown) => {
            console.error("[Clarity] initial Firestore upload failed:", error);
            setSyncError();
          });
        }
      }
      setSynced();
    }, (error) => {
      console.error("[Clarity] Firestore listener failed:", error);
      setSyncError();
    });

    return unsubscribe;
  }, [setSynced, setSyncError, setSyncing, userId]);

  function persist(record: CapturedItem | Project, kind: "item" | "project") {
    if (!userId) return;
    setSyncing();
    void saveClarityRecord(userId, record, kind)
      .then(setSynced)
      .catch((error: unknown) => {
        console.error("[Clarity] Firestore write failed:", error);
        setSyncError();
      });
  }

  const addItem = (text: string) => {
    const newItem = BLANK_ITEM(text);
    const nextItems = [newItem, ...itemsRef.current];
    itemsRef.current = nextItems;
    setItems(nextItems);
    touchModified();
    persist(newItem, "item");
  };

  const addItemsBatch = (texts: string[]) => {
    const newItems = texts.filter((text) => text.trim()).map((text) => BLANK_ITEM(text.trim()));
    if (newItems.length === 0) return;
    const nextItems = [...newItems, ...itemsRef.current];
    itemsRef.current = nextItems;
    setItems(nextItems);
    touchModified();
    if (userId) {
      setSyncing();
      void saveClarityRecords(userId, newItems.map((record) => ({ record, kind: "item" as const })))
        .then(setSynced)
        .catch(setSyncError);
    }
  };

  const addItemsBatchStructured = (structured: Array<{
    text: string;
    type?: CapturedItem["type"];
    area?: CapturedItem["area"];
    timing?: CapturedItem["timing"];
  }>) => {
    const newItems = structured
      .filter((entry) => entry.text.trim())
      .map((entry) => ({
        ...BLANK_ITEM(entry.text.trim()),
        ...(entry.type ? { type: entry.type } : {}),
        ...(entry.area ? { area: entry.area } : {}),
        ...(entry.timing ? { timing: entry.timing } : {}),
      }));
    if (newItems.length === 0) return;
    const nextItems = [...newItems, ...itemsRef.current];
    itemsRef.current = nextItems;
    setItems(nextItems);
    touchModified();
    if (userId) {
      setSyncing();
      void saveClarityRecords(userId, newItems.map((record) => ({ record, kind: "item" as const })))
        .then(setSynced)
        .catch(setSyncError);
    }
  };

  const updateItem = (id: string, updates: Partial<CapturedItem>) => {
    const current = itemsRef.current.find((item) => item.id === id);
    if (!current) return;
    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    const nextItems = itemsRef.current.map((item) => (item.id === id ? updated : item));
    itemsRef.current = nextItems;
    setItems(nextItems);
    touchModified();
    persist(updated, "item");
  };

  const completeItem = (id: string) => updateItem(id, { isCompleted: true, completedAt: new Date().toISOString() });
  const uncompleteItem = (id: string) => updateItem(id, { isCompleted: false, completedAt: null });

  const addProject = (project: Omit<Project, "id" | "createdAt">) => {
    const now = new Date().toISOString();
    const newProject: Project = { ...project, id: uuidv4(), createdAt: now, updatedAt: now };
    const nextProjects = [newProject, ...projectsRef.current];
    projectsRef.current = nextProjects;
    setProjects(nextProjects);
    touchModified();
    persist(newProject, "project");
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    const current = projectsRef.current.find((project) => project.id === id);
    if (!current) return;
    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    const nextProjects = projectsRef.current.map((project) => (project.id === id ? updated : project));
    projectsRef.current = nextProjects;
    setProjects(nextProjects);
    touchModified();
    persist(updated, "project");
  };

  const replaceAllData = (
    newItems: CapturedItem[],
    newProjects: Project[],
    newSettings: UserSettings,
    syncedAt?: string,
  ) => {
    itemsRef.current = newItems;
    projectsRef.current = newProjects;
    setItems(newItems);
    setProjects(newProjects);
    setSettings(newSettings);
    try {
      localStorage.setItem("clarity_last_modified", syncedAt ?? new Date().toISOString());
    } catch {
      // Local metadata is non-critical.
    }
    if (userId) {
      void saveClarityRecords(userId, [
        ...newItems.map((record) => ({ record, kind: "item" as const })),
        ...newProjects.map((record) => ({ record, kind: "project" as const })),
      ]).catch(setSyncError);
    }
  };

  async function promoteCurrentDeviceData(): Promise<void> {
    if (!userId) throw new Error("Sign in to upload this device's data.");
    const promotionTime = new Date().toISOString();
    setSyncing();
    try {
      await saveClarityRecords(userId, [
        ...itemsRef.current.map((record) => ({ record, kind: "item" as const })),
        ...projectsRef.current.map((record) => ({ record, kind: "project" as const })),
      ], promotionTime);
      setSynced();
    } catch (error) {
      setSyncError();
      throw error;
    }
  }

  return (
    <AppDataContext.Provider value={{
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
      promoteCurrentDeviceData,
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export const useAppData = (): AppData => {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData must be used within AppDataProvider");
  return context;
};
