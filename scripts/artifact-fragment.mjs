// Перетворює dist-preview/index.html на фрагмент для артефакт-прев'ю (без <html>/<head>/<body>).
// Запуск: node scripts/artifact-fragment.mjs <вихідний файл>
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist-preview/index.html', 'utf8');
const styles = html.match(/<style[^>]*>[\s\S]*?<\/style>/g) ?? [];
const scripts = html.match(/<script[^>]*>[\s\S]*?<\/script>/g) ?? [];
const out = [
  "<title>LUMI прев'ю</title>",
  '<meta name="theme-color" content="#FAF7F2">',
  '<style>html,body{background:var(--bg);color:var(--text-primary)}</style>',
  ...styles,
  '<div id="root"></div>',
  ...scripts,
].join('\n');
writeFileSync(process.argv[2] ?? 'dist-preview/artifact.html', out);
