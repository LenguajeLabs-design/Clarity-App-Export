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

export interface Project {
  id: string;
  title: string;
  area: AreaOfLife;
  dueDate: string | null;
  nextAction: string;
  status: ProjectStatus;
  createdAt: string;
  aiNextAction?: string | null;
}

export interface UserSettings {
  largeText: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
}
