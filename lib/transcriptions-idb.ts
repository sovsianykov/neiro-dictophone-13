import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type LocalTranscription = {
  id?: number;
  text: string;
  createdAt: number;
  synced: boolean;
  /** Server-assigned id after sync */
  serverId?: string;
  /** Book id — filled after sync or if pre-assigned */
  bookId?: string;
  /** Chapter number — filled after sync */
  chapter?: number;
};

interface DictophoneDB extends DBSchema {
  transcriptions: {
    key: number;
    value: LocalTranscription;
  };
}

const DB_NAME = "dictophone";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<DictophoneDB>> | null = null;

function getDb(): Promise<IDBPDatabase<DictophoneDB>> {
  if (!dbPromise) {
    dbPromise = openDB<DictophoneDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("transcriptions", {
            keyPath: "id",
            autoIncrement: true,
          });
        }
        // v2: no structural changes; new optional fields are transparent to IDB
      },
    });
  }
  return dbPromise;
}

export async function addTranscriptionLocal(
  entry: Omit<LocalTranscription, "id" | "synced"> & { synced?: boolean },
): Promise<number> {
  const db = await getDb();
  const id = await db.add("transcriptions", {
    text: entry.text,
    createdAt: entry.createdAt,
    synced: entry.synced ?? false,
    ...(entry.serverId !== undefined && { serverId: entry.serverId }),
    ...(entry.bookId !== undefined && { bookId: entry.bookId }),
    ...(entry.chapter !== undefined && { chapter: entry.chapter }),
  });
  return id as number;
}

export async function listTranscriptionsLocal(): Promise<LocalTranscription[]> {
  const db = await getDb();
  const all = await db.getAll("transcriptions");
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function markSyncedLocal(
  localId: number,
  meta?: { serverId?: string; bookId?: string; chapter?: number },
) {
  const db = await getDb();
  const row = await db.get("transcriptions", localId);
  if (!row) return;
  row.synced = true;
  if (meta?.serverId !== undefined) row.serverId = meta.serverId;
  if (meta?.bookId !== undefined) row.bookId = meta.bookId;
  if (meta?.chapter !== undefined) row.chapter = meta.chapter;
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
