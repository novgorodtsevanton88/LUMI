// Генерує PNG-іконки та iOS splash-екрани з public/icons/icon.svg.
// Запуск: node scripts/generate-icons.cjs (потрібен playwright з chromium).
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'public');
const svg = fs.readFileSync(path.join(root, 'icons/icon.svg'), 'utf8');
const inner = svg.replace(/<rect[^>]*\/>/, '').replace(/<svg[^>]*>|<\/svg>/g, '');

const icons = [
  ['icons/icon-192.png', 192, svg],
  ['icons/icon-512.png', 512, svg],
  ['icons/apple-touch-icon-180.png', 180, svg.replace('rx="112"', 'rx="0"')],
  // maskable: повне тло, знак у безпечній зоні 80%
  ['icons/icon-maskable-512.png', 512, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${svg.match(/<defs>.*<\/defs>/s)[0]}<rect width="512" height="512" fill="url(#g)"/><g transform="translate(51 51) scale(.8)">${inner.replace(/<defs>.*<\/defs>/s, '')}</g></svg>`],
];
// [ширина, висота, device-width, device-height, dpr] — портрет
const splash = [[750, 1334, 375, 667, 2], [1170, 2532, 390, 844, 3], [1179, 2556, 393, 852, 3], [1284, 2778, 428, 926, 3], [1290, 2796, 430, 932, 3], [1206, 2622, 402, 874, 3], [1320, 2868, 440, 956, 3]];

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const [file, size, s] of icons) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${s}`);
    await p.screenshot({ path: path.join(root, file), omitBackground: true });
  }
  const links = [];
  for (const [w, h, dw, dh, dpr] of splash) {
    await p.setViewportSize({ width: w, height: h });
    const icon = Math.round(w * 0.28);
    await p.setContent(`<style>*{margin:0}body{width:${w}px;height:${h}px;background:#FAF7F2;display:grid;place-items:center;font:600 ${Math.round(w / 16)}px -apple-system,system-ui}div{display:grid;justify-items:center;gap:${Math.round(w / 30)}px;color:#1C1E26}svg{width:${icon}px;height:${icon}px}</style><div>${svg}<span>LUMI</span></div>`);
    const name = `splash/apple-splash-${w}x${h}.png`;
    await p.screenshot({ path: path.join(root, name) });
    links.push(`<link rel="apple-touch-startup-image" href="/${name}" media="(device-width: ${dw}px) and (device-height: ${dh}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)" />`);
  }
  await b.close();
  console.log(links.join('\n'));
})();
