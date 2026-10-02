// Estado em memória para leitor, questionário do livro, certificados, ranking e correção de textos.
const state = { progress: { 1: 45, 2: 15, 3: 100, 5: 70 }, position: {}, cert: {}, attempts: {} };
const bookQuiz = {
  perguntas: [
    { texto: 'O que o leitor encontrou na biblioteca?', opcoes: ['Um mapa', 'Um livro que brilhava', 'Uma chave', 'Um gato'], correta: 1 },
    { texto: 'Onde a história começa?', opcoes: ['Na praia', 'Na biblioteca da escola', 'Em casa', 'No parque'], correta: 1 },
    { texto: 'O que cada página revelava?', opcoes: ['Um mundo novo', 'Uma receita', 'Um enigma', 'Nada'], correta: 0 }
  ]
};
const long = 'Neste livro acompanhamos a jornada de um menino que deixa seu pequeno planeta para conhecer o universo. Em cada lugar que visita, ele encontra adultos muito diferentes: um rei que quer mandar em tudo, um vaidoso, um homem de negócios que conta estrelas.\n\nO que mais me marcou foi o encontro com a raposa, que ensina que "o essencial é invisível aos olhos". Achei bonito porque mostra que as amizades precisam de tempo e cuidado.\n\nNo final, o principezinho entende que sua rosa é única porque ele cuidou dela. Recomendo o livro para quem gosta de histórias que fazem pensar.';
const names = ['Mariana Silva', 'João Pedro Alves', 'Luiza Costa', 'Rafael Lima', 'Beatriz Alves', 'Gabriel Rocha'];
const summaries = names.map((n, i) => ({ id: 'sm' + i, user_id: 'u' + i, user_nome: n, user_turma: i % 2 ? '8º ANO' : '7º ANO', book_id: '1', book_titulo: ['O Pequeno Príncipe', 'Dom Casmurro', 'A Ilha do Tesouro'][i % 3], conteudo: long, created_at: new Date(Date.now() - i * 36e5).toISOString(), updated_at: new Date(Date.now() - i * 36e5).toISOString(), nota: i === 2 ? 8 : null, feedback: i === 2 ? 'Muito bom!' : null, corrigido_por: i === 2 ? 'Ana Souza' : null }));
const productions = names.slice(0, 4).map((n, i) => ({ id: 'pd' + i, user_id: 'u' + i, user_nome: n, user_turma: '7º ANO', titulo: ['Minha cidade em 2050', 'Carta ao meu eu do futuro', 'Uma tarde na feira', 'O dia em que choveu livros'][i], conteudo: long, created_at: new Date(Date.now() - i * 5e6).toISOString(), updated_at: new Date(Date.now() - i * 5e6).toISOString(), nota: i === 3 ? 9.5 : null, feedback: i === 3 ? 'Criativo!' : null }));

module.exports = function books(p, method, body, isAdmin) {
  let m;
  if ((m = p.match(/^\/api\/books\/(\w+)\/position$/))) {
    if (method === 'GET') return state.position[m[1]] || { page: 1 };
    state.position[m[1]] = { page: body.page, updated_at: new Date().toISOString() };
    if (body.total) state.progress[m[1]] = Math.max(state.progress[m[1]] || 0, body.page === body.total ? 100 : Math.min(99, Math.round((body.page * 100) / body.total)));
    return { page: body.page, percentage: state.progress[m[1]] };
  }
  if ((m = p.match(/^\/api\/books\/(\w+)\/progress$/)) && method === 'GET') return { percentage: state.progress[m[1]] || 0 };
  if ((m = p.match(/^\/api\/books\/(\w+)\/quiz$/)) && method === 'GET') {
    if (isAdmin) return { perguntas: m[1] === '1' ? bookQuiz.perguntas : [], minimo: 70 };
    const has = ['1', '3'].includes(m[1]);
    const released = has && (state.progress[m[1]] || 0) >= 100;
    const cert = state.cert[m[1]];
    const tries = state.attempts[m[1]] || [];
    return { disponivel: has, liberado: released, progresso: state.progress[m[1]] || 0, total: 3, perguntas: released && !cert ? bookQuiz.perguntas.map(({ texto, opcoes }) => ({ texto, opcoes })) : [], tentativas: tries.length, melhor: tries.length ? Math.max(...tries) : null, aprovado: !!cert, certificado: cert || null, minimo: 70 };
  }
  if ((m = p.match(/^\/api\/books\/(\w+)\/quiz\/answers$/)) && method === 'POST') {
    const hits = body.respostas.filter((a, i) => a === bookQuiz.perguntas[i].correta).length;
    const pct = Math.round((hits * 100) / 3);
    (state.attempts[m[1]] = state.attempts[m[1]] || []).push(pct);
    if (pct >= 70) state.cert[m[1]] = { codigo: 'A1B2C3D4E5', percentual: pct, emitido_em: new Date().toISOString() };
    return { acertos: hits, total: 3, percentual: pct, aprovado: pct >= 70, minimo: 70, certificado: state.cert[m[1]] || null };
  }
  if (/^\/api\/certificates\/verify\/\w+$/.test(p)) {
    return p.endsWith('A1B2C3D4E5') ? { valido: true, aluno: 'Mariana S.', turma: '7º ANO', livro: 'O Pequeno Príncipe', autor: 'Antoine de Saint-Exupéry', percentual: 100, emitido_em: new Date().toISOString(), codigo: 'A1B2C3D4E5' } : [404, { detail: 'Certificado não encontrado.' }];
  }
  if (p === '/api/admin/books/overview') return { 1: { perguntas: 3, leitores: 18, concluidos: 6, certificados: 4 }, 3: { perguntas: 5, leitores: 9, concluidos: 5, certificados: 3 }, 2: { leitores: 4 } };
  if (p === '/api/workspace') {
    const d = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
    if (!isAdmin) return { atividades: [
      { id: 'a1', titulo: 'Interpretação: capítulo 3', prazo: d(0), estado: 'A entregar', link: '/activities/a1' },
      { id: 'a2', titulo: 'Resenha crítica', prazo: d(4), estado: 'Devolvida', link: '/activities/a2' },
      { id: 'a3', titulo: 'Quiz de vocabulário', prazo: d(-3), estado: 'Corrigida', link: '/activities/a3' },
      { id: 'a4', titulo: 'Diário de leitura', prazo: d(2), estado: 'Entregue', link: '/activities/a4' }], correcoes: [] };
    return { atividades: [
      { id: 'a1', titulo: 'Interpretação: capítulo 3', prazo: d(1), entregaram: names.slice(0, 4), faltam: names.slice(4), corrigir: 3, link: '/admin/activities/a1' },
      { id: 'a2', titulo: 'Resenha crítica', prazo: d(5), entregaram: names.slice(0, 2), faltam: names.slice(2), corrigir: 0, link: '/admin/activities/a2' },
      { id: 'a3', titulo: 'Quiz de vocabulário', prazo: d(-2), entregaram: names, faltam: [], corrigir: 1, link: '/admin/activities/a3' }],
      correcoes: [{ titulo: 'Resumos', quantidade: 5, link: '/admin/summaries' }, { titulo: 'Produções textuais', quantidade: 3, link: '/admin/text-productions' }] };
  }
  if (p === '/api/reading/stats') {
    const semana = Array.from({ length: 7 }, (_, i) => ({ dia: new Date(Date.now() - (6 - i) * 864e5).toISOString().slice(0, 10), paginas: [4, 0, 12, 8, 15, 6, 9][i] }));
    const medal = (id, titulo, descricao, atual, meta) => ({ id, titulo, descricao, atual: Math.min(atual, meta), meta, conquistada: atual >= meta });
    return { sequencia: 5, melhor_sequencia: 9, paginas_hoje: 9, meta_paginas: 10, paginas_total: 342, semana, livros_concluidos: 1, certificados: Object.keys(state.cert).length,
      medalhas: [medal('primeira-pagina', 'Primeira página', 'Começou a ler na plataforma', 342, 1), medal('sequencia-3', 'Em ritmo', '3 dias seguidos lendo', 9, 3), medal('sequencia-7', 'Semana de leitor', '7 dias seguidos lendo', 9, 7), medal('sequencia-30', 'Leitor imparável', '30 dias seguidos lendo', 9, 30), medal('livro-1', 'Primeiro livro', 'Terminou o primeiro livro', 1, 1), medal('livro-5', 'Devorador de livros', 'Concluiu 5 livros', 1, 5), medal('paginas-500', '500 páginas', 'Leu 500 páginas na plataforma', 342, 500), medal('certificado-1', 'Certificado!', 'Conquistou o primeiro certificado', Object.keys(state.cert).length, 1), medal('certificado-3', 'Mestre da compreensão', 'Conquistou 3 certificados', Object.keys(state.cert).length, 3)] };
  }
  if (p === '/api/reading/goal') return { meta_paginas: body.paginas_dia };
  if (p === '/api/reading/ranking') {
    const rows = names.map((nome, i) => ({ nome, livros: [3, 2, 1, 1, 0, 0][i], certificados: [2, 1, 1, 0, 0, 0][i], paginas_mes: [210, 180, 95, 140, 60, 0][i], sequencia: [12, 5, 3, 2, 1, 0][i], voce: i === 1 }));
    rows.forEach(r => (r.pontos = r.livros * 100 + r.certificados * 50 + r.paginas_mes));
    rows.sort((a, b) => b.pontos - a.pontos).forEach((r, i) => (r.posicao = i + 1));
    return { turma: '7º ANO', alunos: rows };
  }
  if (p === '/api/certificates') return Object.entries(state.cert).map(([book_id, c]) => ({ ...c, book_id }));
  if ((m = p.match(/^\/api\/admin\/books\/(\w+)\/quiz$/))) return { ok: true };
  if (p === '/api/admin/summaries') return summaries;
  if (p === '/api/admin/text-productions') return productions;
  if ((m = p.match(/^\/api\/admin\/(summaries|text-productions)\/(\w+)\/correction$/)) && method === 'PUT') {
    const list = m[1] === 'summaries' ? summaries : productions;
    const item = list.find(x => x.id === m[2]);
    Object.assign(item, { nota: body.nota, feedback: body.feedback, corrigido_por: 'Ana Souza', corrigido_em: new Date().toISOString() });
    return item;
  }
  return undefined;
};
