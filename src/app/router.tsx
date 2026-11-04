import { createBrowserRouter, createMemoryRouter, type RouteObject } from 'react-router-dom';
import { AppShell } from './AppShell';
import { RedirectIfSignedIn, RequireAuth, RequireChild } from './guards';
import { HomeRoute } from '@/features/home/ui/HomeRoute';
import { SettingsRoute } from '@/features/settings/ui/SettingsRoute';
import { OnboardingRoute } from '@/features/onboarding/ui/OnboardingRoute';
import { InviteLanding, ResetPassword, SignIn, SignUp, UpdatePassword } from '@/features/auth/ui/AuthScreens';

const routes: RouteObject[] = [
  { path: '/auth/sign-in', element: <RedirectIfSignedIn><SignIn /></RedirectIfSignedIn> },
  { path: '/auth/sign-up', element: <RedirectIfSignedIn><SignUp /></RedirectIfSignedIn> },
  { path: '/auth/reset', element: <ResetPassword /> },
  { path: '/auth/update-password', element: <RequireAuth><UpdatePassword /></RequireAuth> },
  { path: '/invite/:token', element: <InviteLanding /> },
  { path: '/onboarding', element: <RequireAuth><OnboardingRoute /></RequireAuth> },
  {
    element: <RequireAuth><RequireChild><AppShell /></RequireChild></RequireAuth>,
    children: [
      { index: true, element: <HomeRoute /> },
      { path: 'settings', element: <SettingsRoute /> },
    ],
  },
  { path: '*', element: <RequireAuth><RequireChild><AppShell /></RequireChild></RequireAuth>, children: [{ path: '*', element: <HomeRoute /> }] },
];

/** В артефакт-прев'ю адресний рядок недоступний — маршрути живуть у пам'яті. */
export const router = import.meta.env.MODE === 'preview-artifact' ? createMemoryRouter(routes) : createBrowserRouter(routes);
