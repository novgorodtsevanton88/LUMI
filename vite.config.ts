import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath, URL } from 'node:url';
import pkg from './package.json' with { type: 'json' };

const src = (p: string) => fileURLToPath(new URL(`./src/${p}`, import.meta.url));

// `vite build --mode preview-artifact` — один HTML-файл для артефакт-прев'ю (без бекенду і Service Worker).
export default defineConfig(({ mode }) => {
  const preview = mode === 'preview-artifact';
  return {
    plugins: [
      react(),
      preview
        ? viteSingleFile()
        : VitePWA({
            strategies: 'injectManifest',
            srcDir: 'src/app',
            filename: 'sw.ts',
            registerType: 'prompt',
            injectRegister: false,
            injectManifest: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'], globIgnores: ['splash/**'] },
            devOptions: { enabled: false },
            manifest: {
              name: 'LUMI — помічник для батьків',
              short_name: 'LUMI',
              description: 'Сон, здоров\'я і розвиток дитини 0–5 років. Безкоштовно, без реклами.',
              lang: 'uk',
              dir: 'ltr',
              start_url: '/',
              scope: '/',
              display: 'standalone',
              orientation: 'portrait',
              background_color: '#FAF7F2',
              theme_color: '#FAF7F2',
              categories: ['health', 'lifestyle', 'parenting'],
              icons: [
                { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
                { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
              ],
            },
          }),
    ],
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    resolve: {
      alias: {
        '@': src(''),
        ...(preview ? { 'virtual:pwa-register/react': src('platform/pwaRegisterStub.ts') } : {}),
      },
    },
    build: preview ? { outDir: 'dist-preview' } : {},
    test: { environment: 'node', include: ['src/**/*.test.ts'] },
  };
});
