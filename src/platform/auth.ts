import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type AuthErrorCode = 'invalid_credentials' | 'email_not_confirmed' | 'user_exists' | 'weak_password' | 'rate_limited' | 'offline' | 'unknown';

function code(err: { message?: string; code?: string; status?: number } | null): AuthErrorCode | null {
  if (!err) return null;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
  const c = err.code ?? '';
  if (c === 'invalid_credentials') return 'invalid_credentials';
  if (c === 'email_not_confirmed') return 'email_not_confirmed';
  if (c === 'user_already_exists' || c === 'email_exists') return 'user_exists';
  if (c === 'weak_password') return 'weak_password';
  if (err.status === 429 || c.includes('rate_limit')) return 'rate_limited';
  return 'unknown';
}

function client() {
  if (!supabase) throw new Error('backend_not_configured');
  return supabase;
}

const origin = () => window.location.origin;

export async function signIn(email: string, password: string) {
  const { error } = await client().auth.signInWithPassword({ email, password });
  return code(error);
}

/** Повертає null і needsConfirm, якщо Supabase вимагає підтвердження email. */
export async function signUp(email: string, password: string, displayName: string) {
  const { data, error } = await client().auth.signUp({
    email, password,
    options: { data: { display_name: displayName }, emailRedirectTo: `${origin()}/` },
  });
  return { error: code(error), needsConfirm: !error && !data.session };
}

export async function requestPasswordReset(email: string) {
  const { error } = await client().auth.resetPasswordForEmail(email, { redirectTo: `${origin()}/auth/update-password` });
  return code(error);
}

export async function updatePassword(password: string) {
  const { error } = await client().auth.updateUser({ password });
  return code(error);
}

export async function signOut() {
  await client().auth.signOut();
}

export function onSession(cb: (s: Session | null) => void): () => void {
  if (!supabase) { cb(null); return () => {}; }
  void supabase.auth.getSession().then(({ data }) => cb(data.session));
  const { data } = supabase.auth.onAuthStateChange((_e, s) => cb(s));
  return () => data.subscription.unsubscribe();
}

export const MIN_PASSWORD = 8;
