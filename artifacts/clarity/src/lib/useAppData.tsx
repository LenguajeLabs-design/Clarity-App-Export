import { createContext, useContext, useEffect } from "react";
import { useLocalStorage } from "./use-local-storage";
import { CapturedItem, Project, UserSettings } from "./types";
import { v4 as uuidv4 } from 'uuid';

const SEED_ITEMS: CapturedItem[] = [
  { id: uuidv4(), text: "Call the dentist about Maya's appointment", createdAt: new Date().toISOString(), type: null, area: null, timing: null, isTriaged: false, isDeleted: false, isPriority: false, isQuickWin: false, isCompleted: false, scheduledDate: null, projectId: null },
  { id: uuidv4(), text: "Reply to parent emails about field trip", createdAt: new Date().toISOString(), type: 'task', area: 'work', timing: 'today', isTriaged: true, isDeleted: false, isPriority: true, isQuickWin: false, isCompleted: false, scheduledDate: null, projectId: null },
  { id: uuidv4(), text: "Pick up more printer paper", createdAt: new Date().toISOString(), type: 'task', area: 'home', timing: 'this-week', isTriaged: true, isDeleted: false, isPriority: false, isQuickWin: true, isCompleted: false, scheduledDate: null, projectId: null },
  { id: uuidv4(), text: "Plan family vacation — summer", createdAt: new Date().toISOString(), type: null, area: null, timing: null, isTriaged: false, isDeleted: false, isPriority: false, isQuickWin: false, isCompleted: false, scheduledDate: null, projectId: null },
  { id: uuidv4(), text: "Submit report card grades by Friday", createdAt: new Date().toISOString(), type: 'task', area: 'work', timing: 'today', isTriaged: true, isDeleted: false, isPriority: true, isQuickWin: false, isCompleted: false, scheduledDate: null, projectId: null },
  { id: uuidv4(), text: "Call Mom back", createdAt: new Date().toISOString(), type: null, area: null, timing: null, isTriaged: false, isDeleted: false, isPriority: false, isQuickWin: false, isCompleted: false, scheduledDate: null, projectId: null },
  { id: uuidv4(), text: "Reschedule dentist for myself", createdAt: new Date().toISOString(), type: 'task', area: 'personal', timing: 'later', isTriaged: true, isDeleted: false, isPriority: false, isQuickWin: false, isCompleted: false, scheduledDate: null, projectId: null },
  { id: uuidv4(), text: "Buy birthday gift for Jake", createdAt: new Date().toISOString(), type: 'task', area: 'family', timing: 'this-week', isTriaged: true, isDeleted: false, isPriority: false, isQuickWin: true, isCompleted: false, scheduledDate: null, projectId: null },
  { id: uuidv4(), text: "Team meeting notes to send", createdAt: new Date().toISOString(), type: 'task', area: 'work', timing: 'today', isTriaged: true, isDeleted: false, isPriority: false, isQuickWin: true, isCompleted: false, scheduledDate: null, projectId: null },
  { id: uuidv4(), text: "Sign permission slip for field trip", createdAt: new Date().toISOString(), type: 'task', area: 'work', timing: 'today', isTriaged: true, isDeleted: false, isPriority: true, isQuickWin: false, isCompleted: false, scheduledDate: null, projectId: null },
];

const SEED_PROJECTS: Project[] = [
  { id: uuidv4(), title: "Parent Workshop", area: "work", nextAction: "Finalize slide deck", status: "in-progress", createdAt: new Date().toISOString(), dueDate: null },
  { id: uuidv4(), title: "Report Cards", area: "work", nextAction: "Finish 3 remaining narratives", status: "in-progress", dueDate: "2026-04-04", createdAt: new Date().toISOString() },
  { id: uuidv4(), title: "Move Classroom", area: "work", nextAction: "Sort books into keep/donate piles", status: "not-started", createdAt: new Date().toISOString(), dueDate: null },
  { id: uuidv4(), title: "Family Summer Travel", area: "family", nextAction: "Research destinations — mountains or beach?", status: "not-started", createdAt: new Date().toISOString(), dueDate: null },
];

export const AppDataContext = createContext<any>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [seeded, setSeeded] = useLocalStorage('clarity_seeded', false);
  const [items, setItems] = useLocalStorage<CapturedItem[]>('clarity_items', []);
  const [projects, setProjects] = useLocalStorage<Project[]>('clarity_projects', []);
  const [settings, setSettings] = useLocalStorage<UserSettings>('clarity_settings', {
    largeText: false, highContrast: false, reducedMotion: false
  });

  useEffect(() => {
    if (!seeded) {
      setItems(SEED_ITEMS);
      setProjects(SEED_PROJECTS);
      setSeeded(true);
    }
  }, [seeded, setItems, setProjects, setSeeded]);

  const addItem = (text: string) => {
    setItems([{
      id: uuidv4(), text, createdAt: new Date().toISOString(),
      type: null, area: null, timing: null,
      isTriaged: false, isDeleted: false, isPriority: false, isQuickWin: false, isCompleted: false,
      scheduledDate: null, projectId: null
    }, ...items]);
  };

  const updateItem = (id: string, updates: Partial<CapturedItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const completeItem = (id: string) => {
    updateItem(id, { isCompleted: true });
  };

  const addProject = (p: Omit<Project, 'id' | 'createdAt'>) => {
    setProjects([{ ...p, id: uuidv4(), createdAt: new Date().toISOString() }, ...projects]);
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  return (
    <AppDataContext.Provider value={{
      items, projects, settings,
      addItem, updateItem, completeItem,
      addProject, updateProject, updateSettings: setSettings
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData must be used within AppDataProvider");
  return context;
};
