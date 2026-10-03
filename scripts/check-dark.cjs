// Procura, no tema escuro, elementos que ficaram com fundo claro ou texto escuro demais.
// Uso: cd frontend && npm run build && node ../scripts/check-dark.cjs
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('../frontend/node_modules/playwright');
const { respond } = require('./ui-fixtures/api.cjs');

const ROOT = path.join(__dirname, '..', 'frontend', 'build');
const PORT = 4791;
const BASE = `http://127.0.0.1:${PORT}`;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const STUDENT = { id: 's1', nome: 'Mariana Silva', email: 'mariana@example.com', turma: '7º ANO', role: 'student', termos_versao: '2026-10' };
const TEACHER = { id: 't1', nome: 'Ana Souza', email: 'ana@example.com', role: 'admin', turmas: ['7º ANO', '8º ANO'], termos_versao: '2026-10' };
const PAGES = [
  [STUDENT, ['/dashboard', '/library', '/book/1', '/activities', '/activities/a1', '/quizzes', '/workspace', '/notifications', '/ranking', '/profile', '/videos', '/summaries', '/text-productions', '/editor/1']],
  [TEACHER, ['/dashboard', '/admin/professor', '/admin/activities', '/admin/activities/a1', '/admin/summaries', '/admin/text-productions', '/admin/books', '/admin/classes', '/admin/classes/7%C2%BA%20ANO', '/admin/reports', '/workspace', '/quizzes', '/admin/mural', '/admin/calendar', '/admin/teachers', '/admin/rubrics']]
];
// Elementos claros de propósito (botões brancos sobre fundo colorido, capas, QR etc.).
const IGNORE = ['img', 'svg', 'canvas', 'iframe', 'video', '.th-actions', '.ia-cta', '.vd-play', '.vd-thumb', '.mu-media', '.lg-', '.cover', 'capa', '.react-pdf', '.rd-sheet', '.qz-cover', '.sk', '.cb-', '.qz-switch'];

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    const url = new URL(req.url, 'http://x');
    const result = respond(req.method, url.pathname, url.searchParams, (req.headers.authorization || '').includes('mock-admin'));
    if (result.file) return fs.createReadStream(result.file).pipe(res);
    res.writeHead(result.status, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(result.json));
  }
  let file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(ROOT, 'index.html');
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const report = {};
  for (const [user, urls] of PAGES) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, colorScheme: 'dark', serviceWorkers: 'block' });
    await page.route('**/api/**', async route => {
      const req = route.request();
      const url = new URL(req.url());
      const result = respond(req.method(), url.pathname, url.searchParams, (req.headers().authorization || '').includes('mock-admin'), {});
      if (result.file) return route.fulfill({ status: 200, contentType: 'application/pdf', body: fs.readFileSync(result.file) });
      return route.fulfill({ status: result.status, json: result.json });
    });
    await page.goto(BASE + '/login');
    await page.evaluate(([u, token]) => {
      localStorage.clear();
      localStorage.setItem('user', JSON.stringify(u));
      localStorage.setItem('token', token);
      localStorage.setItem('eti-theme', 'dark');
      localStorage.setItem('eti-push-prompt', String(Date.now()));
      localStorage.setItem('eti-tour-v1:' + u.id, 'visto');
      localStorage.setItem('eti-install-card', String(Date.now()));
      localStorage.setItem('eti-celebrated:' + u.id, JSON.stringify({ medals: ['primeira-pagina', 'sequencia-3', 'sequencia-7', 'livro-1', 'certificado-1'], goalDay: null }));
      sessionStorage.setItem('eti-splash-seen', '1');
    }, [user, user.role === 'student' ? 'mock-student' : 'mock-admin']);
    for (const url of urls) {
      await page.goto(BASE + url);
      await page.waitForTimeout(1600);
      const found = await page.evaluate(ignore => {
        if (!document.documentElement.classList.contains('dark')) return ['TEMA ESCURO NÃO ATIVO'];
        const lum = c => {
          const m = c.match(/\d+(\.\d+)?/g);
          if (!m) return null;
          const [r, g, b, a = 1] = m.map(Number);
          if (a < 0.5) return null;
          return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        };
        const out = new Map();
        document.querySelectorAll('main *, .ws-overlay *').forEach(el => {
          const own = (el.className?.toString() || '').trim().split(/\s+/).filter(Boolean).join('.');
          const parent = (el.parentElement?.className?.toString() || '').trim().split(/\s+/).slice(0, 2).join('.');
          const name = (el.tagName.toLowerCase() + (own ? '.' + own : ' em ' + parent) + ' "' + (el.textContent || '').trim().slice(0, 24) + '"').slice(0, 110);
          for (let a = el; a && a !== document.body; a = a.parentElement) {
            const cls = a.className?.toString() || '';
            if (ignore.some(i => (i.startsWith('.') ? cls.includes(i.slice(1)) : a.tagName.toLowerCase() === i || cls.includes(i)))) return;
          }
          const r = el.getBoundingClientRect();
          if (r.width < 4 || r.height < 4) return;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none') return;
          const bg = lum(cs.backgroundColor);
          if (bg !== null && bg > 0.86) out.set('fundo claro: ' + name, (out.get('fundo claro: ' + name) || 0) + 1);
          const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
          const fg = lum(cs.color);
          if (hasText && fg !== null && fg < 0.18) out.set('texto escuro: ' + name, (out.get('texto escuro: ' + name) || 0) + 1);
        });
        return [...out.entries()].map(([k, n]) => `${k} (${n})`);
      }, IGNORE);
      if (found.length) report[`${user.role} ${url}`] = found;
    }
    await page.close();
  }
  await browser.close();
  server.close();
  const pages = Object.keys(report);
  if (!pages.length) return console.log('OK: nenhum elemento claro demais no tema escuro.');
  for (const p of pages) console.log(`\n${p}\n  - ` + report[p].slice(0, 25).join('\n  - '));
  process.exitCode = 1;
})().catch(e => {
  console.error(e);
  server.close();
  process.exit(1);
});
