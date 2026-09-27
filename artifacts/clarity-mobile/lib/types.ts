export type ItemType = "task" | "project" | "event" | "note";
export type Area = "work" | "home" | "family" | "personal";
export type Timing = "today" | "this-week" | "later";

export interface AppItem {
  id: string;
  text: string;
  type: ItemType | null;
  area: Area | null;
  timing: Timing | null;
  done: boolean;
  doneAt: string | null;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
  /** Tombstones are kept briefly so deletes can sync across devices. */
  isDeleted?: boolean;
}

export interface Project {
  id: string;
  name: string;
  area: Area | null;
  createdAt: string;
  updatedAt: string;
  dueDate?: string | null;
  nextAction?: string;
  status?: "not-started" | "in-progress" | "done";
  /** Tombstones are kept briefly so deletes can sync across devices. */
  isDeleted?: boolean;
}

export const AREA_LABEL: Record<Area, string> = {
  work: "Work",
  home: "Home",
  family: "Family",
  personal: "Personal",
};

export const TIMING_LABEL: Record<Timing, string> = {
  today: "Today",
  "this-week": "This week",
  later: "Later",
};

export const TYPE_LABEL: Record<ItemType, string> = {
  task: "Task",
  project: "Project",
  event: "Event",
  note: "Note",
};
