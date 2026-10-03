// Dados de correção de atividades, quizzes e relatórios.
const day2 = n => new Date(Date.now() + n * 864e5).toISOString();
const names = ['Mariana Silva', 'João Pedro Alves', 'Luiza Costa', 'Rafael Lima', 'Beatriz Alves', 'Gabriel Rocha', 'Sofia Mendes', 'Lucas Prado'];
const activityFull = {
  id: 'a1', titulo: 'Interpretação: capítulo 3', disciplina: 'Língua Portuguesa', turma: '7º ANO', prazo: day2(2).slice(0, 10), status: 'aberta', valor_nota: 10, professor_nome: 'Prof. Ana', descricao: 'Leia o capítulo 3 e responda.',
  perguntas: [
    { id: 'q1', tipo: 'texto', enunciado: 'Como o narrador descreve a chegada do Pequeno Príncipe ao deserto? Use trechos do livro.' },
    { id: 'q2', tipo: 'alternativa', enunciado: 'Qual é o tema central do capítulo?', alternativas: ['Amizade', 'Solidão', 'Viagem espacial', 'Guerra'] },
    { id: 'q3', tipo: 'texto', enunciado: 'O que você faria no lugar do aviador?' }
  ]
};
const responses = names.slice(0, 7).map((n, i) => ({
  id: 'resp' + i, user_id: 'u' + i, user_nome: n, user_turma: '7º ANO', tentativa: 1, updated_at: day2(-i * 0.4), historico: [],
  respostas: [
    { pergunta_id: 'q1', resposta: 'O narrador descreve o encontro como algo mágico e inesperado. Ele estava sozinho no deserto, tentando consertar o avião, quando ouviu uma vozinha pedindo: "Por favor... desenha-me um carneiro!". Isso mostra como a chegada do principezinho quebrou a solidão dele.' },
    { pergunta_id: 'q2', resposta: ['Amizade', 'Solidão', 'Amizade', 'Viagem espacial'][i % 4] },
    { pergunta_id: 'q3', resposta: 'Eu tentaria entender de onde ele veio e faria o desenho do carneiro com calma, porque ele parecia precisar muito disso.' }
  ],
  nota: i === 1 ? 8.5 : i === 4 ? 9 : null, feedback: i === 1 ? 'Boa análise, use mais trechos.' : '', reenvio: i === 5 ? { orientacoes: 'Desenvolva a resposta 1.', prazo: day2(3).slice(0, 10) } : null
}));
const quizFull = {
  id: 'q1', titulo: 'Quiz: O Pequeno Príncipe', turma: '7º ANO', aberto: true, rascunho: false, nota_maxima: 10, segundos: 0, total: 4,
  perguntas: [
    { texto: 'Qual animal o Pequeno Príncipe pede para o aviador desenhar?', opcoes: ['Um carneiro', 'Uma raposa', 'Uma cobra', 'Um elefante'], correta: 0 },
    { texto: 'De onde vem o Pequeno Príncipe?', opcoes: ['Do planeta Terra', 'Do asteroide B 612', 'De Marte', 'Da Lua'], correta: 1 },
    { texto: 'O que a raposa ensina ao príncipe?', opcoes: ['A voar', 'A cativar', 'A desenhar', 'A contar estrelas'], correta: 1 },
    { texto: 'Qual flor o príncipe ama?', opcoes: ['Um girassol', 'Uma margarida', 'Uma rosa', 'Uma tulipa'], correta: 2 }
  ]
};
const quizResults = names.map((n, i) => {
  const respostas = [0, i % 3 ? 1 : 2, i % 2 ? 1 : 0, i % 4 ? 2 : 3];
  const acertos = respostas.filter((r, j) => r === quizFull.perguntas[j].correta).length;
  return { user_id: 'u' + i, nome: n, respostas, acertos, total: 4, nota: acertos * 2.5 };
});
const quizList = [
  { ...quizFull, perguntas: undefined },
  { id: 'q2', titulo: 'Vocabulário do capítulo 5', turma: '8º ANO', aberto: false, rascunho: true, nota_maxima: 5, segundos: 30, total: 6 },
  { id: 'q3', titulo: 'Dom Casmurro: personagens', turma: '7º ANO', aberto: false, rascunho: false, nota_maxima: 10, segundos: 20, total: 8 },
  { id: 'q4', titulo: 'Desafio relâmpago', turma: '7º ANO', aberto: true, rascunho: false, nota_maxima: 10, segundos: 20, total: 4 }
];
// Quiz temporizado: sessão em memória, com acerto/erro a cada resposta.
const timedQuiz = { ...quizFull, id: 'q4', titulo: 'Desafio relâmpago', segundos: 20 };
const timed = { indice: 0, respostas: [] };
const timedSession = () => ({ indice: timed.indice, respostas: timed.respostas, limite: new Date(Date.now() + 20000).toISOString() });
const subjects = ['Língua Portuguesa', 'Matemática', 'História', 'Ciências'];
const gradebook = {
  alunos: names.map((n, i) => ({ id: 'u' + i, nome: n, turma: i % 2 ? '8º ANO' : '7º ANO', email: `aluno${i}@example.com` })),
  notas: names.flatMap((n, i) => subjects.flatMap((s, j) => [1, 2, 3].map(b => ({
    id: `g${i}${j}${b}`, user_id: 'u' + i, user_nome: n, turma: i % 2 ? '8º ANO' : '7º ANO', titulo: ['Prova', 'Trabalho', 'Atividade'][b - 1] + ' de ' + s, disciplina: s,
    bimestre: b, data: `2026-0${2 + b * 2}-1${j}`, nota: Math.round(Math.max(2, Math.min(10, 4 + ((i * 7 + j * 3 + b * 5) % 7))) * 10) / 10, peso: 1,
    feedback: b === 3 && j === 0 ? 'Muito bom! Continue praticando a interpretação.' : '', origem: b === 3 ? 'Atividade' : 'manual', editavel: b !== 3, link: b === 3 ? '/admin/activities/a1' : undefined
  }))))
};
const report = {
  alunos: names.map((n, i) => ({ id: 'u' + i, nome: n, turma: i % 2 ? '8º ANO' : '7º ANO', leituras_concluidas: i % 4, resumos: (i * 3) % 5, producoes: i % 3, atividades_entregues: 2 + (i % 5), atividades_disponiveis: 6, participacao: i === 7 ? null : Math.round(((2 + (i % 5)) / 6) * 100), media: i === 6 ? null : Math.round((4 + ((i * 7) % 6) + 0.4) * 100) / 100, avaliacoes: 3 + i })),
  evolucao: [3, 4, 5, 6, 7, 8, 9].map(m => ({ mes: `2026-0${m}`, media: [6.2, 6.8, 7.1, 6.5, 7.4, 7.9, 8.1][m - 3], avaliacoes: 10 + m }))
};
module.exports = function extra(p, isAdmin, method, body) {
  if (method === 'PUT' && /\/responses\/(\w+)\/correction$/.test(p)) {
    const r = responses.find(x => x.id === p.split('/')[6]);
    Object.assign(r, { nota: body.nota, feedback: body.feedback, corrigido_em: new Date().toISOString() });
    return r;
  }
  if (method === 'POST' && p === '/api/auth/login') return { access_token: 'mock-admin', user: { id: 't1', nome: 'Ana Souza', role: 'teacher', email: body.email, turmas: ['7º ANO', '8º ANO'] } };
  if (method === 'POST' && p === '/api/quizzes/q4/start') {
    if (timed.respostas.length >= timedQuiz.perguntas.length) return { concluido: true };
    return timedSession();
  }
  if (method === 'POST' && p === '/api/quizzes/q4/continue') return timed.indice >= timedQuiz.perguntas.length ? { concluido: true } : timedSession();
  if (method === 'POST' && p === '/api/quizzes/q4/step') {
    if (body.indice !== timed.indice || body.indice >= timedQuiz.perguntas.length) return [409, { detail: 'Esta pergunta já foi respondida.' }];
    const q = timedQuiz.perguntas[body.indice];
    timed.respostas.push(body.resposta);
    timed.indice = body.indice + 1;
    const acertos = timed.respostas.filter((r, i) => r === timedQuiz.perguntas[i].correta).length;
    const resultado = { indice: body.indice, resposta: body.resposta, correta: q.correta, acertou: body.resposta === q.correta, esgotado: body.resposta === -1 };
    const next = timed.indice >= timedQuiz.perguntas.length ? { concluido: true } : { ...timedSession(), limite: null };
    return { ...next, resultado, acertos, total: timedQuiz.perguntas.length };
  }
  if (method !== 'GET') return undefined;
  if (p === '/api/activities/a1' || p === '/api/admin/activities/a1') return activityFull;
  if (p === '/api/admin/activities/a1/responses') return responses;
  if (/^\/api\/admin\/activities\/\w+\/responses$/.test(p)) return [];
  if (p === '/api/quizzes') return isAdmin ? quizList : quizList.filter(q => !q.rascunho);
  if (p === '/api/quizzes/q4') {
    if (isAdmin) return timedQuiz;
    if (timed.respostas.length >= timedQuiz.perguntas.length) {
      const acertos = timed.respostas.filter((r, i) => r === timedQuiz.perguntas[i].correta).length;
      return { ...timedQuiz, resultado: { respostas: timed.respostas, acertos, total: 4, nota: acertos * 2.5 } };
    }
    return { ...timedQuiz, perguntas: timedQuiz.perguntas.map(({ correta, ...q }) => q) };
  }
  if (p === '/api/quizzes/q1') return isAdmin ? { ...quizFull, resultados: quizResults } : quizFull;
  if (p === '/api/quizzes/q4/ranking') return { participantes: [{ posicao: 1, nome: 'Lucas Prado', acertos: 4, total: 4, voce: false }, { posicao: 2, nome: 'Mariana Silva', acertos: 3, total: 4, voce: true }, { posicao: 3, nome: 'Beatriz Alves', acertos: 2, total: 4, voce: false }], encerrado: false };
  if (p === '/api/quizzes/q1/ranking') return { participantes: quizResults.map((r, i) => ({ posicao: i + 1, nome: r.nome, acertos: r.acertos, total: 4, voce: i === 0 })), encerrado: false };
  if (p === '/api/gradebook') return isAdmin ? gradebook : { alunos: [gradebook.alunos[0]], notas: gradebook.notas.filter(g => g.user_id === 'u0') };
  if (/^\/api\/admin\/students\/u\d+\/history$/.test(p)) {
    const a = report.alunos.find(x => x.id === p.split('/')[4]);
    return {
      aluno: { id: a.id, nome: a.nome, turma: a.turma, email: `${a.id}@example.com`, created_at: '2026-02-10T12:00:00Z' },
      resumo: { media: a.media, livros_concluidos: 2, certificados: 1, paginas_lidas: 412, sequencia: 4, melhor_sequencia: 9, atividades_entregues: a.atividades_entregues, atividades_disponiveis: 6 },
      leituras: [
        { book_id: 'b1', titulo: 'Dom Casmurro', autor: 'Machado de Assis', percentual: 100, atualizado_em: '2026-09-20T10:00:00Z' },
        { book_id: 'b2', titulo: 'O Pequeno Príncipe', autor: 'Saint-Exupéry', percentual: 46, atualizado_em: '2026-09-28T10:00:00Z' }
      ],
      atividades: [
        { activity_id: 'a1', titulo: 'Interpretação do capítulo 1', nota: 8.5, valor: 10, feedback: 'Ótima argumentação, cuide da pontuação.', devolvida: false, tentativa: 1, enviado_em: '2026-09-25T10:00:00Z' },
        { activity_id: 'a2', titulo: 'Questionário de vocabulário', nota: null, valor: 10, feedback: null, devolvida: false, tentativa: 1, enviado_em: '2026-09-29T10:00:00Z' },
        { activity_id: 'a3', titulo: 'Linha do tempo da narrativa', nota: null, valor: 5, feedback: 'Faltou o desfecho.', devolvida: true, tentativa: 2, enviado_em: '2026-09-18T10:00:00Z' }
      ],
      resumos: [{ id: 'r1', titulo: 'Dom Casmurro', nota: 9, feedback: '', enviado_em: '2026-09-21T10:00:00Z' }],
      producoes: [{ id: 'p1', titulo: 'Carta ao autor', nota: 4.5, feedback: '', enviado_em: '2026-09-10T10:00:00Z' }],
      quizzes: [{ titulo: 'Quiz de Machado', acertos: 3, total: 4, nota: 7.5, enviado_em: '2026-09-15T10:00:00Z' }],
      certificados: [{ book_titulo: 'Dom Casmurro', percentual: 90, emitido_em: '2026-09-20T12:00:00Z', codigo: 'A1B2C3' }]
    };
  }
  if (p === '/api/admin/reports') return report;
  return undefined;
};
