import { uuidv7 } from 'uuidv7';
import type { ChildRow, LumiDb } from '@/data/db';
import { writeLocal } from '@/data/outbox';

export interface NewChild {
  name: string;
  birthDate: string; // YYYY-MM-DD
  birthTime?: string | null; // HH:mm
  sex: ChildRow['sex'];
  gestationalWeeks: number | null;
}

export type ChildError = 'name_required' | 'name_too_long' | 'birth_in_future' | 'birth_too_old' | 'weeks_range' | 'time_invalid';

export function validateChild(c: NewChild, now = new Date()): ChildError | null {
  const name = c.name.trim();
  if (!name) return 'name_required';
  if (name.length > 60) return 'name_too_long';
  if (c.birthTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(c.birthTime)) return 'time_invalid';
  const b = new Date(`${c.birthDate}T${c.birthTime || '00:00'}:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.birthDate) || Number.isNaN(b.getTime()) || b > now) return 'birth_in_future';
  if (b.getFullYear() < 2015 || now.getFullYear() - b.getFullYear() > 7) return 'birth_too_old';
  if (c.gestationalWeeks != null && (c.gestationalWeeks < 22 || c.gestationalWeeks > 44)) return 'weeks_range';
  return null;
}

const toFields = (c: NewChild) => ({
  name: c.name.trim(), birth_date: c.birthDate, birth_time: c.birthTime || null, sex: c.sex, gestational_age_weeks: c.gestationalWeeks,
});

export async function createChild(db: LumiDb, c: NewChild): Promise<ChildRow> {
  const err = validateChild(c);
  if (err) throw new Error(err);
  const row: ChildRow = {
    id: uuidv7(), ...toFields(c), birth_timezone: 'Europe/Kyiv', photo_path: null,
    client_updated_at: new Date().toISOString(), deleted_at: null, server_seq: 0,
  };
  await writeLocal(db, 'children', row);
  return row;
}

async function getLive(db: LumiDb, id: string): Promise<ChildRow> {
  const row = await db.children.get(id);
  if (!row || row.deleted_at) throw new Error('not_found');
  return row;
}

export async function updateChild(db: LumiDb, id: string, c: NewChild, now = new Date()): Promise<ChildRow> {
  const err = validateChild(c, now);
  if (err) throw new Error(err);
  const row = { ...(await getLive(db, id)), ...toFields(c), client_updated_at: now.toISOString() };
  await writeLocal(db, 'children', row);
  return row;
}

export const childToForm = (r: ChildRow): NewChild => ({
  name: r.name, birthDate: r.birth_date, birthTime: r.birth_time, sex: r.sex, gestationalWeeks: r.gestational_age_weeks,
});

/** Нове фото: зберігається локально одразу, у Storage — під час синхронізації. Старе ставиться на видалення. */
export async function setChildPhoto(db: LumiDb, id: string, blob: Blob | null, now = new Date()): Promise<ChildRow> {
  return db.transaction('rw', [db.children, db.outbox, db.media], async () => {
    const child = await getLive(db, id);
    if (child.photo_path) await markMediaDeleted(db, child.photo_path);
    let path: string | null = null;
    if (blob) {
      const ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
      path = `${id}/${uuidv7()}.${ext}`;
      await db.media.put({ path, child_id: id, blob, mime: blob.type || 'image/jpeg', pending: 'upload', created_at: now.toISOString() });
    }
    const row = { ...child, photo_path: path, client_updated_at: now.toISOString() };
    await writeLocal(db, 'children', row);
    return row;
  });
}

async function markMediaDeleted(db: LumiDb, path: string) {
  const m = await db.media.get(path);
  // ще не надіслане фото просто прибираємо локально
  if (m?.pending === 'upload') await db.media.delete(path);
  else await db.media.put({ path, child_id: m?.child_id ?? path.split('/')[0]!, blob: null, mime: m?.mime ?? '', pending: 'delete', created_at: new Date().toISOString() });
}

/** М'яке видалення. На сервері видалити може лише власник (RLS); записи сну зникають разом із дитиною. */
export async function deleteChild(db: LumiDb, id: string, now = new Date()): Promise<void> {
  const row = await getLive(db, id);
  await writeLocal(db, 'children', { ...row, deleted_at: now.toISOString(), client_updated_at: now.toISOString() });
}
