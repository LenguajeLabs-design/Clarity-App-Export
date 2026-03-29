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
  // Next visible action identified during triage
  nextAction: string | null;
  // Who this is waiting on (for delegated tasks)
  waitingOn: string | null;
}

// A concrete sub-task that belongs to a Project
export interface Task {
  id: string;
  projectId: string;
  text: string;
  isCompleted: boolean;
  createdAt: string;
}

export interface Project {
  id: string;
  title: string;
  area: AreaOfLife;
  dueDate: string | null;
  nextAction: string;
  status: ProjectStatus;
  createdAt: string;
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
  addItemsBatch: (texts: string[]) => void;
  addItemsBatchStructured: (structured: Array<{
    text: string;
    type?: ItemType | null;
    area?: AreaOfLife | null;
    timing?: Timing | null;
  }>) => void;
  updateItem: (id: string, updates: Partial<CapturedItem>) => void;
  completeItem: (id: string) => void;
  addProject: (p: Omit<Project, 'id' | 'createdAt'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  updateSettings: (s: UserSettings) => void;
  /** Replace the entire local dataset at once (used after GitHub sync pull).
   *  Pass syncedAt so clarity_last_modified reflects when the remote data was
   *  last modified, not the moment of replacement. */
  replaceAllData: (items: CapturedItem[], projects: Project[], settings: UserSettings, syncedAt?: string) => void;
}
