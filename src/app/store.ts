import { create } from 'zustand';

export type ThemePref = 'system' | 'light' | 'dark';
interface UiState {
  activeChildId: string | null;
  themePref: ThemePref;
  nightAuto: boolean;
  nightDismissedUntil: number; // мс; ручний вихід з нічного режиму
  set: (p: Partial<Omit<UiState, 'set'>>) => void;
}

const KEY = 'lumi.ui';
function load(): Partial<UiState> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<UiState>; } catch { return {}; }
}

export const useUi = create<UiState>((set) => ({
  activeChildId: null, themePref: 'system', nightAuto: true, nightDismissedUntil: 0,
  ...load(),
  set: (p) => set((s) => {
    const next = { ...s, ...p };
    try {
      const { activeChildId, themePref, nightAuto, nightDismissedUntil } = next;
      localStorage.setItem(KEY, JSON.stringify({ activeChildId, themePref, nightAuto, nightDismissedUntil }));
    } catch { /* сховище недоступне — налаштування живуть до перезавантаження */ }
    return next;
  }),
}));
