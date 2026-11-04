import type { Config } from 'tailwindcss';
import { themes } from './src/ui/tokens';

// color-mix дозволяє модифікатори прозорості (bg-sleep/20) для CSS-змінних з hex
const colors = Object.fromEntries(
  Object.keys(themes.light).map((k) => [k, `color-mix(in srgb, var(--${k}) calc(<alpha-value> * 100%), transparent)`]),
);

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors,
      borderRadius: { chip: '10px', control: '16px', card: '24px', sheet: '32px' },
      fontFamily: { sans: ['-apple-system', '"SF Pro Text"', 'Inter', 'system-ui', 'sans-serif'] },
      fontSize: {
        'display-timer': ['3.5rem', { lineHeight: '3.75rem', fontWeight: '600' }],
        'large-title': ['2.125rem', { lineHeight: '2.5625rem', fontWeight: '700' }],
        'title-1': ['1.75rem', { lineHeight: '2.125rem', fontWeight: '700' }],
        'title-2': ['1.375rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        headline: ['1.0625rem', { lineHeight: '1.375rem', fontWeight: '600' }],
        body: ['1.0625rem', { lineHeight: '1.5rem' }],
        subhead: ['0.9375rem', { lineHeight: '1.25rem' }],
        footnote: ['0.8125rem', { lineHeight: '1.125rem' }],
        caption: ['0.75rem', { lineHeight: '1rem', fontWeight: '500' }],
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,24,40,.04), 0 8px 24px rgba(20,24,40,.06)',
        sheet: '0 -8px 40px rgba(20,24,40,.12)',
      },
    },
  },
} satisfies Config;
