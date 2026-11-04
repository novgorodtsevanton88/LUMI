/** Токени дизайн-системи «тихе скло» (план Фази 0, розділ 7). Значення — RGB-тріплети для CSS-змінних. */
export type ThemeName = 'light' | 'dark' | 'night';

type Palette = Record<
  | 'bg' | 'surface' | 'surface-border' | 'text-primary' | 'text-secondary' | 'text-tertiary'
  | 'accent' | 'on-accent' | 'sleep' | 'growth' | 'health' | 'develop' | 'calendar'
  | 'success' | 'warning' | 'danger',
  string
>;

export const themes: Record<ThemeName, Palette> = {
  light: {
    bg: '#FAF7F2', surface: 'rgba(255,255,255,0.72)', 'surface-border': 'rgba(20,24,40,0.06)',
    'text-primary': '#1C1E26', 'text-secondary': '#5B5F6E', 'text-tertiary': '#80838F',
    accent: '#5B57D9', 'on-accent': '#FFFFFF', sleep: '#8B87F0', growth: '#5FB8A5', health: '#F08A7E',
    develop: '#F2B65A', calendar: '#6AA8E8', success: '#23865B', warning: '#B7791F', danger: '#C9423E',
  },
  dark: {
    bg: '#0E1220', surface: 'rgba(26,32,51,0.64)', 'surface-border': 'rgba(255,255,255,0.08)',
    'text-primary': '#F2F3F7', 'text-secondary': '#A9AEC0', 'text-tertiary': '#6F758A',
    accent: '#A6A3FF', 'on-accent': '#0E1220', sleep: '#A6A3FF', growth: '#7FD3BF', health: '#FF9E92',
    develop: '#FFC774', calendar: '#8CC2FF', success: '#5BD19A', warning: '#F5C065', danger: '#FF7A72',
  },
  night: {
    bg: '#07090F', surface: 'rgba(18,20,28,0.8)', 'surface-border': 'rgba(255,255,255,0.05)',
    'text-primary': '#E6DCCB', 'text-secondary': '#9C9284', 'text-tertiary': '#6E665A',
    accent: '#F2A77E', 'on-accent': '#07090F', sleep: '#F2A77E', growth: '#F2A77E', health: '#F2A77E',
    develop: '#F2A77E', calendar: '#F2A77E', success: '#5BD19A', warning: '#F5C065', danger: '#FF7A72',
  },
};

export const spacing = [4, 8, 12, 16, 20, 24, 32, 40, 48] as const;
export const radius = { chip: 10, control: 16, card: 24, sheet: 32, round: 9999 } as const;
export const motion = { press: 0.12, appear: 0.2, sheet: 0.32, spring: { stiffness: 400, damping: 34 } } as const;

export function themeCss(): string {
  return (Object.keys(themes) as ThemeName[])
    .map((t) => {
      const vars = Object.entries(themes[t]).map(([k, v]) => `--${k}:${v};`).join('');
      return `${t === 'light' ? ':root,' : ''}[data-theme="${t}"]{${vars}}`;
    })
    .join('\n');
}
