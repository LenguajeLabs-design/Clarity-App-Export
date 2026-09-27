import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";
import { CapturedItem, Project } from "./types";
import { db } from "./firebase";

type SyncKind = "item" | "project";
type SyncRecord = (CapturedItem | Project) & { kind?: SyncKind };

function collectionFor(userId: string) {
  if (!db) return null;
  return collection(db, "users", userId, "clarity");
}

function timestampToIso(value: unknown): string | null {
  if (value && typeof value === "object" && "toDate" in value) {
    const date = (value as Timestamp).toDate();
    return date.toISOString();
  }
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return value;
  return null;
}

function recordFromDocument(data: DocumentData): SyncRecord {
  const createdAt = typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString();
  // Firestore's server timestamp reflects upload time, not the user's edit
  // time. Prefer the client timestamp for deterministic phone/browser merges.
  const clientUpdatedAt = typeof data.clientUpdatedAt === "string" && !Number.isNaN(Date.parse(data.clientUpdatedAt))
    ? data.clientUpdatedAt
    : null;
  return {
    ...data,
    id: String(data.id ?? ""),
    createdAt,
    updatedAt: clientUpdatedAt ?? timestampToIso(data.updatedAt) ?? createdAt,
    isDeleted: Boolean(data.isDeleted),
  } as SyncRecord;
}

export function subscribeToClarity(
  userId: string,
  onData: (data: { items: CapturedItem[]; projects: Project[] }) => void,
  onError: (error: Error) => void,
): () => void {
  const records = collectionFor(userId);
  if (!records) {
    onError(new Error("Firebase is not configured"));
    return () => undefined;
  }
  return onSnapshot(records, (snapshot) => {
    const items: CapturedItem[] = [];
    const projects: Project[] = [];
    snapshot.docs.forEach((entry) => {
      const record = recordFromDocument(entry.data());
      if (record.kind === "project") projects.push(record as Project);
      else items.push(record as CapturedItem);
    });
    onData({ items, projects });
  }, (error) => onError(error));
}

export async function saveClarityRecord(
  userId: string,
  record: CapturedItem | Project,
  kind: SyncKind,
  clientUpdatedAtOverride?: string,
): Promise<void> {
  const records = collectionFor(userId);
  if (!records) throw new Error("Firebase is not configured");
  await setDoc(doc(records, record.id), {
    ...record,
    kind,
    id: record.id,
    clientUpdatedAt: clientUpdatedAtOverride ?? record.updatedAt ?? record.createdAt,
    updatedAt: serverTimestamp(),
  });
}

export async function saveClarityRecords(
  userId: string,
  recordEntries: Array<{ record: CapturedItem | Project; kind: SyncKind }>,
  clientUpdatedAtOverride?: string,
): Promise<void> {
  const records = collectionFor(userId);
  if (!records || !db) throw new Error("Firebase is not configured");

  // Firestore batches are capped at 500 writes. Keep a lower ceiling so a
  // large phone history uploads predictably instead of opening hundreds of
  // concurrent requests at once.
  for (let start = 0; start < recordEntries.length; start += 400) {
    const batch = writeBatch(db);
    const chunk = recordEntries.slice(start, start + 400);
    chunk.forEach(({ record, kind }) => {
      batch.set(doc(records, record.id), {
        ...record,
        kind,
        id: record.id,
        clientUpdatedAt: clientUpdatedAtOverride ?? record.updatedAt ?? record.createdAt,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }
}

/**
 * Make one device's local collection the cloud source of truth. Existing
 * cloud-only records become tombstones instead of resurfacing on another
 * device, while the phone's own records keep the same promotion timestamp.
 */
export async function replaceClarityRecords(
  userId: string,
  recordEntries: Array<{ record: CapturedItem | Project; kind: SyncKind }>,
  clientUpdatedAtOverride: string,
): Promise<void> {
  const records = collectionFor(userId);
  if (!records) throw new Error("Firebase is not configured");

  const existing = await getDocs(records);
  const localIds = new Set(recordEntries.map(({ record }) => record.id));
  const tombstones = existing.docs
    .filter((entry) => !localIds.has(entry.id))
    .map((entry) => {
      const record = recordFromDocument(entry.data());
      return {
        record: { ...record, isDeleted: true, updatedAt: clientUpdatedAtOverride } as CapturedItem | Project,
        kind: record.kind === "project" ? "project" as const : "item" as const,
      };
    });

  await saveClarityRecords(userId, [...recordEntries, ...tombstones], clientUpdatedAtOverride);
}
