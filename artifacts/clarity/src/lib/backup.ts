import { z } from "zod";
import type { CapturedItem, Project, UserSettings } from "./types";

export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

const timestamp = z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid timestamp");
const id = z.string().min(1).max(200).refine((value) => !value.includes("/"), "Invalid record ID");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Invalid date");
const area = z.enum(["work", "home", "family", "personal"]);

const itemSchema = z.object({
  id,
  text: z.string().max(100_000),
  createdAt: timestamp,
  updatedAt: timestamp.optional(),
  completedAt: timestamp.nullable().default(null),
  type: z.enum(["task", "project", "event", "note"]).nullable().default(null),
  area: area.nullable().default(null),
  timing: z.enum(["today", "this-week", "later"]).nullable().default(null),
  isTriaged: z.boolean().default(false),
  isDeleted: z.boolean().default(false),
  isPriority: z.boolean().default(false),
  isQuickWin: z.boolean().default(false),
  isCompleted: z.boolean().default(false),
  scheduledDate: date.nullable().default(null),
  projectId: id.nullable().default(null),
  nextAction: z.string().nullable().default(null),
  waitingOn: z.string().nullable().default(null),
});

const projectSchema = z.object({
  id,
  title: z.string().max(100_000),
  area,
  dueDate: date.nullable().default(null),
  nextAction: z.string().default(""),
  status: z.enum(["not-started", "in-progress", "done"]),
  createdAt: timestamp,
  updatedAt: timestamp.optional(),
  isDeleted: z.boolean().optional(),
});

const settingsSchema = z.object({
  largeText: z.boolean(),
  highContrast: z.boolean(),
  reducedMotion: z.boolean(),
  theme: z.enum(["light", "dark", "auto"]).optional(),
});

const dataSchema = z.object({
  items: z.array(itemSchema).max(100_000),
  projects: z.array(projectSchema).max(100_000),
  settings: settingsSchema,
}).superRefine((data, context) => {
  const ids = new Set<string>();
  for (const [kind, records] of [["items", data.items], ["projects", data.projects]] as const) {
    records.forEach((record, index) => {
      if (ids.has(record.id)) context.addIssue({ code: "custom", path: [kind, index, "id"], message: "Duplicate record ID" });
      ids.add(record.id);
    });
  }
});

export interface BackupData {
  items: CapturedItem[];
  projects: Project[];
  settings: UserSettings;
}

export interface ClarityBackup extends BackupData {
  format: "clarity-backup";
  version: typeof BACKUP_VERSION;
  exportedAt: string;
}

const defaultSettings: UserSettings = {
  largeText: false, highContrast: false, reducedMotion: false, theme: "auto",
};

function validateData(value: unknown): BackupData {
  const result = dataSchema.safeParse(value);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new Error(`Invalid backup: ${first.path.join(".") || "data"} — ${first.message}. Nothing was imported.`);
  }
  return result.data;
}

/** Explicit fields and Zod's object stripping exclude auth state and unknown secrets. */
export function createBackup(data: BackupData, now = new Date()): ClarityBackup {
  return { format: "clarity-backup", version: BACKUP_VERSION, exportedAt: now.toISOString(), ...validateData(data) };
}

export function parseBackup(value: unknown, fallbackSettings = defaultSettings): BackupData {
  if (Array.isArray(value)) return validateData({ items: value, projects: [], settings: fallbackSettings });
  if (!value || typeof value !== "object") throw new Error("Choose a Clarity JSON backup. Nothing was imported.");
  const source = value as Record<string, unknown>;
  if ("format" in source || "version" in source) {
    if (source.format !== "clarity-backup" || source.version !== BACKUP_VERSION) {
      throw new Error("This backup format or version is not supported. Nothing was imported.");
    }
    if (!timestamp.safeParse(source.exportedAt).success) throw new Error("The backup export timestamp is invalid. Nothing was imported.");
    return validateData(source);
  }
  if ("items" in source) {
    return validateData({ items: source.items, projects: source.projects ?? [], settings: source.settings ?? fallbackSettings });
  }
  if ("clarity_items" in source || "clarity_projects" in source) {
    const decode = (entry: unknown, fallback: unknown) => entry === undefined ? fallback : typeof entry === "string" ? JSON.parse(entry) : entry;
    return validateData({
      items: decode(source.clarity_items, []),
      projects: decode(source.clarity_projects, []),
      settings: decode(source.clarity_settings, fallbackSettings),
    });
  }
  throw new Error("Unrecognized file. Choose a Clarity export, localStorage backup, or task array. Nothing was imported.");
}

export function downloadBackup(data: BackupData): void {
  const backup = createBackup(data);
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `clarity-backup-${backup.exportedAt.replace(/[:.]/g, "-")}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  // Give mobile browsers time to start saving the file before releasing its URL.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
