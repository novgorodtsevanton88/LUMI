import { addMonths, differenceInCalendarDays, differenceInMonths, differenceInYears, startOfDay } from 'date-fns';

export interface Age {
  years: number;
  months: number; // 0–11 понад повні роки
  days: number; // дні понад повні місяці
  totalMonths: number;
  totalDays: number;
  totalWeeks: number;
}

/** Хронологічний вік на дату `at` (за календарними днями, без часу доби). */
export function ageAt(birthDate: Date, at: Date): Age {
  const birth = startOfDay(birthDate);
  const now = startOfDay(at);
  if (now < birth) throw new RangeError('Дата раніше за дату народження');
  const years = differenceInYears(now, birth);
  const totalMonths = differenceInMonths(now, birth);
  const months = totalMonths - years * 12;
  const days = differenceInCalendarDays(now, addMonths(birth, totalMonths));
  const totalDays = differenceInCalendarDays(now, birth);
  return { years, months, days, totalMonths, totalDays, totalWeeks: Math.floor(totalDays / 7) };
}

/**
 * Скоригований вік для недоношених (< 37 тижнів) — до 2 років хронологічного віку.
 * Повертає null, якщо корекція не застосовується.
 */
export function correctedAgeAt(birthDate: Date, gestationalWeeks: number | null | undefined, at: Date): Age | null {
  if (gestationalWeeks == null || gestationalWeeks >= 37) return null;
  const chrono = ageAt(birthDate, at);
  if (chrono.totalMonths >= 24) return null;
  const shiftDays = (40 - gestationalWeeks) * 7;
  const corrected = new Date(startOfDay(birthDate));
  corrected.setDate(corrected.getDate() + shiftDays);
  if (startOfDay(at) < corrected) return ageAt(corrected, corrected);
  return ageAt(corrected, at);
}

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

/** Підпис віку українською: «3 тижні», «5 місяців 12 днів», «2 роки 3 місяці». */
export function formatAge(a: Age): string {
  const y = (n: number) => `${n} ${plural(n, 'рік', 'роки', 'років')}`;
  const mo = (n: number) => `${n} ${plural(n, 'місяць', 'місяці', 'місяців')}`;
  const d = (n: number) => `${n} ${plural(n, 'день', 'дні', 'днів')}`;
  if (a.totalDays < 14) return d(a.totalDays);
  if (a.totalMonths < 1) return `${a.totalWeeks} ${plural(a.totalWeeks, 'тиждень', 'тижні', 'тижнів')}`;
  if (a.years === 0) return a.days ? `${mo(a.months)} ${d(a.days)}` : mo(a.months);
  return a.months ? `${y(a.years)} ${mo(a.months)}` : y(a.years);
}
