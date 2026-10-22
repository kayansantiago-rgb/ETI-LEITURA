// Gera imagens da plataforma para apresentações (dados fictícios de scripts/ui-fixtures).
// Uso: cd frontend && npm run build && node ../scripts/slide-shots.cjs
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('../frontend/node_modules/playwright');
const { respond } = require('./ui-fixtures/api.cjs');

const ROOT = path.resolve(__dirname, '../frontend/build');
const OUT = path.resolve(__dirname, '../.local/slides');
const PORT = 4174;
const BASE = `http://127.0.0.1:${PORT}`;
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.mjs': 'application/javascript' };
const STUDENT = { id: 's1', nome: 'Mariana Silva', email: 'mariana@example.com', turma: '7º ANO', role: 'student', termos_versao: '2026-10' };

const server = http.createServer((req, res) => {
  let file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(ROOT, 'index.html');
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

async function shoot(browser, viewport, url, wait, scale) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: scale, reducedMotion: 'reduce' });
  await page.route('**/api/**', route => {
    const req = route.request();
    const u = new URL(req.url());
    const result = respond(req.method(), u.pathname, u.searchParams, false, {});
    if (result.file) return route.fulfill({ status: 200, contentType: 'application/pdf', body: fs.readFileSync(result.file) });
    return route.fulfill({ status: result.status, json: result.json });
  });
  await page.goto(BASE + '/login');
  await page.evaluate(u => {
    localStorage.clear();
    localStorage.setItem('user', JSON.stringify(u));
    localStorage.setItem('token', 'mock-student');
    localStorage.setItem('eti-theme', 'light');
    localStorage.setItem('eti-push-prompt', String(Date.now()));
    localStorage.setItem('eti-tour-v1:' + u.id, 'visto');
    localStorage.setItem('eti-install-card', String(Date.now()));
    localStorage.setItem('eti-celebrated:' + u.id, '9999');
    sessionStorage.setItem('eti-splash-seen', '1');
  }, STUDENT);
  await page.goto(BASE + url);
  await page.locator('main').getByText(wait, { exact: false }).first().waitFor({ timeout: 10000 });
  await page.waitForTimeout(3500);
  const shot = await page.screenshot({ type: 'png' });
  await page.close();
  return 'data:image/png;base64,' + shot.toString('base64');
}

async function render(browser, html, size, file) {
  const page = await browser.newPage({ viewport: size, deviceScaleFactor: 2 });
  await page.setContent(html);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, file), omitBackground: true });
  await page.close();
}

const phone = (src, w) => `<div style="width:${w}px;padding:${w * 0.035}px;border-radius:${w * 0.14}px;background:#1e1b2e;box-shadow:0 24px 50px -18px rgba(49,29,110,.55)">
  <img src="${src}" style="display:block;width:100%;border-radius:${w * 0.11}px"></div>`;
const laptop = (src, w) => `<div style="width:${w}px">
  <div style="padding:${w * 0.018}px;border-radius:${w * 0.03}px ${w * 0.03}px 0 0;background:#1e1b2e"><img src="${src}" style="display:block;width:100%;border-radius:4px"></div>
  <div style="height:${w * 0.03}px;margin:0 -${w * 0.06}px;border-radius:0 0 ${w * 0.03}px ${w * 0.03}px;background:linear-gradient(#d9d6e8,#b9b5cc);box-shadow:0 24px 40px -18px rgba(49,29,110,.5)"></div></div>`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  const deskDash = await shoot(browser, { width: 1440, height: 900 }, '/dashboard', 'dias', 1);
  const deskLib = await shoot(browser, { width: 1440, height: 900 }, '/library', 'Biblioteca', 1);
  const phoneDash = await shoot(browser, { width: 390, height: 844 }, '/dashboard', 'dias', 2);
  const phoneLib = await shoot(browser, { width: 390, height: 844 }, '/library', 'Biblioteca', 2);
  const phoneQuiz = await shoot(browser, { width: 390, height: 844 }, '/quizzes', 'Desafios de leitura', 2);

  const wrap = body => `<body style="margin:0;background:transparent;font-family:sans-serif">${body}</body>`;
  // Notebook + celular sobrepostos.
  await render(browser, wrap(`<div style="position:relative;width:1000px;height:640px">
    <div style="position:absolute;left:40px;top:20px">${laptop(deskDash, 820)}</div>
    <div style="position:absolute;right:20px;bottom:10px">${phone(phoneQuiz, 230)}</div></div>`), { width: 1000, height: 640 }, 'notebook-celular.png');
  await render(browser, wrap(`<div style="padding:30px 60px 40px">${laptop(deskLib, 880)}</div>`), { width: 1000, height: 640 }, 'notebook-biblioteca.png');
  await render(browser, wrap(`<div style="display:flex;gap:26px;padding:20px 24px 40px">${phone(phoneLib, 250)}${phone(phoneQuiz, 250)}</div>`), { width: 600, height: 600 }, 'dois-celulares.png');
  await render(browser, wrap(`<div style="padding:20px 20px 40px">${phone(phoneQuiz, 260)}</div>`), { width: 300, height: 620 }, 'celular.png');
  await render(browser, wrap(`<img src="data:image/svg+xml;base64,${fs.readFileSync(path.resolve(__dirname, '../frontend/public/eti-logo.svg')).toString('base64')}" style="width:240px;height:240px;display:block">`), { width: 240, height: 240 }, 'logo.png');

  await browser.close();
  server.close();
  console.log('Imagens em', OUT);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
