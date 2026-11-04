import type { LumiDb, OutboxEntry, SyncTable } from '../db';
import type { SyncTransport } from './transport';

export const SYNC_TABLES: SyncTable[] = ['children', 'sleep_sessions'];
const PAGE = 500;
const BATCH = 100;

/** Outbox → сервер. Успішні записи видаляються з черги, якщо їх не змінили під час надсилання. */
export async function push(db: LumiDb, t: SyncTransport): Promise<number> {
  let sent = 0;
  for (;;) {
    const batch = await db.outbox.orderBy('seq').limit(BATCH).toArray();
    if (!batch.length) return sent;
    for (const table of SYNC_TABLES) {
      const items = batch.filter((e) => e.table === table);
      if (!items.length) continue;
      try {
        await t.upsert(table, items.map((e) => e.payload) as never);
      } catch (err) {
        await markFailed(db, items, err);
        throw err;
      }
      await db.transaction('rw', db.outbox, async () => {
        for (const e of items) {
          const cur = e.seq != null ? await db.outbox.get(e.seq) : undefined;
          // рядок змінили, поки йшов запит — залишаємо новий стан у черзі
          if (cur && cur.queued_at === e.queued_at) await db.outbox.delete(e.seq!);
        }
      });
      sent += items.length;
    }
  }
}

async function markFailed(db: LumiDb, items: OutboxEntry[], err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  await db.outbox.bulkUpdate(items.map((e) => ({ key: e.seq!, changes: { attempts: e.attempts + 1, last_error: msg } })));
}

/** Сервер → Dexie за курсором server_seq. Рядки з незавершеними локальними змінами не перезаписуються. */
export async function pull(db: LumiDb, t: SyncTransport): Promise<number> {
  let received = 0;
  for (const table of SYNC_TABLES) {
    const key = `cursor:${table}`;
    let since = ((await db.meta.get(key))?.value as number | undefined) ?? 0;
    for (;;) {
      const rows = await t.pull(table, since, PAGE);
      if (!rows.length) break;
      await db.transaction('rw', db.table(table), db.outbox, db.meta, async () => {
        for (const row of rows) {
          const pending = await db.outbox.where('[table+row_id]').equals([table, row.id]).count();
          if (!pending) await db.table(table).put(row);
          since = Math.max(since, row.server_seq);
        }
        await db.meta.put({ key, value: since });
      });
      received += rows.length;
      if (rows.length < PAGE) break;
    }
  }
  return received;
}

export interface SyncResult { pushed: number; pulled: number; at: string }

/** Повний цикл: спершу push, потім pull. */
export async function syncOnce(db: LumiDb, t: SyncTransport): Promise<SyncResult> {
  const pushed = await push(db, t);
  const pulled = await pull(db, t);
  const at = new Date().toISOString();
  await db.meta.put({ key: 'last_sync_at', value: at });
  return { pushed, pulled, at };
}
