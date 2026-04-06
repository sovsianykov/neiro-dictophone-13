import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type LocalTranscription = {
  id?: number;
  text: string;
  createdAt: number;
  synced: boolean;
};

interface DictophoneDB extends DBSchema {
  transcriptions: {
    key: number;
    value: LocalTranscription;
  };
}

const DB_NAME = "dictophone";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<DictophoneDB>> | null = null;

function getDb(): Promise<IDBPDatabase<DictophoneDB>> {
  if (!dbPromise) {
    dbPromise = openDB<DictophoneDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("transcriptions", {
          keyPath: "id",
          autoIncrement: true,
        });
      },
    });
  }
  return dbPromise;
}

export async function addTranscriptionLocal(entry: Omit<LocalTranscription, "id" | "synced"> & { synced?: boolean }) {
  const db = await getDb();
  const id = await db.add("transcriptions", {
    text: entry.text,
    createdAt: entry.createdAt,
    synced: entry.synced ?? false,
  });
  return id as number;
}

export async function listTranscriptionsLocal(): Promise<LocalTranscription[]> {
  const db = await getDb();
  const all = await db.getAll("transcriptions");
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function markSyncedLocal(localId: number) {
  const db = await getDb();
  const row = await db.get("transcriptions", localId);
  if (!row) return;
  row.synced = true;
  await db.put("transcriptions", row);
}

export async function listUnsyncedLocal(): Promise<LocalTranscription[]> {
  const db = await getDb();
  const all = await db.getAll("transcriptions");
  return all.filter((r) => !r.synced).sort((a, b) => a.createdAt - b.createdAt);
}

export async function deleteTranscriptionLocal(localId: number) {
  const db = await getDb();
  await db.delete("transcriptions", localId);
}
