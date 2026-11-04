import { useState } from 'react';
import { format, startOfDay } from 'date-fns';
import { Baby, CalendarHeart, Plus, Puzzle, Ruler, Syringe, Trash2 } from 'lucide-react';
import { db, type ChildRow } from '@/data/db';
import { ageAt, correctedAgeAt, formatAge } from '@/domain/age/age';
import { currentState, dayTotals, durationMs, formatDuration, formatTimer, suggestKind, type SleepKind, type SleepSession } from '@/domain/sleep/sessions';
import { deleteSleep, startSleep, stopSleep } from '@/features/sleep/service';
import { sleepErrorText } from '@/features/sleep/ui/errors';
import { SleepButton } from '@/features/sleep/ui/SleepButton';
import { ManualSleepSheet } from '@/features/sleep/ui/ManualSleepSheet';
import { ChildSwitcher } from '@/features/children/ui/ChildSwitcher';
import { GlassCard } from '@/ui/primitives/GlassCard';
import { Segmented } from '@/ui/primitives/Segmented';
import { SoonBadge } from '@/ui/primitives/PreviewBadge';
import { useNow } from '@/ui/hooks/useNow';

const kindLabel: Record<SleepKind, string> = { nap: 'Денний сон', night: 'Нічний сон' };

export function Home({ child, sessions }: { child: ChildRow; sessions: SleepSession[] }) {
  const now = useNow();
  const birth = new Date(`${child.birth_date}T00:00:00`);
  const age = ageAt(birth, now);
  const corrected = correctedAgeAt(birth, child.gestational_age_weeks, now);
  const state = currentState(sessions, now);
  const [kind, setKind] = useState<SleepKind>(() => suggestKind(new Date()));
  const [manual, setManual] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const today = startOfDay(now);
  const totals = dayTotals(sessions, today, now);
  const todays = sessions.filter((s) => (s.endedAt ?? now) >= today);

  async function toggle() {
    setError(null);
    try {
      if (state.state === 'asleep') await stopSleep(db(), child.id);
      else await startSleep(db(), child.id, new Date(), kind);
    } catch (e) { setError(sleepErrorText(e)); }
  }

  return (
    <div className="flex flex-col gap-3">
      <header className="mb-3">
        <p className="text-subhead text-text-secondary">{format(now, 'd.MM.yyyy')}</p>
        <h1><ChildSwitcher child={child} /></h1>
        <p className="mt-1 text-subhead text-text-secondary">
          {formatAge(age)}{corrected && ` · скоригований ${formatAge(corrected)}`}
        </p>
      </header>

      <GlassCard className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="rounded-chip bg-sleep/20 px-2 py-0.5 text-caption text-sleep">Сон</span>
            {state.state === 'asleep' ? (
              <>
                <p className="mt-2 text-subhead text-text-secondary">{kindLabel[state.session.kind]} з {format(state.session.startedAt, 'HH:mm')}</p>
                <p className="text-display-timer tabular-nums" aria-live="off">{formatTimer(state.elapsedMs)}</p>
              </>
            ) : (
              <>
                <p className="mt-2 text-subhead text-text-secondary">{state.lastEnd ? `Не спить з ${format(state.lastEnd, 'HH:mm')}` : 'Записів сну ще немає'}</p>
                <p className="text-title-1 tabular-nums">{state.awakeMs != null ? formatDuration(state.awakeMs) : 'Почніть перший'}</p>
              </>
            )}
          </div>
          <SleepButton asleep={state.state === 'asleep'} onPress={toggle} />
        </div>
        {state.state === 'awake' && (
          <Segmented label="Тип сну" value={kind} onChange={setKind} options={[{ value: 'nap', label: 'Денний' }, { value: 'night', label: 'Нічний' }]} />
        )}
        {error && <p role="alert" className="text-subhead text-danger">{error}</p>}
      </GlassCard>

      <GlassCard>
        <h2 className="text-title-2">Сьогодні</h2>
        <dl className="mt-3 grid grid-cols-3 gap-3">
          {[
            ['Усього сну', formatDuration(totals.totalMs)],
            ['Денних снів', String(totals.napCount)],
            ['Вдень', formatDuration(totals.napMs)],
          ].map(([k, v]) => (
            <div key={k}><dt className="text-footnote text-text-secondary">{k}</dt><dd className="text-headline tabular-nums">{v}</dd></div>
          ))}
        </dl>
        <ul className="mt-4 flex flex-col divide-y divide-surface-border">
          {todays.map((s) => (
            <li key={s.id} className="flex min-h-12 items-center gap-3 py-2">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.kind === 'nap' ? 'bg-sleep' : 'bg-accent'}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-headline tabular-nums">{format(s.startedAt, 'HH:mm')} – {s.endedAt ? format(s.endedAt, 'HH:mm') : 'триває'}</p>
                <p className="text-footnote text-text-secondary">{kindLabel[s.kind]} · {formatDuration(durationMs(s, now))}</p>
              </div>
              {s.endedAt && (confirmId === s.id ? (
                <span className="flex gap-1">
                  <button className="min-h-11 rounded-control px-3 text-subhead text-text-secondary" onClick={() => setConfirmId(null)}>Ні</button>
                  <button className="min-h-11 rounded-control bg-danger px-3 text-subhead text-white" onClick={() => { void deleteSleep(db(), s.id); setConfirmId(null); }}>Видалити</button>
                </span>
              ) : (
                <button aria-label="Видалити запис" className="grid h-11 w-11 place-items-center rounded-control text-text-secondary" onClick={() => setConfirmId(s.id)}>
                  <Trash2 size={18} aria-hidden />
                </button>
              ))}
            </li>
          ))}
          {!todays.length && <li className="py-2 text-subhead text-text-secondary">Сьогодні ще нічого. Натисніть кнопку з місяцем, коли дитина засне.</li>}
        </ul>
      </GlassCard>

      <h2 className="mt-5 text-title-2">Швидкі дії</h2>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setManual(true)} className="glass flex min-h-14 items-center gap-3 rounded-card px-4 text-left text-headline">
          <Plus size={20} className="text-sleep" aria-hidden /> Сон вручну
        </button>
        {[
          [Ruler, 'Зріст і вага', 'text-growth'],
          [Syringe, 'Щеплення', 'text-health'],
          [CalendarHeart, 'Календар', 'text-calendar'],
          [Puzzle, 'Ігри', 'text-develop'],
          [Baby, 'Розвиток', 'text-develop'],
        ].map(([Icon, label, color]) => {
          const I = Icon as typeof Ruler;
          return (
            <div key={label as string} aria-disabled className="glass flex min-h-14 flex-col justify-center gap-1 rounded-card px-4 py-2 opacity-70">
              <span className="flex items-center gap-3 text-headline"><I size={20} className={color as string} aria-hidden />{label as string}</span>
              <SoonBadge>У наступних фазах</SoonBadge>
            </div>
          );
        })}
      </div>
      <ManualSleepSheet open={manual} onClose={() => setManual(false)} childId={child.id} />
    </div>
  );
}
