import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { ChevronRight, CloudOff, Plus } from 'lucide-react';
import { ChildAvatar } from '@/features/children/ui/ChildAvatar';
import { db, type ChildRow } from '@/data/db';
import { flushBeforeSignOut, syncAvailable } from '@/data/sync/runner';
import { wipeLocal } from '@/data/session';
import { signOut } from '@/platform/auth';
import { useSession } from '@/app/session';
import { useUi, type ThemePref } from '@/app/store';
import { GlassCard } from '@/ui/primitives/GlassCard';
import { Segmented } from '@/ui/primitives/Segmented';
import { Button } from '@/ui/primitives/Button';
import { SoonBadge } from '@/ui/primitives/PreviewBadge';

export function Settings({ children }: { children: ChildRow[] }) {
  const { themePref, nightAuto, activeChildId, set } = useUi();
  const pending = useLiveQuery(() => db().outbox.count(), []) ?? 0;
  const lastSync = useLiveQuery(() => db().meta.get('last_sync_at'), [])?.value as string | undefined;
  const [wipe, setWipe] = useState(false);
  const session = useSession((s) => s.session);
  const [leaving, setLeaving] = useState<null | 'checking' | number>(null);

  async function startSignOut() {
    setLeaving('checking');
    const left = await flushBeforeSignOut();
    if (left === 0) await finishSignOut(); else setLeaving(left);
  }
  async function finishSignOut() {
    await signOut();
    await wipeLocal(db()); // на спільному пристрої дані дитини не залишаються після виходу
    setLeaving(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="mb-3 text-large-title">Налаштування</h1>

      <GlassCard className="flex flex-col gap-2">
        <h2 className="text-title-2">Діти</h2>
        <ul className="flex flex-col">
          {children.map((c) => (
            <li key={c.id}>
              <Link to={`/children/${c.id}`} className="flex min-h-14 items-center gap-3 rounded-control px-2 text-headline hover:bg-surface-border">
                <ChildAvatar child={c} size={40} /><span className="flex-1 truncate">{c.name}</span>
                {c.id === activeChildId && <span className="text-footnote text-text-secondary">активна</span>}
                <ChevronRight size={18} className="text-text-tertiary" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
        <Link to="/children/new" className="flex min-h-11 items-center gap-2 px-2 text-headline text-accent"><Plus size={20} aria-hidden />Додати дитину</Link>
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

      {session && (
        <GlassCard className="flex flex-col gap-3">
          <h2 className="text-title-2">Акаунт</h2>
          <p className="text-subhead text-text-secondary">{session.user.email}</p>
          {typeof leaving === 'number' ? (
            <div className="flex flex-col gap-3">
              <p className="text-subhead">Ще не надіслано змін: {leaving}. Якщо вийти зараз, вони зникнуть з цього пристрою. Підключіться до інтернету, щоб зберегти їх.</p>
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setLeaving(null)}>Залишитися</Button>
                <Button variant="danger" className="flex-1" onClick={finishSignOut}>Вийти все одно</Button>
              </div>
            </div>
          ) : <Button variant="secondary" disabled={leaving === 'checking'} onClick={startSignOut}>{leaving === 'checking' ? 'Надсилаємо зміни…' : 'Вийти'}</Button>}
        </GlassCard>
      )}

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
