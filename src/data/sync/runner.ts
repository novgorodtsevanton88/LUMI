import { supabase } from '@/platform/supabase';
import { db } from '../db';
import { supabaseTransport } from './supabaseTransport';
import { SYNC_TABLES, syncOnce } from './sync';

export const syncAvailable = supabase !== null;
let running = false;
let again = false;

/**
 * Фоновий цикл для користувача, що увійшов: одразу, при поверненні мережі, при поверненні у вкладку,
 * за сигналом Realtime і кожні 60 с. Realtime несе лише сигнал «щось змінилось», дані — тільки через pull.
 */
export function startSyncLoop(): () => void {
  const sb = supabase;
  if (!sb) return () => {};
  const t = supabaseTransport(sb);
  const tick = async () => {
    if (!navigator.onLine) return;
    if (running) { again = true; return; }
    running = true;
    try {
      do { again = false; await syncOnce(db(), t); } while (again);
    } catch (e) { console.warn('sync', e); } finally { running = false; }
  };
  const onVisible = () => document.visibilityState === 'visible' && void tick();
  const soon = () => { setTimeout(tick, 300); };
  db().outbox.hook('creating', soon);
  db().outbox.hook('updating', soon);
  const channel = sb.channel('lumi-sync');
  for (const table of SYNC_TABLES) channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => void tick());
  channel.subscribe();

  void tick();
  const id = setInterval(tick, 60_000);
  window.addEventListener('online', tick);
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    clearInterval(id);
    window.removeEventListener('online', tick);
    document.removeEventListener('visibilitychange', onVisible);
    db().outbox.hook('creating').unsubscribe(soon);
    db().outbox.hook('updating').unsubscribe(soon);
    void sb.removeChannel(channel);
  };
}

/** Спроба надіслати все перед виходом. Повертає кількість ненадісланих змін. */
export async function flushBeforeSignOut(): Promise<number> {
  if (supabase && navigator.onLine) {
    try { await syncOnce(db(), supabaseTransport(supabase)); } catch { /* залишок покажемо користувачу */ }
  }
  return db().outbox.count();
}
