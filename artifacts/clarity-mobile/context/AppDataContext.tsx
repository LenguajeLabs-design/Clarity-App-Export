import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { AppItem, Project } from "@/lib/types";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { saveClarityRecord, saveClarityRecords, subscribeToClarity } from "@/lib/firestore-sync";
import { generateUUID } from "@/lib/ids";

const ITEMS_KEY = "clarity_items";
const PROJECTS_KEY = "clarity_projects";

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

function recordTime(record: { createdAt: string; updatedAt: string }): number {
  const time = Date.parse(record.updatedAt || record.createdAt);
  return Number.isNaN(time) ? 0 : time;
}

function mergeRecords<T extends { id: string; createdAt: string; updatedAt: string; isDeleted?: boolean }>(
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

function visibleRecords<T extends { isDeleted?: boolean }>(records: T[]): T[] {
  return records.filter((record) => !record.isDeleted);
}

function recordsToUpload<T extends { id: string; createdAt: string; updatedAt: string }>(local: T[], remote: T[]): T[] {
  const remoteById = new Map(remote.map((record) => [record.id, record]));
  return local.filter((record) => {
    const remoteRecord = remoteById.get(record.id);
    return !remoteRecord || recordTime(record) >= recordTime(remoteRecord);
  });
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useFirebaseAuth();
  const [items, setItems] = useState<AppItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const itemsRef = useRef<AppItem[]>([]);
  const projectsRef = useRef<Project[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadLocal() {
      try {
        const [rawItems, rawProjects] = await Promise.all([
          AsyncStorage.getItem(ITEMS_KEY),
          AsyncStorage.getItem(PROJECTS_KEY),
        ]);
        const localItems = rawItems ? JSON.parse(rawItems) as AppItem[] : [];
        const localProjects = rawProjects ? JSON.parse(rawProjects) as Project[] : [];
        if (cancelled) return;
        itemsRef.current = localItems;
        projectsRef.current = localProjects;
        setItems(visibleRecords(localItems));
        setProjects(visibleRecords(localProjects));
      } catch {
        // A corrupt cache should not prevent a fresh Firebase session.
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    }
    void loadLocal();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user?.uid || !isLoaded) return;
    let firstSnapshot = true;
    setSyncStatus("syncing");
    const unsubscribe = subscribeToClarity(user.uid, (remote) => {
      const localItems = itemsRef.current;
      const localProjects = projectsRef.current;
      const mergedItems = mergeRecords(localItems, remote.items);
      const mergedProjects = mergeRecords(localProjects, remote.projects);
      itemsRef.current = mergedItems;
      projectsRef.current = mergedProjects;
      setItems(visibleRecords(mergedItems));
      setProjects(visibleRecords(mergedProjects));
      void AsyncStorage.multiSet([
        [ITEMS_KEY, JSON.stringify(mergedItems)],
        [PROJECTS_KEY, JSON.stringify(mergedProjects)],
      ]);

      if (firstSnapshot) {
        firstSnapshot = false;
        const uploads = [
          ...recordsToUpload(localItems, remote.items).map((record) => ({ record, kind: "item" as const })),
          ...recordsToUpload(localProjects, remote.projects).map((record) => ({ record, kind: "project" as const })),
        ];
        if (uploads.length > 0) {
          void saveClarityRecords(user.uid, uploads).catch((error: unknown) => {
            console.error("[Clarity] initial Firestore upload failed:", error);
            setSyncStatus("error");
          });
        }
      }
      setSyncStatus("synced");
    }, (error) => {
      console.error("[Clarity] Firestore listener failed:", error);
      setSyncStatus("error");
    });
    return unsubscribe;
  }, [isLoaded, user?.uid]);

  function persist(record: AppItem | Project, kind: "item" | "project") {
    if (!user?.uid) return;
    setSyncStatus("syncing");
    void saveClarityRecord(user.uid, record, kind)
      .then(() => setSyncStatus("synced"))
      .catch((error: unknown) => {
        console.error("[Clarity] Firestore write failed:", error);
        setSyncStatus("error");
      });
  }

  function addItem(text: string): AppItem {
    const now = new Date().toISOString();
    const item: AppItem = {
      id: generateUUID(),
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
    const next = [item, ...itemsRef.current];
    itemsRef.current = next;
    setItems(visibleRecords(next));
    void AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(next));
    persist(item, "item");
    return item;
  }

  function updateItem(id: string, updates: Partial<AppItem>) {
    const current = itemsRef.current.find((item) => item.id === id && !item.isDeleted);
    if (!current) return;
    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    const next = itemsRef.current.map((item) => (item.id === id ? updated : item));
    itemsRef.current = next;
    setItems(visibleRecords(next));
    void AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(next));
    persist(updated, "item");
  }

  function deleteItem(id: string) {
    const current = itemsRef.current.find((item) => item.id === id && !item.isDeleted);
    if (!current) return;
    const tombstone = { ...current, isDeleted: true, updatedAt: new Date().toISOString() };
    const next = itemsRef.current.map((item) => (item.id === id ? tombstone : item));
    itemsRef.current = next;
    setItems(visibleRecords(next));
    void AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(next));
    persist(tombstone, "item");
  }

  function markDone(id: string) {
    const current = itemsRef.current.find((item) => item.id === id && !item.isDeleted);
    if (!current) return;
    updateItem(id, { done: !current.done, doneAt: current.done ? null : new Date().toISOString() });
  }

  function addProject(name: string, area: Project["area"] = null): Project {
    const now = new Date().toISOString();
    const project: Project = {
      id: generateUUID(),
      name: name.trim(),
      area,
      createdAt: now,
      updatedAt: now,
      nextAction: "",
      status: "not-started",
    };
    const next = [project, ...projectsRef.current];
    projectsRef.current = next;
    setProjects(visibleRecords(next));
    void AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
    persist(project, "project");
    return project;
  }

  function updateProject(id: string, updates: Partial<Project>) {
    const current = projectsRef.current.find((project) => project.id === id && !project.isDeleted);
    if (!current) return;
    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    const next = projectsRef.current.map((project) => (project.id === id ? updated : project));
    projectsRef.current = next;
    setProjects(visibleRecords(next));
    void AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
    persist(updated, "project");
  }

  function deleteProject(id: string) {
    const current = projectsRef.current.find((project) => project.id === id && !project.isDeleted);
    if (!current) return;
    const tombstone = { ...current, isDeleted: true, updatedAt: new Date().toISOString() };
    const changedItems = itemsRef.current
      .filter((item) => item.projectId === id && !item.isDeleted)
      .map((item) => ({ ...item, projectId: null, updatedAt: new Date().toISOString() }));
    const changedById = new Map(changedItems.map((item) => [item.id, item]));
    const nextItems = itemsRef.current.map((item) => changedById.get(item.id) ?? item);
    const nextProjects = projectsRef.current.map((project) => (project.id === id ? tombstone : project));
    itemsRef.current = nextItems;
    projectsRef.current = nextProjects;
    setItems(visibleRecords(nextItems));
    setProjects(visibleRecords(nextProjects));
    void AsyncStorage.multiSet([
      [ITEMS_KEY, JSON.stringify(nextItems)],
      [PROJECTS_KEY, JSON.stringify(nextProjects)],
    ]);
    if (user?.uid) {
      void saveClarityRecords(user.uid, [
        ...changedItems.map((record) => ({ record, kind: "item" as const })),
        { record: tombstone, kind: "project" as const },
      ]).catch(() => setSyncStatus("error"));
    }
  }

  return (
    <AppDataContext.Provider value={{ items, projects, syncStatus, addItem, updateItem, deleteItem, markDone, addProject, updateProject, deleteProject, isLoaded }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData must be used inside AppDataProvider");
  return context;
}
