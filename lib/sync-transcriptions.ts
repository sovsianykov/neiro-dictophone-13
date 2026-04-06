import { listUnsyncedLocal, markSyncedLocal } from "@/lib/transcriptions-idb";

export type SyncResult = { synced: number; failed: number };

/**
 * POSTs unsynced IndexedDB rows to /api/transcriptions and marks them synced on success.
 */
export async function syncTranscriptions(): Promise<SyncResult> {
  const pending = await listUnsyncedLocal();
  let synced = 0;
  let failed = 0;

  for (const row of pending) {
    if (row.id == null) continue;
    try {
      const res = await fetch("/api/transcriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: row.text,
          createdAt: row.createdAt,
        }),
      });
      if (res.ok) {
        await markSyncedLocal(row.id);
        synced += 1;
      } else {
        failed += 1;
      }
    } catch {
      failed += 1;
    }
  }

  return { synced, failed };
}
