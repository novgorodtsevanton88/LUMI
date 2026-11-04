import type { LumiDb, RowByTable, SyncTable } from './db';

/**
 * Записує рядок локально і ставить його в чергу синхронізації — однією транзакцією Dexie.
 * Якщо в черзі вже є незавершений запис для того ж рядка, він замінюється (надсилаємо лише останній стан).
 */
export async function writeLocal<T extends SyncTable>(db: LumiDb, table: T, row: RowByTable[T]): Promise<void> {
  await db.transaction('rw', db.table(table), db.outbox, async () => {
    await db.table(table).put(row);
    const prev = await db.outbox.where('[table+row_id]').equals([table, row.id]).first();
    const entry = { table, row_id: row.id, payload: row, attempts: 0, last_error: null, queued_at: new Date().toISOString() };
    if (prev?.seq != null) await db.outbox.update(prev.seq, entry);
    else await db.outbox.add(entry);
  });
}

export function pendingCount(db: LumiDb): Promise<number> {
  return db.outbox.count();
}
