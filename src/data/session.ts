import type { LumiDb } from './db';

/**
 * Прив'язує локальну базу до користувача.
 * - Локальні дані без власника (створені до входу) переходять до користувача і надішлються з outbox.
 * - Якщо в базі дані іншого користувача — база очищується (спільний пристрій).
 */
export async function bindLocalDataToUser(db: LumiDb, userId: string): Promise<'adopted' | 'same' | 'wiped'> {
  const owner = (await db.meta.get('user_id'))?.value as string | undefined;
  if (owner === userId) return 'same';
  if (owner && owner !== userId) {
    await wipeLocal(db);
    await db.meta.put({ key: 'user_id', value: userId });
    return 'wiped';
  }
  await db.meta.put({ key: 'user_id', value: userId });
  return 'adopted';
}

export async function wipeLocal(db: LumiDb): Promise<void> {
  await db.transaction('rw', [db.children, db.sleep_sessions, db.outbox, db.meta], async () => {
    await Promise.all([db.children.clear(), db.sleep_sessions.clear(), db.outbox.clear(), db.meta.clear()]);
  });
}
