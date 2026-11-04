import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CloudOff, Check } from 'lucide-react';
import { db, type ChildRow } from '@/data/db';
import { syncAvailable } from '@/data/sync/runner';
import { useUi, type ThemePref } from '@/app/store';
import { Onboarding } from '@/features/onboarding/ui/Onboarding';
import { GlassCard } from '@/ui/primitives/GlassCard';
import { Segmented } from '@/ui/primitives/Segmented';
import { Button } from '@/ui/primitives/Button';
import { SoonBadge } from '@/ui/primitives/PreviewBadge';

export function Settings({ children }: { children: ChildRow[] }) {
  const { themePref, nightAuto, activeChildId, set } = useUi();
  const pending = useLiveQuery(() => db().outbox.count(), []) ?? 0;
  const lastSync = useLiveQuery(() => db().meta.get('last_sync_at'), [])?.value as string | undefined;
  const [adding, setAdding] = useState(false);
  const [wipe, setWipe] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <h1 className="mb-3 text-large-title">Налаштування</h1>

      <GlassCard className="flex flex-col gap-3">
        <h2 className="text-title-2">Діти</h2>
        <ul className="flex flex-col gap-2">
          {children.map((c) => (
            <li key={c.id}>
              <button onClick={() => set({ activeChildId: c.id })} aria-pressed={c.id === activeChildId}
                className="flex min-h-11 w-full items-center justify-between rounded-control px-3 text-left text-headline hover:bg-surface-border">
                {c.name}{c.id === activeChildId && <Check size={18} className="text-accent" aria-label="Активна" />}
              </button>
            </li>
          ))}
        </ul>
        {adding ? <Onboarding compact onDone={() => setAdding(false)} /> : <Button variant="secondary" onClick={() => setAdding(true)}>Додати дитину</Button>}
      </GlassCard>

      <GlassCard className="flex flex-col gap-3">
        <h2 className="text-title-2">Вигляд</h2>
        <Segmented<ThemePref> label="Тема" value={themePref} onChange={(v) => set({ themePref: v })}
          options={[{ value: 'system', label: 'Як у системі' }, { value: 'light', label: 'Світла' }, { value: 'dark', label: 'Темна' }]} />
        <label className="flex min-h-11 items-center justify-between gap-3 text-body">
          <span>Нічний режим автоматично<span className="block text-footnote text-text-secondary">Під час сну та з 21:00 до 06:00</span></span>
          <input id="night-auto" type="checkbox" className="h-6 w-6 accent-[var(--accent)]" checked={nightAuto} onChange={(e) => set({ nightAuto: e.target.checked })} />
        </label>
      </GlassCard>

      <GlassCard className="flex flex-col gap-2">
        <h2 className="text-title-2">Синхронізація</h2>
        {syncAvailable ? (
          <p className="text-subhead text-text-secondary">
            {pending ? `Очікує надсилання: ${pending}` : 'Усе синхронізовано'}{lastSync && ` · ${new Date(lastSync).toLocaleTimeString('uk-UA')}`}
          </p>
        ) : (
          <>
            <p className="flex items-center gap-2 text-subhead text-text-secondary"><CloudOff size={16} aria-hidden /> Дані зберігаються лише на цьому пристрої.</p>
            <p className="text-footnote text-text-secondary">Локальних змін у черзі: {pending}. Вони надішлються, щойно буде вхід в акаунт.</p>
            <div className="flex flex-wrap gap-2"><SoonBadge>Вхід і сім'я — доступно в повній версії</SoonBadge></div>
          </>
        )}
      </GlassCard>

      <GlassCard className="flex flex-col gap-3">
        <h2 className="text-title-2">Дані на пристрої</h2>
        {wipe ? (
          <div className="flex flex-col gap-3">
            <p className="text-subhead">Видалити всіх дітей і записи сну з цього пристрою? Це не можна скасувати.</p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setWipe(false)}>Скасувати</Button>
              <Button variant="danger" className="flex-1" onClick={async () => { await db().delete(); try { localStorage.removeItem('lumi.ui'); } catch { /* */ } location.reload(); }}>Видалити</Button>
            </div>
          </div>
        ) : <Button variant="secondary" className="text-danger" onClick={() => setWipe(true)}>Видалити локальні дані</Button>}
      </GlassCard>
      <p className="px-1 text-footnote text-text-secondary">LUMI {__APP_VERSION__} · без реклами, без платних сервісів. Поради не замінюють консультацію педіатра.</p>
    </div>
  );
}
