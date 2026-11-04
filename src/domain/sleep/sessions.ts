import { addDays, startOfDay } from 'date-fns';

export type SleepKind = 'nap' | 'night';

export interface SleepSession {
  id: string;
  kind: SleepKind;
  startedAt: Date;
  endedAt: Date | null; // null = сон триває
}

export const MAX_SLEEP_MS = 20 * 60 * 60 * 1000; // як CHECK sleep_max_duration у БД

/** Тривалість у мс; для активного сну — до `now`. */
export function durationMs(s: SleepSession, now: Date): number {
  const end = s.endedAt ?? now;
  return Math.max(0, end.getTime() - s.startedAt.getTime());
}

/** Формат тривалості: «1 год 05 хв», «42 хв». */
export function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h ? `${h} год ${String(m).padStart(2, '0')} хв` : `${m} хв`;
}

/** Таймер «ГГ:ХХ:СС» для активного сну. */
export function formatTimer(ms: number): string {
  const s = Math.floor(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export type ValidationError = 'end_before_start' | 'too_long' | 'in_future' | 'overlap';

/** Перевірка нового/зміненого запису щодо інших записів дитини. */
export function validateSession(s: SleepSession, others: SleepSession[], now: Date): ValidationError | null {
  if (s.startedAt.getTime() > now.getTime() + 60_000) return 'in_future';
  if (s.endedAt) {
    if (s.endedAt <= s.startedAt) return 'end_before_start';
    if (s.endedAt.getTime() > now.getTime() + 60_000) return 'in_future';
    if (durationMs(s, now) > MAX_SLEEP_MS) return 'too_long';
  }
  if (others.some((o) => o.id !== s.id && overlaps(s, o, now))) return 'overlap';
  return null;
}

export function overlaps(a: SleepSession, b: SleepSession, now: Date): boolean {
  const aEnd = (a.endedAt ?? now).getTime();
  const bEnd = (b.endedAt ?? now).getTime();
  return a.startedAt.getTime() < bEnd && b.startedAt.getTime() < aEnd;
}

export interface DaySlice {
  sessionId: string;
  kind: SleepKind;
  day: Date; // початок локальної доби
  start: Date;
  end: Date;
}

/** Розрізає сесії по локальних добах (для таймлайну і добової статистики). */
export function splitByDay(sessions: SleepSession[], now: Date): DaySlice[] {
  const out: DaySlice[] = [];
  for (const s of sessions) {
    const end = s.endedAt ?? now;
    let cur = s.startedAt;
    while (cur < end) {
      const day = startOfDay(cur);
      const next = addDays(day, 1);
      const sliceEnd = end < next ? end : next;
      out.push({ sessionId: s.id, kind: s.kind, day, start: cur, end: sliceEnd });
      cur = sliceEnd;
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export interface DayTotals {
  totalMs: number;
  napMs: number;
  nightMs: number;
  napCount: number;
}

/** Підсумок сну за локальну добу `day`. Денний сон рахується в добі, де він почався. */
export function dayTotals(sessions: SleepSession[], day: Date, now: Date): DayTotals {
  const from = startOfDay(day).getTime();
  const slices = splitByDay(sessions, now).filter((x) => x.day.getTime() === from);
  const t: DayTotals = { totalMs: 0, napMs: 0, nightMs: 0, napCount: 0 };
  for (const x of slices) {
    const ms = x.end.getTime() - x.start.getTime();
    t.totalMs += ms;
    if (x.kind === 'nap') t.napMs += ms;
    else t.nightMs += ms;
  }
  t.napCount = sessions.filter((s) => s.kind === 'nap' && startOfDay(s.startedAt).getTime() === from).length;
  return t;
}

/** Активний сон (якщо є) і час неспання з кінця останнього завершеного. */
export function currentState(sessions: SleepSession[], now: Date):
  | { state: 'asleep'; session: SleepSession; elapsedMs: number }
  | { state: 'awake'; awakeMs: number | null; lastEnd: Date | null } {
  const active = sessions.find((s) => s.endedAt === null);
  if (active) return { state: 'asleep', session: active, elapsedMs: durationMs(active, now) };
  const lastEnd = sessions.reduce<Date | null>((acc, s) => (s.endedAt && (!acc || s.endedAt > acc) ? s.endedAt : acc), null);
  return { state: 'awake', lastEnd, awakeMs: lastEnd ? Math.max(0, now.getTime() - lastEnd.getTime()) : null };
}

/** Тип сну за замовчуванням для кнопки «Почати сон»: 19:00–05:59 — нічний. */
export function suggestKind(at: Date): SleepKind {
  const h = at.getHours();
  return h >= 19 || h < 6 ? 'night' : 'nap';
}
