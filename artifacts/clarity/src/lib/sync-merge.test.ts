import assert from "node:assert/strict";
import test from "node:test";
import { mergeByTimestamp, recordsToUpload } from "./sync-merge.ts";

const old = { id: "task-1", createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-02T00:00:00Z", isDeleted: false };
const recent = { ...old, updatedAt: "2026-09-03T00:00:00Z", isDeleted: true };

test("a new browser downloads cloud records without preparing any uploads or deletions", () => {
  const cloud = [recent, { ...old, id: "project-1" }];
  assert.deepEqual(mergeByTimestamp([], cloud), cloud);
  assert.deepEqual(recordsToUpload([], cloud), []);
});

test("a stale browser cannot revive a newer cloud tombstone", () => {
  assert.deepEqual(mergeByTimestamp([old], [recent]), [recent]);
  assert.deepEqual(recordsToUpload([old], [recent]), []);
});

test("only newer local edits and local-only records are uploaded", () => {
  const localOnly = { ...old, id: "task-2" };
  assert.deepEqual(recordsToUpload([recent, localOnly], [old]), [recent, localOnly]);
  assert.deepEqual(mergeByTimestamp([recent], [old]), [recent]);
});

test("equal timestamps favor the cloud copy and do not cause repeat uploads", () => {
  const cloud = { ...old, isDeleted: true };
  assert.deepEqual(mergeByTimestamp([old], [cloud]), [cloud]);
  assert.deepEqual(recordsToUpload([old], [cloud]), []);
});
