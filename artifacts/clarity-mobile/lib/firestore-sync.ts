import { collection, doc, onSnapshot, serverTimestamp, setDoc, type DocumentData, type Timestamp } from "firebase/firestore";
import { AppItem, Project } from "@/lib/types";
import { db } from "@/lib/firebase";

type SyncRecord = (AppItem | Project) & { kind?: "item" | "project" };

function recordsFor(userId: string) {
  if (!db) return null;
  return collection(db, "users", userId, "clarity");
}

function timestampToIso(value: unknown): string | null {
  if (value && typeof value === "object" && "toDate" in value) return (value as Timestamp).toDate().toISOString();
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return value;
  return null;
}

function fromDocument(data: DocumentData): SyncRecord {
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
  onData: (data: { items: AppItem[]; projects: Project[] }) => void,
  onError: (error: Error) => void,
): () => void {
  const records = recordsFor(userId);
  if (!records) {
    onError(new Error("Firebase is not configured"));
    return () => undefined;
  }
  return onSnapshot(records, (snapshot) => {
    const items: AppItem[] = [];
    const projects: Project[] = [];
    snapshot.docs.forEach((entry) => {
      const record = fromDocument(entry.data());
      if (record.kind === "project") projects.push(record as Project);
      else items.push(record as AppItem);
    });
    onData({ items, projects });
  }, onError);
}

export async function saveClarityRecord(userId: string, record: AppItem | Project, kind: "item" | "project"): Promise<void> {
  const records = recordsFor(userId);
  if (!records) throw new Error("Firebase is not configured");
  await setDoc(doc(records, record.id), {
    ...record,
    id: record.id,
    kind,
    clientUpdatedAt: record.updatedAt,
    updatedAt: serverTimestamp(),
  });
}

export async function saveClarityRecords(
  userId: string,
  records: Array<{ record: AppItem | Project; kind: "item" | "project" }>,
): Promise<void> {
  await Promise.all(records.map(({ record, kind }) => saveClarityRecord(userId, record, kind)));
}
