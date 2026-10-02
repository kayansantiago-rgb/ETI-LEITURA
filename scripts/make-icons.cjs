// Gera os ícones do aplicativo instalável a partir do logo (frontend/public/eti-logo.svg).
// Uso: node scripts/make-icons.cjs
const fs = require('fs');
const path = require('path');
const { chromium } = require('../frontend/node_modules/playwright');

const PUBLIC = path.join(__dirname, '..', 'frontend', 'public');
const logo = fs.readFileSync(path.join(PUBLIC, 'eti-logo.svg'), 'utf8');
const inner = logo.replace(/^[\s\S]*?<\/defs>/, '').replace(/<rect[^>]*\/>/, '').replace(/<\/svg>\s*$/, '');
const defs = logo.match(/<defs>[\s\S]*?<\/defs>/)[0];

// "maskable": fundo ocupando tudo e desenho dentro da área segura (80%), para o Android recortar em círculo ou gota.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">${defs}<rect width="80" height="80" fill="url(#g)"/><g transform="translate(40 40) scale(.74) translate(-40 -40)">${inner}</g></svg>`;
// Ícone da Apple: quadrado cheio (o iPhone arredonda sozinho).
const apple = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">${defs}<rect width="80" height="80" fill="url(#g)"/><g transform="translate(40 40) scale(.86) translate(-40 -40)">${inner}</g></svg>`;

const jobs = [
  ['icons/eti-192.png', logo, 192],
  ['icons/eti-512.png', logo, 512],
  ['icons/eti-maskable-512.png', maskable, 512],
  ['icons/eti-maskable-192.png', maskable, 192],
  ['icons/apple-touch-icon.png', apple, 180]
];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  for (const [file, svg, size] of jobs) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:transparent"><img style="display:block;width:${size}px;height:${size}px" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}"></body></html>`);
    await page.waitForFunction(() => document.querySelector('img').complete);
    await page.screenshot({ path: path.join(PUBLIC, file), omitBackground: true });
    console.log('gerado', file);
  }
  await browser.close();
})();
