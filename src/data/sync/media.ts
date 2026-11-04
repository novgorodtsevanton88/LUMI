import type { LumiDb } from '../db';
import type { SyncTransport } from './transport';

/**
 * Надсилає фото до рядків: об'єкт у Storage має існувати раніше, ніж photo_path дійде до іншого пристрою.
 * Завантаження без мережі лишаються в черзі (pending).
 */
export async function pushMedia(db: LumiDb, t: SyncTransport): Promise<number> {
  const queue = await db.media.where('pending').anyOf('upload', 'delete').toArray();
  for (const m of queue) {
    if (m.pending === 'upload' && m.blob) {
      await t.media.upload(m.path, m.blob, m.mime);
      await db.media.update(m.path, { pending: null });
    } else if (m.pending === 'delete') {
      await t.media.remove(m.path);
      await db.media.delete(m.path);
    }
  }
  return queue.length;
}

/** Локальний blob фото; якщо його немає — завантажує з сервера і кешує. */
export async function getMediaBlob(db: LumiDb, path: string, childId: string, t: SyncTransport | null): Promise<Blob | null> {
  const local = await db.media.get(path);
  if (local?.blob) return local.blob;
  if (!t || (typeof navigator !== 'undefined' && navigator.onLine === false)) return null;
  const blob = await t.media.download(path);
  await db.media.put({ path, child_id: childId, blob, mime: blob.type, pending: null, created_at: new Date().toISOString() });
  return blob;
}
