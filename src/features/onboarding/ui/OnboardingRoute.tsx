import { Navigate, useNavigate } from 'react-router-dom';
import { useChildren } from '@/features/children/hooks';
import { Onboarding } from './Onboarding';

export function OnboardingRoute() {
  const nav = useNavigate();
  const list = useChildren();
  if (Array.isArray(list) && list.length) return <Navigate to="/" replace />;
  return <Onboarding onDone={() => nav('/', { replace: true })} />;
}
