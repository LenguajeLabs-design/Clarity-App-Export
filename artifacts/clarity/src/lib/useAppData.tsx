import { createContext, useContext, useEffect } from "react";
import { useLocalStorage } from "./use-local-storage";
import { CapturedItem, Project, UserSettings, AppData } from "./types";
import { v4 as uuidv4 } from 'uuid';

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const BLANK_ITEM = (text: string): CapturedItem => ({
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

const SEED_ITEMS: CapturedItem[] = [
  {
    ...BLANK_ITEM("Call the dentist about Maya's appointment"),
  },
  {
    ...BLANK_ITEM("Reply to parent emails about field trip"),
    type: 'task', area: 'work', timing: 'today',
    isTriaged: true, isPriority: true,
    scheduledDate: daysFromNow(0),
    nextAction: 'Open email and reply to 3 waiting parents',
  },
  {
    ...BLANK_ITEM("Pick up more printer paper"),
    type: 'task', area: 'home', timing: 'this-week',
    isTriaged: true, isQuickWin: true,
    scheduledDate: daysFromNow(2),
    nextAction: 'Stop at the office supply store',
  },
  {
    ...BLANK_ITEM("Plan family vacation — summer"),
  },
  {
    ...BLANK_ITEM("Submit report card grades by Friday"),
    type: 'task', area: 'work', timing: 'today',
    isTriaged: true, isPriority: true,
    scheduledDate: daysFromNow(0),
    nextAction: 'Open gradebook and finalize remaining 5 students',
  },
  {
    ...BLANK_ITEM("Call Mom back"),
  },
  {
    ...BLANK_ITEM("Reschedule dentist for myself"),
    type: 'task', area: 'personal', timing: 'this-week',
    isTriaged: true,
    scheduledDate: daysFromNow(3),
    nextAction: 'Find the number and call',
  },
  {
    ...BLANK_ITEM("Buy birthday gift for Jake"),
    type: 'task', area: 'family', timing: 'this-week',
    isTriaged: true, isQuickWin: true,
    scheduledDate: daysFromNow(1),
    nextAction: 'Order something on Amazon',
  },
  {
    ...BLANK_ITEM("Waiting on admin approval for field trip budget"),
    type: 'task', area: 'work', timing: 'this-week',
    isTriaged: true,
    waitingOn: 'Principal Garcia',
    scheduledDate: daysFromNow(2),
    nextAction: 'Follow up if no response by Thursday',
  },
  {
    ...BLANK_ITEM("Sign permission slip for field trip"),
    type: 'task', area: 'work', timing: 'today',
    isTriaged: true, isPriority: true,
    scheduledDate: daysFromNow(0),
    nextAction: 'Print, sign, and put in Maya\'s folder',
  },
];

const SEED_PROJECTS: Project[] = [
  {
    id: uuidv4(), title: "Parent Workshop", area: "work",
    nextAction: "Finalize slide deck", status: "in-progress",
    createdAt: new Date().toISOString(), dueDate: daysFromNow(7),
  },
  {
    id: uuidv4(), title: "Report Cards", area: "work",
    nextAction: "Finish 3 remaining narratives", status: "in-progress",
    dueDate: daysFromNow(7), createdAt: new Date().toISOString(),
  },
  {
    id: uuidv4(), title: "Move Classroom", area: "work",
    nextAction: "Sort books into keep/donate piles", status: "not-started",
    createdAt: new Date().toISOString(), dueDate: null,
  },
  {
    id: uuidv4(), title: "Family Summer Travel", area: "family",
    nextAction: "Research destinations — mountains or beach?", status: "not-started",
    createdAt: new Date().toISOString(), dueDate: null,
  },
];

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [seeded, setSeeded] = useLocalStorage<boolean>('clarity_seeded_v2', false);
  const [items, setItems] = useLocalStorage<CapturedItem[]>('clarity_items', []);
  const [projects, setProjects] = useLocalStorage<Project[]>('clarity_projects', []);
  const [settings, setSettings] = useLocalStorage<UserSettings>('clarity_settings', {
    largeText: false, highContrast: false, reducedMotion: false,
  });

  useEffect(() => {
    if (!seeded) {
      setItems(SEED_ITEMS);
      setProjects(SEED_PROJECTS);
      setSeeded(true);
    }
  }, [seeded, setItems, setProjects, setSeeded]);

  const addItem = (text: string) => {
    setItems((prev) => [BLANK_ITEM(text), ...prev]);
  };

  const addItemsBatch = (texts: string[]) => {
    const newItems = texts.filter((t) => t.trim()).map((t) => BLANK_ITEM(t.trim()));
    setItems((prev) => [...newItems, ...prev]);
  };

  const updateItem = (id: string, updates: Partial<CapturedItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  };

  const completeItem = (id: string) => {
    updateItem(id, { isCompleted: true });
  };

  const addProject = (p: Omit<Project, 'id' | 'createdAt'>) => {
    const newProject: Project = { ...p, id: uuidv4(), createdAt: new Date().toISOString() };
    setProjects((prev) => [newProject, ...prev]);
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const value: AppData = {
    items,
    projects,
    settings,
    addItem,
    addItemsBatch,
    updateItem,
    completeItem,
    addProject,
    updateProject,
    updateSettings: setSettings,
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
