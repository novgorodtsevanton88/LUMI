import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';
import { toSession } from '@/data/mappers';
import type { SleepSession } from '@/domain/sleep/sessions';

/** Усі неудалені сесії дитини, від нових до старих. */
export function useSleepSessions(childId: string | null): SleepSession[] | undefined {
  return useLiveQuery(async () => {
    if (!childId) return [];
    const rows = await db().sleep_sessions.where('child_id').equals(childId).toArray();
    return rows.filter((r) => !r.deleted_at).map(toSession).sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }, [childId]);
}
