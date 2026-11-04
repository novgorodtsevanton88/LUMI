import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { openDb, type LumiDb } from '../db';
import { pendingCount } from '../outbox';
import { MemoryServer } from './memoryTransport';
import { pull, syncOnce } from './sync';
import { createChild } from '@/features/children/service';
import { deleteSleep, SleepError, startSleep, stopSleep } from '@/features/sleep/service';

let n = 0;
let server: MemoryServer;
let a: LumiDb;
let b: LumiDb;
beforeEach(() => {
  server = new MemoryServer();
  a = openDb(`a${++n}`);
  b = openDb(`b${n}`);
});
const child = { name: 'Марта', birthDate: '2026-03-01', sex: 'female' as const, gestationalWeeks: null };
const at = (s: string) => new Date(`2026-11-04T${s}`);

describe('outbox і синхронізація', () => {
  it('запис ставиться в чергу, після синхронізації черга порожня', async () => {
    await createChild(a, child);
    expect(await pendingCount(a)).toBe(1);
    await syncOnce(a, server.transport());
    expect(await pendingCount(a)).toBe(0);
    expect(server.tables.children.size).toBe(1);
  });

  it('повторні зміни одного рядка зливаються в одну позицію черги', async () => {
    const c = await createChild(a, child);
    await startSleep(a, c.id, at('10:00:00'));
    await stopSleep(a, c.id, at('11:00:00'));
    expect(await pendingCount(a)).toBe(2);
  });

  it('другий пристрій бачить сон першого', async () => {
    const c = await createChild(a, child);
    await startSleep(a, c.id, at('10:00:00'));
    await stopSleep(a, c.id, at('11:30:00'));
    await syncOnce(a, server.transport());
    await syncOnce(b, server.transport());
    const rows = await b.sleep_sessions.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.ended_at).toBe(at('11:30:00').toISOString());
  });

  it('без мережі дані лишаються в черзі й доходять пізніше', async () => {
    await createChild(a, child);
    server.failNext = true;
    await expect(syncOnce(a, server.transport())).rejects.toThrow('network down');
    const [e] = await a.outbox.toArray();
    expect(e).toMatchObject({ attempts: 1, last_error: 'network down' });
    await syncOnce(a, server.transport());
    expect(await pendingCount(a)).toBe(0);
  });

  it('пізніша зміна перемагає, застаріла відкидається', async () => {
    const c = await createChild(a, child);
    const s = await startSleep(a, c.id, at('10:00:00'));
    await stopSleep(a, c.id, at('11:00:00'));
    await syncOnce(a, server.transport());
    await syncOnce(b, server.transport());
    await deleteSleep(b, s.id, at('12:00:00'));
    await syncOnce(b, server.transport());
    // a надсилає старішу версію (наприклад, офлайн-правку з 11:30)
    const row = (await a.sleep_sessions.get(s.id))!;
    await a.outbox.add({ table: 'sleep_sessions', row_id: s.id, payload: { ...row, comment: 'x', client_updated_at: at('11:30:00').toISOString() }, attempts: 0, last_error: null, queued_at: 'x' });
    await syncOnce(a, server.transport());
    expect(server.tables.sleep_sessions.get(s.id)!.deleted_at).not.toBeNull();
    await syncOnce(a, server.transport());
    expect((await a.sleep_sessions.get(s.id))!.deleted_at).not.toBeNull();
  });

  it('pull не затирає локальну незасинхронізовану зміну', async () => {
    const c = await createChild(a, child);
    const s = await startSleep(a, c.id, at('13:00:00'));
    await syncOnce(a, server.transport());
    await syncOnce(b, server.transport());
    await stopSleep(b, c.id, at('14:00:00'));
    await syncOnce(b, server.transport());
    await stopSleep(a, c.id, at('14:10:00')); // офлайн, ще не надіслано
    await pull(a, server.transport());
    expect((await a.sleep_sessions.get(s.id))!.ended_at).toBe(at('14:10:00').toISOString());
    await syncOnce(a, server.transport()); // пізніша зміна перемагає на сервері
    await syncOnce(b, server.transport());
    expect((await b.sleep_sessions.get(s.id))!.ended_at).toBe(at('14:10:00').toISOString());
  });
});

describe('сервіс сну', () => {
  it('не дає почати другий сон', async () => {
    const c = await createChild(a, child);
    await startSleep(a, c.id, at('10:00:00'));
    await expect(startSleep(a, c.id, at('10:05:00'))).rejects.toBeInstanceOf(SleepError);
  });
  it('не дає завершити, якщо сну немає', async () => {
    const c = await createChild(a, child);
    await expect(stopSleep(a, c.id, at('10:05:00'))).rejects.toMatchObject({ code: 'not_found' });
  });
});
