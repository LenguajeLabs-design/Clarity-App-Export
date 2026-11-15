import assert from "node:assert/strict";
import test from "node:test";
import { createBackup, parseBackup } from "./backup.ts";

const data = {
  items: [{
    id: "task-1", text: "Synthetic task", createdAt: "2026-09-01T09:00:00.000Z", updatedAt: "2026-09-02T10:00:00.000Z",
    completedAt: "2026-09-02T10:00:00.000Z", type: "task" as const, area: "work" as const, timing: "today" as const,
    isTriaged: true, isDeleted: false, isPriority: true, isQuickWin: true, isCompleted: true,
    scheduledDate: "2026-09-02", projectId: "project-1", nextAction: "Send draft", waitingOn: "Reviewer",
  }],
  projects: [{
    id: "project-1", title: "Synthetic project", area: "work" as const, dueDate: "2026-09-03", nextAction: "Review draft",
    status: "in-progress" as const, createdAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-09-02T09:00:00.000Z", isDeleted: false,
  }],
  settings: { largeText: true, highContrast: true, reducedMotion: true, theme: "dark" as const },
};

test("versioned JSON round trip preserves IDs, dates, flags, settings, and relationships", () => {
  const backup = createBackup(data, new Date("2026-11-15T10:00:00Z"));
  assert.equal(backup.version, 1);
  assert.equal(backup.exportedAt, "2026-11-15T10:00:00.000Z");
  assert.deepEqual(parseBackup(JSON.parse(JSON.stringify(backup))), data);
});

test("exports only known fields, excluding authentication and arbitrary secrets", () => {
  const untrusted = { ...data, token: "synthetic-secret", items: [{ ...data.items[0], apiKey: "synthetic-secret" }], settings: { ...data.settings, token: "synthetic-secret" } };
  assert.ok(!JSON.stringify(createBackup(untrusted)).includes("synthetic-secret"));
});

test("all three existing import formats remain supported", () => {
  assert.deepEqual(parseBackup({ ...data, syncedAt: "2026-11-01T00:00:00Z" }), data);
  assert.deepEqual(parseBackup({ clarity_items: JSON.stringify(data.items), clarity_projects: JSON.stringify(data.projects), clarity_settings: JSON.stringify(data.settings) }), data);
  assert.deepEqual(parseBackup(data.items, data.settings), { ...data, projects: [] });
});

test("invalid records, duplicate IDs, corrupt localStorage values, and future versions are rejected", () => {
  const original = JSON.stringify(data);
  for (const value of [
    null,
    { ...data, items: [{ ...data.items[0], isCompleted: "yes" }] },
    { ...data, items: [{ ...data.items[0], updatedAt: "not-a-date" }] },
    { ...data, items: [{ ...data.items[0], scheduledDate: "2026-02-30" }] },
    { ...data, items: [data.items[0], data.items[0]] },
    { ...data, projects: [{ ...data.projects[0], id: "task-1" }] },
    { clarity_items: "broken json" },
    { ...createBackup(data), version: 2 },
    { ...createBackup(data), exportedAt: "invalid" },
  ]) assert.throws(() => parseBackup(value));
  assert.equal(JSON.stringify(data), original);
});

test("empty backups and deletion tombstones round trip without reviving records", () => {
  assert.deepEqual(parseBackup(createBackup({ ...data, items: [], projects: [] })), { ...data, items: [], projects: [] });
  const deleted = { ...data, items: [{ ...data.items[0], isDeleted: true }], projects: [{ ...data.projects[0], isDeleted: true }] };
  assert.deepEqual(parseBackup(createBackup(deleted)), deleted);
});
