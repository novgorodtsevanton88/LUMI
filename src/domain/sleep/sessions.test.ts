import { describe, expect, it } from 'vitest';
import { currentState, dayTotals, durationMs, formatDuration, formatTimer, splitByDay, suggestKind, validateSession, type SleepSession } from './sessions';

const t = (s: string) => new Date(s);
const S = (id: string, kind: SleepSession['kind'], a: string, b: string | null): SleepSession => ({
  id, kind, startedAt: t(a), endedAt: b ? t(b) : null,
});
const now = t('2026-11-04T15:00:00');

describe('тривалість і формат', () => {
  it('активний сон рахується до now', () => {
    expect(durationMs(S('a', 'nap', '2026-11-04T14:30:00', null), now)).toBe(30 * 60000);
  });
  it('формати', () => {
    expect(formatDuration(65 * 60000)).toBe('1 год 05 хв');
    expect(formatDuration(42 * 60000)).toBe('42 хв');
    expect(formatTimer(3723000)).toBe('01:02:03');
  });
});

describe('validateSession', () => {
  const others = [S('n', 'night', '2026-11-03T20:00:00', '2026-11-04T07:00:00')];
  it('ок', () => expect(validateSession(S('x', 'nap', '2026-11-04T10:00:00', '2026-11-04T11:00:00'), others, now)).toBeNull());
  it('кінець раніше початку', () =>
    expect(validateSession(S('x', 'nap', '2026-11-04T11:00:00', '2026-11-04T10:00:00'), [], now)).toBe('end_before_start'));
  it('перетин', () =>
    expect(validateSession(S('x', 'nap', '2026-11-04T06:30:00', '2026-11-04T08:00:00'), others, now)).toBe('overlap'));
  it('редагування самого себе — не перетин', () =>
    expect(validateSession(S('n', 'night', '2026-11-03T20:30:00', '2026-11-04T07:00:00'), others, now)).toBeNull());
  it('довше 20 годин', () =>
    expect(validateSession(S('x', 'night', '2026-11-03T08:00:00', '2026-11-04T05:00:00'), [], now)).toBe('too_long'));
  it('у майбутньому', () =>
    expect(validateSession(S('x', 'nap', '2026-11-04T16:00:00', null), [], now)).toBe('in_future'));
});

describe('розрізання по добах', () => {
  const night = S('n', 'night', '2026-11-03T20:00:00', '2026-11-04T07:00:00');
  it('нічний сон ділиться опівночі', () => {
    const sl = splitByDay([night], now);
    expect(sl).toHaveLength(2);
    expect(sl[0]!.end.getHours()).toBe(0);
  });
  it('підсумок доби', () => {
    const nap = S('a', 'nap', '2026-11-04T10:00:00', '2026-11-04T11:30:00');
    const tot = dayTotals([night, nap], t('2026-11-04T00:00:00'), now);
    expect(tot.nightMs).toBe(7 * 3600000);
    expect(tot.napMs).toBe(90 * 60000);
    expect(tot.napCount).toBe(1);
  });
  it('доба з переходом на зимовий час (25 год)', () => {
    const sl = splitByDay([S('n', 'night', '2026-10-24T22:00:00', '2026-10-25T06:00:00')], now);
    const ms = sl.reduce((a, x) => a + x.end.getTime() - x.start.getTime(), 0);
    expect(ms).toBe(9 * 3600000);
  });
});

describe('поточний стан', () => {
  it('спить', () => {
    const st = currentState([S('a', 'nap', '2026-11-04T14:00:00', null)], now);
    expect(st.state).toBe('asleep');
  });
  it('неспання від останнього пробудження', () => {
    const st = currentState([S('a', 'nap', '2026-11-04T10:00:00', '2026-11-04T13:00:00')], now);
    expect(st).toMatchObject({ state: 'awake', awakeMs: 2 * 3600000 });
  });
  it('без записів', () => expect(currentState([], now)).toMatchObject({ awakeMs: null }));
  it('тип за годиною', () => {
    expect(suggestKind(t('2026-11-04T20:00:00'))).toBe('night');
    expect(suggestKind(t('2026-11-04T13:00:00'))).toBe('nap');
  });
});
