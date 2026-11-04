import { NavLink, Outlet } from 'react-router-dom';
import { Home as HomeIcon, Settings as SettingsIcon } from 'lucide-react';

const tabs = [
  { to: '/', label: 'Головна', Icon: HomeIcon, end: true },
  { to: '/settings', label: 'Налаштування', Icon: SettingsIcon, end: false },
];

export function AppShell() {
  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <main className="px-5 pb-[calc(env(safe-area-inset-bottom)+96px)] pt-[calc(env(safe-area-inset-top)+20px)]">
        <Outlet />
      </main>
      <nav aria-label="Розділи" className="glass fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md justify-around border-x-0 border-b-0 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-1">
        {tabs.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => `flex min-h-14 min-w-20 flex-col items-center justify-center gap-0.5 text-caption ${isActive ? 'text-accent' : 'text-text-secondary'}`}>
            <Icon size={24} aria-hidden />{label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
