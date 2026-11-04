import { describe, expect, it } from 'vitest';
import { ageAt, correctedAgeAt, formatAge } from './age';

const d = (s: string) => new Date(`${s}T12:00:00`);

describe('ageAt', () => {
  it('рахує роки, місяці, дні', () => {
    const a = ageAt(d('2024-01-31'), d('2026-03-15'));
    expect([a.years, a.months, a.days]).toEqual([2, 1, 15]);
    expect(a.totalMonths).toBe(25);
  });
  it('новонароджений', () => {
    const a = ageAt(d('2026-11-04'), d('2026-11-04'));
    expect(a.totalDays).toBe(0);
  });
  it('переживає перехід на літній час', () => {
    expect(ageAt(d('2026-03-28'), d('2026-03-30')).totalDays).toBe(2);
  });
  it('29 лютого', () => {
    expect(ageAt(d('2024-02-29'), d('2025-02-28')).years).toBe(0);
    expect(ageAt(d('2024-02-29'), d('2025-03-01')).years).toBe(1);
  });
  it('не приймає дату до народження', () => {
    expect(() => ageAt(d('2026-01-02'), d('2026-01-01'))).toThrow(RangeError);
  });
});

describe('correctedAgeAt', () => {
  it('віднімає тижні недоношеності', () => {
    const a = correctedAgeAt(d('2026-01-01'), 32, d('2026-05-01'));
    expect(a?.totalDays).toBe(120 - 56);
  });
  it('не застосовується для доношених і після 2 років', () => {
    expect(correctedAgeAt(d('2026-01-01'), 39, d('2026-05-01'))).toBeNull();
    expect(correctedAgeAt(d('2023-01-01'), 30, d('2025-02-01'))).toBeNull();
  });
});

describe('formatAge', () => {
  it.each([
    ['2026-11-04', 'перший день'],
    ['2026-11-01', '3 дні'],
    ['2026-10-14', '3 тижні'],
    ['2026-06-04', '5 місяців'],
    ['2026-05-23', '5 місяців 12 днів'],
    ['2025-11-04', '1 рік'],
    ['2024-08-04', '2 роки 3 місяці'],
    ['2021-11-04', '5 років'],
  ])('%s → %s', (birth, text) => {
    expect(formatAge(ageAt(d(birth), d('2026-11-04')))).toBe(text);
  });
});
