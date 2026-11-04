import { format } from 'date-fns';
import { currentState, formatDuration, formatTimer, suggestKind, type SleepSession } from '@/domain/sleep/sessions';
import { db } from '@/data/db';
import { startSleep, stopSleep } from '@/features/sleep/service';
import { SleepButton } from '@/features/sleep/ui/SleepButton';
import { useNow } from '@/ui/hooks/useNow';

/** Нічний режим: таймер і одна велика кнопка, теплий акцент, без анімацій. */
export function NightView({ childId, name, sessions, onExit }: { childId: string; name: string; sessions: SleepSession[]; onExit: () => void }) {
  const now = useNow();
  const st = currentState(sessions, now);
  const toggle = () => (st.state === 'asleep' ? stopSleep(db(), childId) : startSleep(db(), childId, new Date(), suggestKind(new Date()))).catch(() => {});
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-between px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-[calc(env(safe-area-inset-top)+24px)] text-center">
      <div>
        <p className="text-subhead text-text-secondary">{format(now, 'HH:mm')} · нічний режим</p>
        <p className="mt-1 text-headline">{name}</p>
      </div>
      <div>
        <p className="text-subhead text-text-secondary">
          {st.state === 'asleep' ? `Спить з ${format(st.session.startedAt, 'HH:mm')}` : st.awakeMs != null ? `Не спить ${formatDuration(st.awakeMs)}` : 'Сну ще не було'}
        </p>
        <p className="text-display-timer tabular-nums">{st.state === 'asleep' ? formatTimer(st.elapsedMs) : '— : —'}</p>
      </div>
      <div className="flex flex-col items-center gap-6">
        <SleepButton asleep={st.state === 'asleep'} onPress={toggle} size={112} />
        <button onClick={onExit} className="min-h-11 px-4 text-subhead text-text-secondary underline-offset-4 hover:underline">Звичайний вигляд на годину</button>
      </div>
    </div>
  );
}
