import { useEffect } from 'react';
import { useUi } from '@/app/store';
import { useNightActive } from '@/app/nightMode';
import { shouldUseNightMode } from '@/domain/sleep/nightMode';
import { useActiveChild, useChildren } from '@/features/children/hooks';
import { useSleepSessions } from '@/features/sleep/hooks';
import { useNow } from '@/ui/hooks/useNow';
import { Home } from './Home';
import { NightView } from './NightView';

export function HomeRoute() {
  const list = useChildren();
  const child = useActiveChild(Array.isArray(list) ? list : []);
  const sessions = useSleepSessions(child?.id ?? null) ?? [];
  const now = useNow(30_000);
  const { nightAuto, nightDismissedUntil, set } = useUi();
  const asleep = sessions.some((s) => s.endedAt === null);
  const night = shouldUseNightMode({ auto: nightAuto, asleep, now, dismissedUntil: nightDismissedUntil });
  const setActive = useNightActive((s) => s.setActive);
  useEffect(() => { setActive(night); return () => setActive(false); }, [night, setActive]);

  if (!child) return null;
  if (night) {
    return (
      <div className="fixed inset-0 z-50 overflow-auto bg-bg">
        <NightView childId={child.id} name={child.name} sessions={sessions} onExit={() => set({ nightDismissedUntil: Date.now() + 3_600_000 })} />
      </div>
    );
  }
  return <Home child={child} sessions={sessions} />;
}
