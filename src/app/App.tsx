import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Home as HomeIcon, Settings as SettingsIcon } from 'lucide-react';
import { db } from '@/data/db';
import { startSyncLoop } from '@/data/sync/runner';
import { shouldUseNightMode } from '@/domain/sleep/nightMode';
import { useSleepSessions } from '@/features/sleep/hooks';
import { Onboarding } from '@/features/onboarding/ui/Onboarding';
import { Home } from '@/features/home/ui/Home';
import { NightView } from '@/features/home/ui/NightView';
import { Settings } from '@/features/settings/ui/Settings';
import { useNow } from '@/ui/hooks/useNow';
import { useTheme } from '@/ui/hooks/useTheme';
import { useUi } from './store';

type Tab = 'home' | 'settings';

export function App() {
  const ui = useUi();
  const [tab, setTab] = useState<Tab>('home');
  const [storageError, setStorageError] = useState(false);
  const now = useNow(30_000);
  const children = useLiveQuery(
    () => db().children.toArray().then((r) => r.filter((c) => !c.deleted_at)).catch(() => { setStorageError(true); return []; }),
    [],
  );
  const child = children?.find((c) => c.id === ui.activeChildId) ?? children?.[0];
  const sessions = useSleepSessions(child?.id ?? null) ?? [];
  const asleep = sessions.some((s) => s.endedAt === null);
  const night = !!child && tab === 'home' && shouldUseNightMode({ auto: ui.nightAuto, asleep, now, dismissedUntil: ui.nightDismissedUntil });
  useTheme(ui.themePref, night);

  useEffect(() => startSyncLoop(), []);
  useEffect(() => { if (child && child.id !== ui.activeChildId) ui.set({ activeChildId: child.id }); }, [child, ui]);

  if (storageError) {
    return <p className="mx-auto max-w-md p-5 text-body">Браузер не дає зберігати дані (приватний режим або заблоковане сховище). Відкрийте LUMI у звичайному вікні.</p>;
  }
  if (!children) return null;
  if (!child) return <Onboarding />;
  if (night) {
    return <NightView childId={child.id} name={child.name} sessions={sessions} onExit={() => ui.set({ nightDismissedUntil: Date.now() + 3_600_000 })} />;
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <main className="px-5 pb-[calc(env(safe-area-inset-bottom)+96px)] pt-[calc(env(safe-area-inset-top)+20px)]">
        {tab === 'home' ? <Home child={child} sessions={sessions} /> : <Settings children={children} />}
      </main>
      <nav aria-label="Розділи" className="glass fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md justify-around border-x-0 border-b-0 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-1">
        {([['home', 'Головна', HomeIcon], ['settings', 'Налаштування', SettingsIcon]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}
            className={`flex min-h-14 min-w-20 flex-col items-center justify-center gap-0.5 text-caption ${tab === id ? 'text-accent' : 'text-text-secondary'}`}>
            <Icon size={24} aria-hidden />{label}
          </button>
        ))}
      </nav>
    </div>
  );
}
