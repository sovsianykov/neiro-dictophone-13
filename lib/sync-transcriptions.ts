import { listUnsyncedLocal, markSyncedLocal } from "@/lib/transcriptions-idb";

export type SyncResult = { synced: number; failed: number; lastServerId?: string };

/**
 * POSTs unsynced IndexedDB rows to /api/transcriptions and marks them synced on success.
 * Returns the serverId of the last synced record so callers can redirect to its edit page.
 */
export async function syncTranscriptions(): Promise<SyncResult> {
  const pending = await listUnsyncedLocal();
  let synced = 0;
  let failed = 0;
  let lastServerId: string | undefined;

  for (const row of pending) {
    if (row.id == null) continue;
    try {
      const res = await fetch("/api/transcriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: row.text,
          createdAt: row.createdAt,
          ...(row.bookId ? { bookId: row.bookId } : {}),
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as { id?: string; bookId?: string; chapter?: number };
        await markSyncedLocal(row.id, {
          serverId: json.id,
          bookId: json.bookId,
          chapter: json.chapter,
        });
        if (json.id) lastServerId = json.id;
        synced += 1;
      } else {
        failed += 1;
      }
    } catch {
      failed += 1;
    }
  }

  return { synced, failed, lastServerId };
}
