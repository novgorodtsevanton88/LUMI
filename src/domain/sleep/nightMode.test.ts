import { describe, expect, it } from 'vitest';
import { shouldUseNightMode } from './nightMode';

const at = (h: number) => new Date(2026, 10, 4, h, 30);
describe('нічний режим', () => {
  it('вмикається вночі та під час сну', () => {
    expect(shouldUseNightMode({ auto: true, asleep: false, now: at(22), dismissedUntil: 0 })).toBe(true);
    expect(shouldUseNightMode({ auto: true, asleep: false, now: at(5), dismissedUntil: 0 })).toBe(true);
    expect(shouldUseNightMode({ auto: true, asleep: true, now: at(13), dismissedUntil: 0 })).toBe(true);
    expect(shouldUseNightMode({ auto: true, asleep: false, now: at(13), dismissedUntil: 0 })).toBe(false);
  });
  it('можна вимкнути назавжди або тимчасово', () => {
    expect(shouldUseNightMode({ auto: false, asleep: true, now: at(22), dismissedUntil: 0 })).toBe(false);
    expect(shouldUseNightMode({ auto: true, asleep: true, now: at(22), dismissedUntil: at(23).getTime() })).toBe(false);
  });
});
