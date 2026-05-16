import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import { AppItem, Project } from "@/lib/types";

const ITEMS_KEY = "clarity_items";
const PROJECTS_KEY = "clarity_projects";
const DEVICE_ID_KEY = "clarity_device_id";
const USER_ID_KEY = "clarity_user_id";

function makeId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getApiBase(): string {
  if (Platform.OS === "web") return "/api";
  const domain = process.env["EXPO_PUBLIC_DOMAIN"];
  if (domain) return `https://${domain}/api`;
  return "/api";
}

type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

interface AppDataContextValue {
  items: AppItem[];
  projects: Project[];
  syncStatus: SyncStatus;
  addItem: (text: string) => AppItem;
  updateItem: (id: string, updates: Partial<AppItem>) => void;
  deleteItem: (id: string) => void;
  markDone: (id: string) => void;
  addProject: (name: string, area?: Project["area"]) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  isLoaded: boolean;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<AppItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const [rawItems, rawProjects] = await Promise.all([
          AsyncStorage.getItem(ITEMS_KEY),
          AsyncStorage.getItem(PROJECTS_KEY),
        ]);
        if (rawItems) setItems(JSON.parse(rawItems));
        if (rawProjects) setProjects(JSON.parse(rawProjects));
      } catch {
      } finally {
        setIsLoaded(true);
      }

      loadFromServer();
    }
    init();
  }, []);

  async function ensureUserId(): Promise<string | null> {
    if (userIdRef.current) return userIdRef.current;

    try {
      const cached = await AsyncStorage.getItem(USER_ID_KEY);
      if (cached) {
        userIdRef.current = cached;
        return cached;
      }

      let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = generateUUID();
        await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      }

      const res = await fetch(`${getApiBase()}/clarity/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });

      if (!res.ok) return null;
      const { userId } = (await res.json()) as { userId: string };
      if (!userId) return null;

      await AsyncStorage.setItem(USER_ID_KEY, userId);
      userIdRef.current = userId;
      return userId;
    } catch {
      return null;
    }
  }

  async function loadFromServer() {
    setSyncStatus("syncing");
    try {
      const userId = await ensureUserId();
      if (!userId) {
        setSyncStatus("offline");
        return;
      }

      const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (!deviceId) {
        setSyncStatus("offline");
        return;
      }

      const res = await fetch(
        `${getApiBase()}/clarity/data/${userId}?deviceId=${encodeURIComponent(deviceId)}`
      );
      if (!res.ok) {
        setSyncStatus("error");
        return;
      }

      const { items: serverItems, projects: serverProjects } =
        (await res.json()) as { items: AppItem[]; projects: Project[] };

      setItems((localItems) => {
        const merged = mergeItems(localItems, serverItems);
        AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(merged));
        return merged;
      });
      setProjects((localProjects) => {
        const merged = mergeProjects(localProjects, serverProjects);
        AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(merged));
        return merged;
      });
      setSyncStatus("synced");
    } catch {
      setSyncStatus("offline");
    }
  }

  function mergeItems(local: AppItem[], server: AppItem[]): AppItem[] {
    const map = new Map<string, AppItem>();
    for (const item of server) map.set(item.id, item);
    for (const item of local) {
      const existing = map.get(item.id);
      if (!existing || new Date(item.updatedAt) > new Date(existing.updatedAt)) {
        map.set(item.id, item);
      }
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  function mergeProjects(local: Project[], server: Project[]): Project[] {
    const map = new Map<string, Project>();
    for (const p of server) map.set(p.id, p);
    for (const p of local) {
      const existing = map.get(p.id);
      if (!existing || new Date(p.updatedAt) > new Date(existing.updatedAt)) {
        map.set(p.id, p);
      }
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async function pushItemToServer(item: AppItem) {
    try {
      const userId = await ensureUserId();
      if (!userId) return;
      const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (!deviceId) return;

      setSyncStatus("syncing");
      const res = await fetch(`${getApiBase()}/clarity/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          deviceId,
          items: [
            {
              id: item.id,
              text: item.text,
              type: item.type,
              area: item.area,
              timing: item.timing,
              is_triaged: !!(item.type && item.area && item.timing),
              is_deleted: false,
              is_completed: item.done,
              project_id: item.projectId,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            },
          ],
        }),
      });
      setSyncStatus(res.ok ? "synced" : "error");
    } catch {
      setSyncStatus("offline");
    }
  }

  async function pushProjectToServer(project: Project) {
    try {
      const userId = await ensureUserId();
      if (!userId) return;
      const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (!deviceId) return;

      setSyncStatus("syncing");
      const res = await fetch(`${getApiBase()}/clarity/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          deviceId,
          projects: [
            {
              id: project.id,
              title: project.name,
              area: project.area,
              status: "active",
              createdAt: project.createdAt,
              updatedAt: project.updatedAt,
            },
          ],
        }),
      });
      setSyncStatus(res.ok ? "synced" : "error");
    } catch {
      setSyncStatus("offline");
    }
  }

  const persistItems = useCallback(async (next: AppItem[]) => {
    await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(next));
  }, []);

  const persistProjects = useCallback(async (next: Project[]) => {
    await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
  }, []);

  const addItem = useCallback(
    (text: string): AppItem => {
      const now = new Date().toISOString();
      const item: AppItem = {
        id: makeId(),
        text: text.trim(),
        type: null,
        area: null,
        timing: null,
        done: false,
        doneAt: null,
        projectId: null,
        createdAt: now,
        updatedAt: now,
      };
      setItems((prev) => {
        const next = [item, ...prev];
        persistItems(next);
        return next;
      });
      pushItemToServer(item);
      return item;
    },
    [persistItems]
  );

  const updateItem = useCallback(
    (id: string, updates: Partial<AppItem>) => {
      let updated: AppItem | null = null;
      setItems((prev) => {
        const next = prev.map((it) => {
          if (it.id === id) {
            updated = { ...it, ...updates, updatedAt: new Date().toISOString() };
            return updated;
          }
          return it;
        });
        persistItems(next);
        return next;
      });
      setTimeout(() => {
        if (updated) pushItemToServer(updated);
      }, 0);
    },
    [persistItems]
  );

  const deleteItem = useCallback(
    (id: string) => {
      let toDelete: AppItem | undefined;
      setItems((prev) => {
        toDelete = prev.find((it) => it.id === id);
        const next = prev.filter((it) => it.id !== id);
        persistItems(next);
        return next;
      });
      // Push a tombstone so the server marks it deleted
      setTimeout(async () => {
        if (!toDelete) return;
        try {
          const userId = await ensureUserId();
          if (!userId) return;
          const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
          if (!deviceId) return;
          await fetch(`${getApiBase()}/clarity/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              deviceId,
              items: [
                {
                  id: toDelete.id,
                  text: toDelete.text,
                  type: toDelete.type,
                  area: toDelete.area,
                  timing: toDelete.timing,
                  is_deleted: true,
                  is_completed: toDelete.done,
                  project_id: toDelete.projectId,
                  createdAt: toDelete.createdAt,
                  updatedAt: new Date().toISOString(),
                },
              ],
            }),
          });
        } catch {}
      }, 0);
    },
    [persistItems]
  );

  const markDone = useCallback(
    (id: string) => {
      let updated: AppItem | null = null;
      setItems((prev) => {
        const next = prev.map((it) => {
          if (it.id === id) {
            updated = {
              ...it,
              done: !it.done,
              doneAt: !it.done ? new Date().toISOString() : null,
              updatedAt: new Date().toISOString(),
            };
            return updated;
          }
          return it;
        });
        persistItems(next);
        return next;
      });
      setTimeout(() => {
        if (updated) pushItemToServer(updated);
      }, 0);
    },
    [persistItems]
  );

  const addProject = useCallback(
    (name: string, area: Project["area"] = null): Project => {
      const now = new Date().toISOString();
      const project: Project = {
        id: makeId(),
        name: name.trim(),
        area,
        createdAt: now,
        updatedAt: now,
      };
      setProjects((prev) => {
        const next = [project, ...prev];
        persistProjects(next);
        return next;
      });
      pushProjectToServer(project);
      return project;
    },
    [persistProjects]
  );

  const updateProject = useCallback(
    (id: string, updates: Partial<Project>) => {
      let updated: Project | null = null;
      setProjects((prev) => {
        const next = prev.map((p) => {
          if (p.id === id) {
            updated = { ...p, ...updates, updatedAt: new Date().toISOString() };
            return updated;
          }
          return p;
        });
        persistProjects(next);
        return next;
      });
      setTimeout(() => {
        if (updated) pushProjectToServer(updated);
      }, 0);
    },
    [persistProjects]
  );

  const deleteProject = useCallback(
    (id: string) => {
      let toDelete: Project | undefined;
      setProjects((prev) => {
        toDelete = prev.find((p) => p.id === id);
        const next = prev.filter((p) => p.id !== id);
        persistProjects(next);
        return next;
      });
      setItems((prev) => {
        const next = prev.map((it) =>
          it.projectId === id
            ? { ...it, projectId: null, updatedAt: new Date().toISOString() }
            : it
        );
        persistItems(next);
        return next;
      });
      // Push a tombstone so server marks it deleted
      setTimeout(async () => {
        if (!toDelete) return;
        try {
          const userId = await ensureUserId();
          if (!userId) return;
          const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
          if (!deviceId) return;
          await fetch(`${getApiBase()}/clarity/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              deviceId,
              projects: [
                {
                  id: toDelete.id,
                  title: toDelete.name,
                  area: toDelete.area,
                  status: "deleted",
                  createdAt: toDelete.createdAt,
                  updatedAt: new Date().toISOString(),
                },
              ],
            }),
          });
        } catch {}
      }, 0);
    },
    [persistProjects, persistItems]
  );

  return (
    <AppDataContext.Provider
      value={{
        items,
        projects,
        syncStatus,
        addItem,
        updateItem,
        deleteItem,
        markDone,
        addProject,
        updateProject,
        deleteProject,
        isLoaded,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used inside AppDataProvider");
  return ctx;
}
