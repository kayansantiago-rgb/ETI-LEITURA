// Dados fictícios da API para testes visuais e para ver o site sem banco de dados.
// Uso direto: node scripts/ui-fixtures/api.cjs (porta 8000) e, em outro terminal, npm start em frontend.
// Token "mock-admin" entra como professor/administrador; qualquer outro, como aluno.
const http = require('http');
const colors = ['#233f62', '#467369', '#a16b4d', '#6a668c', '#8a3b5c', '#2f6f8f'];
const titles = [['O Pequeno Príncipe', 'Antoine de Saint-Exupéry', 45, 'AMBOS'], ['A Ilha do Tesouro', 'Robert Louis Stevenson', 15, 'FUNDAMENTAL'], ['Dom Casmurro', 'Machado de Assis', 100, 'MÉDIO'], ['O Jardim Secreto', 'Frances Hodgson Burnett', 0, 'AMBOS'], ['Capitães da Areia', 'Jorge Amado', 70, 'MÉDIO'], ['Alice no País das Maravilhas', 'Lewis Carroll', 0, 'FUNDAMENTAL']];
const cover = (t, c) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420"><rect width="300" height="420" fill="${c}"/><circle cx="150" cy="170" r="70" fill="none" stroke="#ffffff44" stroke-width="2"/><text x="150" y="320" text-anchor="middle" font-size="19" font-family="serif" fill="white">${t}</text></svg>`);
const books = titles.map(([titulo, autor, progress, nivel_ensino], i) => ({ id: String(i + 1), titulo, autor, progress, nivel_ensino, descricao: 'Uma história para descobrir novas perspectivas e compartilhar ideias.', capa_url: cover(titulo, colors[i]), created_at: '2026-09-0' + (i + 1), arquivo_url: '/api/uploads/livro.pdf' }));
const today = new Date(); const day = n => new Date(today.getTime() + n * 864e5).toISOString().slice(0, 10);
const activities = [
  { id: 'a1', titulo: 'Interpretação: capítulo 3', disciplina: 'Língua Portuguesa', turma: '7º ANO', prazo: day(2), status: 'aberta', perguntas: [{}, {}, {}], professor_nome: 'Prof. Ana' },
  { id: 'a2', titulo: 'Resenha crítica', disciplina: 'Redação', turma: '7º ANO', prazo: day(5), status: 'aberta', perguntas: [{}], professor_nome: 'Prof. Ana' },
  { id: 'a3', titulo: 'Quiz de vocabulário', disciplina: 'Língua Portuguesa', turma: '7º ANO', prazo: day(-3), status: 'encerrada', perguntas: [{}, {}], minha_resposta: { nota: 9, feedback: 'Ótimo trabalho!' }, professor_nome: 'Prof. Ana' }
];
const student = { id: 's1', nome: 'Mariana Silva', email: 'mariana@example.com', turma: '7º ANO', role: 'student' };
const admin = { id: 't1', nome: 'Ana Souza', email: 'ana@example.com', role: 'admin', turmas: ['7º ANO', '8º ANO'] };
const users = Array.from({ length: 8 }, (_, i) => ({ id: 'u' + i, nome: ['Mariana Silva', 'João Pedro', 'Luiza Costa', 'Rafael Lima', 'Beatriz Alves', 'Gabriel Rocha', 'Sofia Mendes', 'Lucas Prado'][i], email: `aluno${i}@example.com`, turma: i % 2 ? '8º ANO' : '7º ANO', role: 'student', created_at: '2026-08-01' }));
const summaries = books.slice(0, 3).map((b, i) => ({ id: 'r' + i, book_id: b.id, book_titulo: b.titulo, titulo: 'Resumo de ' + b.titulo, conteudo: 'Neste livro, acompanhamos uma jornada sobre amizade, descoberta e crescimento...', user_id: 's1', user_nome: users[i].nome, turma: '7º ANO', status: ['pendente', 'corrigido', 'pendente'][i], nota: i === 1 ? 8.5 : null, created_at: day(-i - 1), updated_at: day(-i - 1), corrigido_em: day(-1) }));
const productions = [0, 1].map(i => ({ id: 'p' + i, titulo: ['Minha cidade', 'Carta ao futuro'][i], genero: ['Crônica', 'Carta'][i], conteudo: 'Era uma manhã tranquila quando...', user_id: 's1', user_nome: users[i].nome, turma: '7º ANO', status: i ? 'corrigido' : 'pendente', nota: i ? 9 : null, created_at: day(-i - 2), updated_at: day(-i - 2), corrigido_em: day(-1) }));
const mural = [{ id: 'm1', titulo: 'Feira literária', conteudo: 'Na próxima sexta teremos a feira literária da escola. Tragam seus livros favoritos!', autor_nome: 'Coordenação', created_at: day(-1) }, { id: 'm2', titulo: 'Novos livros no acervo', conteudo: 'Chegaram seis novos títulos para o ensino fundamental.', autor_nome: 'Biblioteca', created_at: day(-4) }];
const h = n => new Date(Date.now() - n * 36e5).toISOString();
const notifications = [
  { id: 'grade:s1:1', titulo: 'Atividade corrigida: Interpretação do capítulo 3', link: '/activities/a1', data: h(1), lida: false },
  { id: 'quiz:q1', titulo: 'Novo quiz: O Pequeno Príncipe', link: '/quizzes', data: h(3), lida: false },
  { id: 'mural:m1', titulo: 'Novo no mural: Feira literária na sexta', link: '/dashboard', data: h(5), lida: true },
  { id: 'deadline:a2:x', titulo: 'Prazo próximo: Resenha crítica', link: '/activities/a2', data: h(26), lida: false },
  { id: 'material:v1', titulo: 'Novo material: Como fazer um resumo', link: '/videos', data: h(30), lida: true },
  { id: 'summaries:r1:x', titulo: 'Resumo corrigido: confira seu feedback', link: '/summaries', data: h(80), lida: true },
  { id: 'activity:a4', titulo: 'Nova atividade: Diário de leitura', link: '/activities/a4', data: h(200), lida: true }
];
const quizzes = [{ id: 'q1', titulo: 'Quiz: O Pequeno Príncipe', turma: '7º ANO', status: 'publicado', perguntas: [{}, {}, {}, {}], tempo_por_pergunta: 30, created_at: day(-1) }];
const materials = [{ id: 'v1', titulo: 'Como fazer um resumo', disciplina: 'Língua Portuguesa', turma: '7º ANO', tipo: 'video', url: 'https://example.com', created_at: day(-2) }];
const extra = require('./extra.cjs');
const bookMock = require('./books.cjs');
const fs = require('fs');
const path = require('path');
function route(p, q, isAdmin) {
  const hit = extra(p, isAdmin, 'GET');
  if (hit !== undefined) return hit;
  if (p === '/api/auth/me') return isAdmin ? admin : student;
  if (p === '/api/stats') return { total_books: books.length, my_summaries: 2, completed_books: 1, in_progress: 2 };
  if (p === '/api/admin/stats') return { total_books: books.length, total_users: 28, total_summaries: 12, total_productions: 7, pending_summaries: 3, pending_productions: 2 };
  if (p === '/api/books' || p === '/api/admin/books') return books;
  let m;
  if ((m = p.match(/^\/api\/books\/(\w+)$/))) return books.find(b => b.id === m[1]) || books[0];
  if ((m = p.match(/^\/api\/books\/(\w+)\/progress$/))) return { percentage: (books.find(b => b.id === m[1]) || books[0]).progress, current_page: 12, total_pages: 80 };
  if (/\/summary$/.test(p)) return [404, { detail: 'Sem resumo' }];
  if (p === '/api/activities' || p === '/api/admin/activities') return activities;
  if ((m = p.match(/^\/api\/(admin\/)?activities\/(\w+)$/))) return { ...(activities.find(a => a.id === m[2]) || activities[0]), perguntas: [{ tipo: 'escrita', enunciado: 'O que o narrador sente ao chegar?' }, { tipo: 'multipla', enunciado: 'Qual é o tema principal?', opcoes: ['Amizade', 'Guerra', 'Viagem'] }] };
  if (p === '/api/summaries' || p === '/api/admin/summaries') return summaries;
  if (p === '/api/text-productions' || p === '/api/admin/text-productions') return productions;
  if (p === '/api/mural') return mural;
  if (p === '/api/calendar') return [{ id: 'e1', titulo: 'Roda de leitura', data: day(3), cor: '#6d4ad8' }, { id: 'e2', titulo: 'Entrega da resenha', data: day(5), cor: '#e0803a' }];
  if (p === '/api/notifications') return notifications;
  if (p === '/api/admin/users') return users;
  if (p === '/api/quizzes') return quizzes;
  if (p === '/api/materials') return materials;
  if (p === '/api/progress') return books.filter(b => b.progress).map(b => ({ book_id: b.id, percentage: b.progress }));
  if (p === '/api/gradebook') return { notas: [{ id: 'g1', disciplina: 'Língua Portuguesa', bimestre: 3, nota: 8.5, feedback: 'Excelente evolução na interpretação!', data: day(-2) }], medias: [] };
  if (p === '/api/push/config') return { configured: true, public_key: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U' };
  if (p === '/api/push/status') return { enabled: false, subscribed: false };
  if (p === '/api/admin/teachers') return [{ id: 't1', nome: 'Ana Souza', email: 'ana@example.com', turmas: ['7º ANO'] }];
  if (p === '/api/health') return { status: 'ok' };
  return [];
}
// Resposta para uma chamada da API: { status, json } ou { file } para PDFs.
function respond(method, pathname, searchParams, isAdmin, body = {}) {
  if (pathname.startsWith('/api/uploads/') || /\/certificate$/.test(pathname)) {
    return { status: 200, file: path.join(__dirname, pathname.endsWith('certificate') ? 'certificado.pdf' : 'livro.pdf') };
  }
  const booksHit = bookMock(pathname, method, body, isAdmin);
  let out = booksHit !== undefined ? booksHit : method === 'GET' ? route(pathname, searchParams, isAdmin) : extra(pathname, isAdmin, method, body) ?? {};
  let status = 200;
  if (Array.isArray(out) && out.length === 2 && typeof out[0] === 'number') [status, out] = out;
  return { status, json: out };
}
module.exports = { respond };

if (require.main === module) {
  http
    .createServer((req, res) => {
      let raw = '';
      req.on('data', c => (raw += c));
      req.on('end', () => {
        const url = new URL(req.url, 'http://x');
        let body = {};
        try {
          body = JSON.parse(raw || '{}');
        } catch {}
        const result = respond(req.method, url.pathname, url.searchParams, (req.headers.authorization || '').includes('mock-admin'), body);
        if (result.file) {
          res.writeHead(200, { 'Content-Type': 'application/pdf' });
          return fs.createReadStream(result.file).pipe(res);
        }
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.json));
      });
    })
    .listen(8000, '127.0.0.1', () => console.log('API fictícia em http://127.0.0.1:8000'));
}
