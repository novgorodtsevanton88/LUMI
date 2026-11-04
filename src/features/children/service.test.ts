import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { openDb } from '@/data/db';
import { MemoryServer } from '@/data/sync/memoryTransport';
import { getMediaBlob } from '@/data/sync/media';
import { syncOnce } from '@/data/sync/sync';
import { createChild, deleteChild, setChildPhoto, updateChild, validateChild } from './service';

const base = { name: 'Марта', birthDate: '2026-03-01', sex: 'female' as const, gestationalWeeks: null };
const now = new Date('2026-11-04T12:00:00');
let n = 0;

describe('валідація', () => {
  it.each([
    [{ ...base, name: '  ' }, 'name_required'],
    [{ ...base, birthDate: '2026-12-01' }, 'birth_in_future'],
    [{ ...base, birthDate: '2026-11-04', birthTime: '13:00' }, 'birth_in_future'],
    [{ ...base, birthTime: '25:10' }, 'time_invalid'],
    [{ ...base, gestationalWeeks: 20 }, 'weeks_range'],
    [{ ...base, birthDate: '2014-05-01' }, 'birth_too_old'],
  ])('%o → %s', (c, err) => expect(validateChild(c, now)).toBe(err));
  it('сьогоднішня дата з минулим часом — ок', () =>
    expect(validateChild({ ...base, birthDate: '2026-11-04', birthTime: '08:15' }, now)).toBeNull());
});

describe('профіль дитини', () => {
  it('редагування оновлює запис і чергу', async () => {
    const db = openDb(`c${++n}`);
    const c = await createChild(db, base);
    await updateChild(db, c.id, { ...base, name: 'Марта Ч.', birthTime: '14:20' }, new Date(Date.now() + 1000));
    expect(await db.children.get(c.id)).toMatchObject({ name: 'Марта Ч.', birth_time: '14:20' });
    expect(await db.outbox.count()).toBe(1);
  });

  it('фото надсилається до рядка і доходить на інший пристрій', async () => {
    const server = new MemoryServer();
    const a = openDb(`c${++n}`), b = openDb(`c${++n}`);
    const c = await createChild(a, base);
    const photo = new Blob(['img'], { type: 'image/webp' });
    const row = await setChildPhoto(a, c.id, photo);
    expect(row.photo_path).toMatch(new RegExp(`^${c.id}/.+\\.webp$`));
    await syncOnce(a, server.transport());
    expect(server.files.has(row.photo_path!)).toBe(true);
    expect((await a.media.get(row.photo_path!))!.pending).toBeNull();
    await syncOnce(b, server.transport());
    const remote = (await b.children.get(c.id))!;
    const blob = await getMediaBlob(b, remote.photo_path!, c.id, server.transport());
    expect(await blob!.text()).toBe('img');
  });

  it('заміна фото видаляє старе зі сховища, без мережі — чекає', async () => {
    const server = new MemoryServer();
    const a = openDb(`c${++n}`);
    const c = await createChild(a, base);
    const first = await setChildPhoto(a, c.id, new Blob(['1'], { type: 'image/webp' }));
    await syncOnce(a, server.transport());
    await setChildPhoto(a, c.id, new Blob(['2'], { type: 'image/webp' }));
    server.failNext = true;
    await expect(syncOnce(a, server.transport())).rejects.toThrow();
    expect(await a.media.where('pending').equals('upload').count()).toBe(1);
    await syncOnce(a, server.transport());
    expect(server.files.has(first.photo_path!)).toBe(false);
    expect(server.files.size).toBe(1);
  });

  it('видалення фото до синхронізації нічого не надсилає', async () => {
    const a = openDb(`c${++n}`);
    const c = await createChild(a, base);
    await setChildPhoto(a, c.id, new Blob(['1'], { type: 'image/webp' }));
    await setChildPhoto(a, c.id, null);
    expect(await a.media.count()).toBe(0);
  });

  it('видалення дитини — м\'яке', async () => {
    const a = openDb(`c${++n}`);
    const c = await createChild(a, base);
    await deleteChild(a, c.id);
    expect((await a.children.get(c.id))!.deleted_at).not.toBeNull();
    await expect(updateChild(a, c.id, base)).rejects.toThrow('not_found');
  });
});
