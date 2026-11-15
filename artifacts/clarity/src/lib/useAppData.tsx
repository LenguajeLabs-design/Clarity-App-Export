import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useLocalStorage } from "./use-local-storage";
import { CapturedItem, Project, UserSettings, AppData } from "./types";
import { v4 as uuidv4 } from "uuid";
import { useSyncStatus } from "./useSyncStatus";
import { replaceClarityRecords, saveClarityRecord, saveClarityRecords, subscribeToClarity } from "./firestore-sync";
import { parseBackup } from "./backup";
import { mergeByTimestamp, recordsToUpload } from "./sync-merge";

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

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useLocalStorage<CapturedItem[]>("clarity_items", []);
  const [projects, setProjects] = useLocalStorage<Project[]>("clarity_projects", []);
  const [settings, setSettings] = useLocalStorage<UserSettings>("clarity_settings", {
    largeText: false,
    highContrast: false,
    reducedMotion: false,
    theme: "auto",
  });

  const { userId, status, setSyncing, setSynced, setSyncError } = useSyncStatus();
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const cloudReady = Boolean(userId && loadedForUserId === userId && status === "synced");
  const itemsRef = useRef(items);
  const projectsRef = useRef(projects);

  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { projectsRef.current = projects; }, [projects]);

  useEffect(() => {
    if (!userId) return;
    let firstServerSnapshot = true;
    let initialUploadPending = false;
    let cancelled = false;
    setLoadedForUserId(null);
    setSyncing();

    const unsubscribe = subscribeToClarity(userId, (remote, metadata) => {
      const localItems = itemsRef.current;
      const localProjects = projectsRef.current;
      const mergedItems = mergeByTimestamp(localItems, remote.items);
      const mergedProjects = mergeByTimestamp(localProjects, remote.projects);
      itemsRef.current = mergedItems;
      projectsRef.current = mergedProjects;
      setItems(mergedItems);
      setProjects(mergedProjects);

      // A cached/empty initial snapshot is not evidence of the cloud dataset.
      // Never republish this browser's records until the server has answered.
      if (metadata.fromCache || metadata.hasPendingWrites) {
        setSyncing();
        return;
      }
      setLoadedForUserId(userId);
      if (firstServerSnapshot) {
        firstServerSnapshot = false;
        const uploads = [
          ...recordsToUpload(localItems, remote.items).map((record) => ({ record, kind: "item" as const })),
          ...recordsToUpload(localProjects, remote.projects).map((record) => ({ record, kind: "project" as const })),
        ];
        if (uploads.length > 0) {
          initialUploadPending = true;
          setSyncing();
          void saveClarityRecords(userId, uploads).then(() => {
            initialUploadPending = false;
            if (!cancelled) setSynced();
          }).catch((error: unknown) => {
            initialUploadPending = false;
            console.error("[Clarity] initial Firestore upload failed:", error);
            if (!cancelled) setSyncError();
          });
          return;
        }
      }
      if (!initialUploadPending) setSynced();
    }, (error) => {
      console.error("[Clarity] Firestore listener failed:", error);
      setSyncError();
    });

    return () => { cancelled = true; unsubscribe(); };
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

  const replaceAllData = async (
    newItems: CapturedItem[],
    newProjects: Project[],
    newSettings: UserSettings,
    syncedAt?: string,
  ) => {
    if (!cloudReady) throw new Error("Wait for cloud sync to finish before importing. Nothing was imported.");
    // Validate again at the mutation boundary, before touching any storage.
    const validated = parseBackup({ items: newItems, projects: newProjects, settings: newSettings });
    newItems = validated.items;
    newProjects = validated.projects;
    newSettings = validated.settings;
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
      setSyncing();
      try {
        await saveClarityRecords(userId, [
          ...newItems.map((record) => ({ record, kind: "item" as const })),
          ...newProjects.map((record) => ({ record, kind: "project" as const })),
        ]);
        setSynced();
      } catch {
        setSyncError();
        throw new Error("Data was imported into this browser, but cloud sync did not finish. Keep your recovery backup and check your connection.");
      }
    }
  };

  async function promoteCurrentDeviceData(): Promise<void> {
    if (!userId) throw new Error("Sign in to upload this device's data.");
    if (!cloudReady || (itemsRef.current.length === 0 && projectsRef.current.length === 0)) {
      throw new Error("Recovery needs a nonempty device copy and completed cloud sync. No recovery changes were made.");
    }
    const promotionTime = new Date().toISOString();
    setSyncing();
    try {
      await replaceClarityRecords(userId, [
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
      cloudReady,
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
