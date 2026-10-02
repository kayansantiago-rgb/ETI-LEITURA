// Teste visual da interface compilada com dados fictícios (scripts/ui-fixtures). Nenhum banco é usado.
// Uso: cd frontend && npm run build && npm run test:ui   (requer Google Chrome instalado)
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('../frontend/node_modules/playwright');
const { respond } = require('./ui-fixtures/api.cjs');

const ROOT = path.resolve(__dirname, '../frontend/build');
const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}`;
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.mjs': 'application/javascript' };

const STUDENT = { id: 's1', nome: 'Mariana Silva', email: 'mariana@example.com', turma: '7º ANO', role: 'student', termos_versao: '2026-10' };
const TEACHER = { id: 't1', nome: 'Ana Souza', email: 'ana@example.com', role: 'admin', turmas: ['7º ANO', '8º ANO'], termos_versao: '2026-10' };

// Página → texto que precisa aparecer quando ela carrega.
const STUDENT_PAGES = [
  ['/dashboard', 'dias'],
  ['/library', 'Biblioteca'],
  ['/book/1', 'O Pequeno Príncipe'],
  ['/activities', 'Atividades'],
  ['/activities/a1', 'Pergunta 1 de 3'],
  ['/reader/2', 'de 6'],
  ['/quizzes', 'Desafios de leitura'],
  ['/workspace', 'Minhas pendências'],
  ['/notifications', 'Avisos'],
  ['/ranking', 'Leitores'],
  ['/profile', 'Minhas conquistas'],
  ['/videos', 'Frações no dia a dia'],
  ['/profile', 'Personalize seu perfil']
];
const TEACHER_PAGES = [
  ['/admin/professor', 'Painel do Professor'],
  ['/admin/activities', 'Atividades'],
  ['/admin/summaries', 'Resumos dos alunos'],
  ['/admin/text-productions', 'Produções textuais'],
  ['/admin/books', 'Gerenciar livros'],
  ['/admin/classes', 'Precisam de atenção'],
  ['/admin/classes/7%C2%BA%20ANO', 'Média da turma'],
  ['/admin/reports', 'Relatório escolar'],
  ['/workspace', 'Pendências de correção'],
  ['/quizzes', 'Quizzes'],
  ['/ranking', 'Ranking de leitores'],
  ['/videos', 'Vídeos e materiais'],
  ['/admin/mural', 'Sarau de poesia'],
  ['/admin/calendar', 'Roda de leitura'],
  ['/profile', 'Dados da conta'],
  ['/admin/teachers', 'Carlos Mendes'],
  ['/admin/calendar', 'Prazo: Interpretação']
];

let serverOffline = false;
const server = http.createServer((req, res) => {
  // O service worker do app busca alguns arquivos (PDFs) por conta própria; a API fictícia responde aqui também.
  if (req.url.startsWith('/api/')) {
    if (serverOffline) return req.socket.destroy();
    const url = new URL(req.url, 'http://x');
    const result = respond(req.method, url.pathname, url.searchParams, (req.headers.authorization || '').includes('mock-admin'));
    if (result.file) {
      res.writeHead(200, { 'Content-Type': 'application/pdf' });
      return fs.createReadStream(result.file).pipe(res);
    }
    res.writeHead(result.status, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(result.json));
  }
  let file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end();
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(ROOT, 'index.html');
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

async function login(page, user) {
  await page.goto(BASE + '/login');
  await page.evaluate(([u, token]) => {
    localStorage.clear();
    localStorage.setItem('user', JSON.stringify(u));
    localStorage.setItem('token', token);
    localStorage.setItem('eti-theme', 'light');
    localStorage.setItem('eti-push-prompt', String(Date.now()));
    localStorage.setItem('eti-tour-v1:' + u.id, 'visto');
    localStorage.setItem('eti-install-card', String(Date.now()));
  }, [user, user.role === 'student' ? 'mock-student' : 'mock-admin']);
}

async function visit(page, url, text, label) {
  await page.goto(BASE + url);
  try {
    await page.locator('main').getByText(text, { exact: false }).first().waitFor({ timeout: 8000 });
  } catch {
    failures.push(`${label} ${url}: texto "${text}" não apareceu`);
    return;
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  check(!overflow, `${label} ${url}: rolagem horizontal`);
}

(async () => {
  if (!fs.existsSync(path.join(ROOT, 'index.html'))) throw Error('Gere a interface antes: cd frontend && npm run build');
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];

  for (const [viewport, label] of [[{ width: 1440, height: 900 }, 'desktop'], [{ width: 390, height: 844 }, 'celular']]) {
    const page = await browser.newPage({ viewport });
    page.on('pageerror', e => errors.push(`${label}: ${e.message}`));
    await page.route('**/api/**', async route => {
      const req = route.request();
      const url = new URL(req.url());
      let body = {};
      try {
        body = req.postDataJSON() || {};
      } catch {}
      const result = respond(req.method(), url.pathname, url.searchParams, (req.headers().authorization || '').includes('mock-admin'), body);
      if (result.file) return route.fulfill({ status: 200, contentType: 'application/pdf', body: fs.readFileSync(result.file) });
      return route.fulfill({ status: result.status, json: result.json });
    });

    await login(page, STUDENT);
    for (const [url, text] of STUDENT_PAGES) await visit(page, url, text, `aluno/${label}`);
    await login(page, TEACHER);
    for (const [url, text] of TEACHER_PAGES) await visit(page, url, text, `professor/${label}`);
    await page.close();
  }

  // Fluxo: correção no painel lateral, salvando e avançando para o próximo aluno.
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => errors.push(`fluxo: ${e.message}`));
  await page.route('**/api/**', route => {
    const req = route.request();
    const url = new URL(req.url());
    let body = {};
    try {
      body = req.postDataJSON() || {};
    } catch {}
    const result = respond(req.method(), url.pathname, url.searchParams, (req.headers().authorization || '').includes('mock-admin'), body);
    if (result.file) return route.fulfill({ status: 200, contentType: 'application/pdf', body: fs.readFileSync(result.file) });
    return route.fulfill({ status: result.status, json: result.json });
  });
  await login(page, TEACHER);
  await page.goto(BASE + '/admin/activities');
  await page.locator('.at-actions button').first().click();
  await page.getByRole('dialog', { name: 'Correção de entregas' }).waitFor();
  const first = await page.locator('.cx-student h3').textContent();
  await page.getByRole('group', { name: 'Notas rápidas' }).getByRole('button', { name: '9', exact: true }).click();
  await page.locator('.cx-feedback').fill('Boa interpretação, use mais trechos do livro.');
  await page.getByRole('button', { name: /Salvar e próximo/ }).click();
  await page.waitForFunction(name => document.querySelector('.cx-student h3')?.textContent !== name, first);
  await page.keyboard.press('Escape');

  // Fluxo: histórico completo do aluno em Minhas turmas, com exclusão confirmada na caixa da plataforma.
  await page.goto(BASE + '/admin/classes/7%C2%BA%20ANO');
  await page.locator('.sh-trigger').first().click();
  const history = page.getByRole('dialog', { name: /Histórico de/ });
  await history.getByText('média geral').waitFor();
  await history.getByRole('tab', { name: /Atividades/ }).click();
  await history.getByText('Interpretação do capítulo 1').waitFor();
  await history.getByRole('button', { name: 'Excluir aluno' }).click();
  await page.getByRole('button', { name: 'Excluir aluno' }).last().click();
  await history.waitFor({ state: 'detached' });

  // Página inexistente mostra a coruja em vez de redirecionar.
  await page.goto(BASE + '/pagina-que-nao-existe');
  await page.getByText('Esta página saiu da estante').waitFor();

  // Fluxo: leitor até a última página libera o questionário e o certificado.
  await login(page, STUDENT);
  await page.goto(BASE + '/reader/1');
  await page.getByLabel('Página atual').waitFor();
  await page.waitForFunction(() => document.querySelector('.rd-page-info span')?.textContent.includes('6'));
  await page.getByLabel('Página atual').fill('6');
  await page.getByRole('dialog', { name: 'Leitura concluída' }).waitFor({ timeout: 8000 });
  await page.getByRole('button', { name: /Fazer o questionário/ }).click();
  await page.getByRole('button', { name: 'Começar questionário' }).click();
  for (const answer of ['Um livro que brilhava', 'Na biblioteca da escola', 'Um mundo novo']) {
    await page.locator('.qz-option', { hasText: answer }).click();
    await page.getByRole('button', { name: /Próxima|Concluir desafio/ }).click();
  }
  await page.getByText('Baixar certificado (PDF)').waitFor();

  // Fluxo: livro aberto uma vez continua disponível sem internet (service worker + dados guardados).
  const offline = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const reader = await offline.newPage();
  reader.on('pageerror', e => errors.push(`offline: ${e.message}`));
  await login(reader, STUDENT);
  await reader.goto(BASE + '/dashboard');
  await reader.evaluate(() => navigator.serviceWorker.ready);
  await reader.reload();
  await reader.waitForFunction(() => navigator.serviceWorker.controller);
  await reader.goto(BASE + '/reader/1');
  await reader.waitForFunction(() => document.querySelector('.rd-page-info span')?.textContent.includes('6'));
  serverOffline = true;
  await offline.setOffline(true);
  await reader.reload();
  await reader.waitForFunction(() => document.querySelector('.rd-page-info span')?.textContent.includes('6'), null, { timeout: 15000 });
  check(await reader.locator('.ob').isVisible(), 'offline: faixa "sem internet" não apareceu');
  await offline.close();
  serverOffline = false;

  await browser.close();
  server.close();
  failures.push(...errors);
  if (failures.filter(Boolean).length) {
    console.error('FALHOU:\n- ' + failures.filter(Boolean).join('\n- '));
    process.exit(1);
  }
  console.log(`OK: ${STUDENT_PAGES.length + TEACHER_PAGES.length} telas em computador e celular, correção com "Salvar e próximo", histórico do aluno, página 404, leitura até o certificado e leitura sem internet. Dados fictícios.`);
})().catch(e => {
  console.error(e);
  server.close();
  process.exit(1);
});
