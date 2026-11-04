/** Нічний режим: сон активний або зараз 21:00–05:59 (розділ 7 плану). */
export function isNightTime(now: Date): boolean {
  const h = now.getHours();
  return h >= 21 || h < 6;
}

export function shouldUseNightMode(o: { auto: boolean; asleep: boolean; now: Date; dismissedUntil: number }): boolean {
  if (!o.auto || o.now.getTime() < o.dismissedUntil) return false;
  return o.asleep || isNightTime(o.now);
}
