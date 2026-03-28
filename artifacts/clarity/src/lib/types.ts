export type ItemType = 'task' | 'project' | 'event' | 'note';
export type AreaOfLife = 'work' | 'home' | 'family' | 'personal';
export type Timing = 'today' | 'this-week' | 'later';
export type ProjectStatus = 'not-started' | 'in-progress' | 'done';

export interface CapturedItem {
  id: string;
  text: string;
  createdAt: string;
  type: ItemType | null;
  area: AreaOfLife | null;
  timing: Timing | null;
  isTriaged: boolean;
  isDeleted: boolean;
  isPriority: boolean;
  isQuickWin: boolean;
  isCompleted: boolean;
  scheduledDate: string | null;
  projectId: string | null;
  // AI-ready placeholder fields (unused in MVP)
  aiCategory?: ItemType | null;
  aiSuggestions?: string[] | null;
}

// A concrete sub-task that belongs to a Project
export interface Task {
  id: string;
  projectId: string;
  text: string;
  isCompleted: boolean;
  createdAt: string;
  // AI-ready placeholder
  aiSuggested?: boolean;
}

export interface Project {
  id: string;
  title: string;
  area: AreaOfLife;
  dueDate: string | null;
  nextAction: string;
  status: ProjectStatus;
  createdAt: string;
  // AI-ready placeholder
  aiNextAction?: string | null;
}

export interface UserSettings {
  largeText: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
}

export interface AppData {
  items: CapturedItem[];
  projects: Project[];
  settings: UserSettings;
  addItem: (text: string) => void;
  updateItem: (id: string, updates: Partial<CapturedItem>) => void;
  completeItem: (id: string) => void;
  addProject: (p: Omit<Project, 'id' | 'createdAt'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  updateSettings: (s: UserSettings) => void;
}
