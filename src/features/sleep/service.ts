import { uuidv7 } from 'uuidv7';
import type { LumiDb, SleepRow } from '@/data/db';
import { toSession } from '@/data/mappers';
import { writeLocal } from '@/data/outbox';
import { suggestKind, validateSession, type SleepKind, type ValidationError } from '@/domain/sleep/sessions';

export class SleepError extends Error {
  constructor(public code: ValidationError | 'already_active' | 'not_found') { super(code); }
}

async function liveRows(db: LumiDb, childId: string) {
  return (await db.sleep_sessions.where('child_id').equals(childId).toArray()).filter((r) => !r.deleted_at);
}

async function save(db: LumiDb, row: SleepRow, now: Date) {
  const others = (await liveRows(db, row.child_id)).map(toSession);
  const err = validateSession(toSession(row), others, now);
  if (err) throw new SleepError(err);
  await writeLocal(db, 'sleep_sessions', { ...row, client_updated_at: now.toISOString() });
}

export async function startSleep(db: LumiDb, childId: string, now = new Date(), kind?: SleepKind): Promise<SleepRow> {
  if ((await liveRows(db, childId)).some((r) => !r.ended_at)) throw new SleepError('already_active');
  const row: SleepRow = {
    id: uuidv7(), child_id: childId, kind: kind ?? suggestKind(now), started_at: now.toISOString(), ended_at: null,
    source: 'timer', comment: null, client_updated_at: now.toISOString(), deleted_at: null, server_seq: 0,
  };
  await save(db, row, now);
  return row;
}

export async function stopSleep(db: LumiDb, childId: string, now = new Date()): Promise<SleepRow> {
  const active = (await liveRows(db, childId)).find((r) => !r.ended_at);
  if (!active) throw new SleepError('not_found');
  const row = { ...active, ended_at: now.toISOString() };
  await save(db, row, now);
  return row;
}

export async function addManualSleep(db: LumiDb, childId: string, kind: SleepKind, start: Date, end: Date, now = new Date()) {
  const row: SleepRow = {
    id: uuidv7(), child_id: childId, kind, started_at: start.toISOString(), ended_at: end.toISOString(),
    source: 'manual', comment: null, client_updated_at: now.toISOString(), deleted_at: null, server_seq: 0,
  };
  await save(db, row, now);
  return row;
}

export async function deleteSleep(db: LumiDb, id: string, now = new Date()) {
  const row = await db.sleep_sessions.get(id);
  if (!row) throw new SleepError('not_found');
  await writeLocal(db, 'sleep_sessions', { ...row, deleted_at: now.toISOString(), client_updated_at: now.toISOString() });
}
