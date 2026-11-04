import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath, URL } from 'node:url';
import pkg from './package.json' with { type: 'json' };

// `vite build --mode preview-artifact` — один HTML-файл для артефакт-прев'ю (без бекенду).
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'preview-artifact' ? [viteSingleFile()] : [])],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: mode === 'preview-artifact' ? { outDir: 'dist-preview' } : {},
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
}));
