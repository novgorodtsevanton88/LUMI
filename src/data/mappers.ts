import type { SleepSession } from '@/domain/sleep/sessions';
import type { SleepRow } from './db';

export const toSession = (r: SleepRow): SleepSession => ({
  id: r.id, kind: r.kind, startedAt: new Date(r.started_at), endedAt: r.ended_at ? new Date(r.ended_at) : null,
});
