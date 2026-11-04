import { create } from 'zustand';

/** Чи показує зараз Головна нічний режим — щоб тема застосунку теж стала нічною. */
export const useNightActive = create<{ active: boolean; setActive: (v: boolean) => void }>((set) => ({
  active: false,
  setActive: (active) => set({ active }),
}));
