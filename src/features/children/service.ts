import { uuidv7 } from 'uuidv7';
import type { ChildRow, LumiDb } from '@/data/db';
import { writeLocal } from '@/data/outbox';

export interface NewChild {
  name: string;
  birthDate: string; // YYYY-MM-DD
  sex: ChildRow['sex'];
  gestationalWeeks: number | null;
}

export type ChildError = 'name_required' | 'name_too_long' | 'birth_in_future' | 'birth_too_old' | 'weeks_range';

export function validateChild(c: NewChild, today = new Date()): ChildError | null {
  const name = c.name.trim();
  if (!name) return 'name_required';
  if (name.length > 60) return 'name_too_long';
  const b = new Date(`${c.birthDate}T00:00:00`);
  if (Number.isNaN(b.getTime()) || b > today) return 'birth_in_future';
  if (today.getFullYear() - b.getFullYear() > 7) return 'birth_too_old';
  if (c.gestationalWeeks != null && (c.gestationalWeeks < 22 || c.gestationalWeeks > 44)) return 'weeks_range';
  return null;
}

export async function createChild(db: LumiDb, c: NewChild): Promise<ChildRow> {
  const err = validateChild(c);
  if (err) throw new Error(err);
  const row: ChildRow = {
    id: uuidv7(), name: c.name.trim(), birth_date: c.birthDate, birth_timezone: 'Europe/Kyiv', sex: c.sex,
    gestational_age_weeks: c.gestationalWeeks, client_updated_at: new Date().toISOString(), deleted_at: null, server_seq: 0,
  };
  await writeLocal(db, 'children', row);
  return row;
}
