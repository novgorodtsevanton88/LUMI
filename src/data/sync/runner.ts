import { supabase } from '@/platform/supabase';
import { db } from '../db';
import { supabaseTransport } from './supabaseTransport';
import { syncOnce } from './sync';

export const syncAvailable = supabase !== null;
let running = false;

/** Фоновий цикл: при старті, при поверненні мережі та кожні 60 с. Realtime додається з Auth (лише як сигнал). */
export function startSyncLoop(): () => void {
  if (!supabase) return () => {};
  const t = supabaseTransport(supabase);
  const tick = async () => {
    if (running || !navigator.onLine) return;
    running = true;
    try { await syncOnce(db(), t); } catch (e) { console.warn('sync', e); } finally { running = false; }
  };
  void tick();
  const id = setInterval(tick, 60_000);
  window.addEventListener('online', tick);
  return () => { clearInterval(id); window.removeEventListener('online', tick); };
}
