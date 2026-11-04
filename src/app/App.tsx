import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { db } from '@/data/db';
import { bindLocalDataToUser } from '@/data/session';
import { startSyncLoop } from '@/data/sync/runner';
import { onSession } from '@/platform/auth';
import { useTheme } from '@/ui/hooks/useTheme';
import { UpdatePrompt } from '@/platform/UpdatePrompt';
import { useNightActive } from './nightMode';
import { router } from './router';
import { useSession } from './session';
import { useUi } from './store';

export function App() {
  const themePref = useUi((s) => s.themePref);
  const night = useNightActive((s) => s.active);
  useTheme(themePref, night);

  const { session, setSession } = useSession();
  const userId = session?.user.id ?? null;
  useEffect(() => onSession(setSession), [setSession]);
  useEffect(() => {
    if (!userId) return;
    let stop = () => {};
    let cancelled = false;
    void bindLocalDataToUser(db(), userId).then(() => { if (!cancelled) stop = startSyncLoop(); });
    return () => { cancelled = true; stop(); };
  }, [userId]);

  return (
    <>
      <RouterProvider router={router} />
      <UpdatePrompt />
    </>
  );
}
