import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/ui/primitives/Button';

/** Плашка «Доступна нова версія». Офлайн-готовність показуємо один раз. */
export function UpdatePrompt() {
  const { needRefresh: [needRefresh, setNeedRefresh], offlineReady: [offlineReady, setOfflineReady], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, reg) { if (reg) setInterval(() => void reg.update(), 60 * 60 * 1000); },
  });
  if (!needRefresh && !offlineReady) return null;
  return (
    <div role="status" className="glass fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+76px)] z-40 mx-auto flex max-w-[calc(100%-40px)] items-center gap-3 rounded-card p-4 shadow-card sm:max-w-sm">
      <p className="min-w-0 flex-1 text-subhead">{needRefresh ? 'Доступна нова версія LUMI.' : 'LUMI готовий працювати без інтернету.'}</p>
      {needRefresh
        ? <Button className="min-h-11" onClick={() => void updateServiceWorker(true)}>Оновити</Button>
        : <Button variant="ghost" onClick={() => setOfflineReady(false)}>Добре</Button>}
      {needRefresh && <Button variant="ghost" onClick={() => setNeedRefresh(false)}>Пізніше</Button>}
    </div>
  );
}
