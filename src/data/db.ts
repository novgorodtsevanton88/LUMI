import Dexie, { type EntityTable } from 'dexie';

/** Спільні службові поля всіх синхронізованих записів (як у БД, розділ 3 плану). */
export interface SyncFields {
  id: string; // UUIDv7, генерує клієнт
  client_updated_at: string; // ISO
  deleted_at: string | null;
  server_seq: number; // 0 — ще не бачив сервера
}

export interface ChildRow extends SyncFields {
  name: string;
  birth_date: string; // YYYY-MM-DD
  birth_timezone: string;
  sex: 'female' | 'male';
  gestational_age_weeks: number | null;
}

export interface SleepRow extends SyncFields {
  child_id: string;
  kind: 'nap' | 'night';
  started_at: string;
  ended_at: string | null;
  source: 'timer' | 'manual';
  comment: string | null;
}

export type SyncTable = 'children' | 'sleep_sessions';
export interface RowByTable { children: ChildRow; sleep_sessions: SleepRow }

export interface OutboxEntry {
  seq?: number;
  table: SyncTable;
  row_id: string;
  payload: ChildRow | SleepRow;
  attempts: number;
  last_error: string | null;
  queued_at: string;
}

export interface MetaRow { key: string; value: unknown }

export type LumiDb = Dexie & {
  children: EntityTable<ChildRow, 'id'>;
  sleep_sessions: EntityTable<SleepRow, 'id'>;
  outbox: EntityTable<OutboxEntry, 'seq'>;
  meta: EntityTable<MetaRow, 'key'>;
};

export function openDb(name = 'lumi'): LumiDb {
  const db = new Dexie(name) as LumiDb;
  db.version(1).stores({
    children: 'id, server_seq',
    sleep_sessions: 'id, child_id, [child_id+started_at], server_seq',
    outbox: '++seq, [table+row_id]',
    meta: 'key',
  });
  return db;
}

let shared: LumiDb | null = null;
export function db(): LumiDb {
  return (shared ??= openDb());
}
