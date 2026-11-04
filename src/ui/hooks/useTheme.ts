import { useEffect, useState } from 'react';
import type { ThemeName } from '../tokens';
import type { ThemePref } from '@/app/store';

function systemDark(): boolean {
  const host = document.documentElement.getAttribute('data-theme'); // тема середовища (наприклад, переглядача артефакту)
  if (host === 'dark') return true;
  if (host === 'light') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

/** Обчислює тему і ставить її на <html data-lumi-theme>. */
export function useTheme(pref: ThemePref, night: boolean): ThemeName {
  const [dark, setDark] = useState(systemDark);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const upd = () => setDark(systemDark());
    mq?.addEventListener('change', upd);
    const mo = new MutationObserver(upd);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { mq?.removeEventListener('change', upd); mo.disconnect(); };
  }, []);
  const theme: ThemeName = night ? 'night' : pref === 'system' ? (dark ? 'dark' : 'light') : pref;
  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute('data-lumi-theme', theme);
    el.style.colorScheme = theme === 'light' ? 'light' : 'dark';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#FAF7F2' : theme === 'dark' ? '#0E1220' : '#07090F');
  }, [theme]);
  return theme;
}
