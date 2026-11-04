import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/platform/supabase';

export const backendConfigured = supabase !== null;

interface SessionState {
  ready: boolean; // перша перевірка сесії завершена
  session: Session | null;
  setSession: (s: Session | null) => void;
}

export const useSession = create<SessionState>((set) => ({
  ready: !backendConfigured,
  session: null,
  setSession: (session) => set({ session, ready: true }),
}));
