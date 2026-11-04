import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { openDb } from './db';
import { bindLocalDataToUser } from './session';
import { createChild } from '@/features/children/service';

const child = { name: 'Марта', birthDate: '2026-03-01', sex: 'female' as const, gestationalWeeks: null };

describe('прив\'язка локальних даних до користувача', () => {
  it('дані, створені до входу, залишаються і чекають надсилання', async () => {
    const db = openDb('s1');
    await createChild(db, child);
    expect(await bindLocalDataToUser(db, 'u1')).toBe('adopted');
    expect(await db.children.count()).toBe(1);
    expect(await db.outbox.count()).toBe(1);
    expect(await bindLocalDataToUser(db, 'u1')).toBe('same');
  });
  it('інший користувач на тому ж пристрої не бачить чужих даних', async () => {
    const db = openDb('s2');
    await bindLocalDataToUser(db, 'u1');
    await createChild(db, child);
    expect(await bindLocalDataToUser(db, 'u2')).toBe('wiped');
    expect(await db.children.count()).toBe(0);
    expect(await db.outbox.count()).toBe(0);
  });
});
