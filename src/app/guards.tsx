import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useChildren } from '@/features/children/hooks';
import { backendConfigured, useSession } from './session';

/** Без сесії — на вхід (коли бекенд налаштований). У локальному режимі / прев'ю вхід не потрібен. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, session } = useSession();
  const loc = useLocation();
  if (!backendConfigured) return <>{children}</>;
  if (!ready) return null;
  if (!session) return <Navigate to={`/auth/sign-in?next=${encodeURIComponent(loc.pathname)}`} replace />;
  return <>{children}</>;
}

export function RedirectIfSignedIn({ children }: { children: ReactNode }) {
  const { session } = useSession();
  return session ? <Navigate to="/" replace /> : <>{children}</>;
}

export function RequireChild({ children }: { children: ReactNode }) {
  const list = useChildren();
  if (list === undefined) return null;
  if (list === 'error') {
    return <p className="mx-auto max-w-md p-5 text-body">Браузер не дає зберігати дані (приватний режим або заблоковане сховище). Відкрийте LUMI у звичайному вікні.</p>;
  }
  if (!list.length) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}
