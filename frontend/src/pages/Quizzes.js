import QuizRanking from '@/components/QuizRanking';
import TimedQuiz from '@/components/TimedQuiz';
import { Clock, HelpCircle, Pencil, Trash2, Upload, Plus, Rocket, Sparkles, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { getUser } from '@/lib/auth';
import { TURMAS } from '@/constants/turmas';
import api from '@/lib/api';
import { toast } from 'sonner';
import '@/quizzes.css';

const question = () => ({ texto: '', opcoes: ['', '', '', ''], correta: 0 });
const message = e => (typeof e.response?.data?.detail === 'string' ? e.response.data.detail : 'Não foi possível concluir. Confira os campos e tente novamente.');

export default function Quizzes() {
  const user = getUser();
  const staff = ['admin', 'teacher'].includes(user?.role);
  const [items, setItems] = useState(null);
  const [failed, setFailed] = useState(false);
  const [form, setForm] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setFailed(false);
    api.get('/quizzes')
      .then(r => setItems(r.data))
      .catch(() => setFailed(true));
  };

  useEffect(load, []);

  const open = async id => {
    setBusy(true);
    try {
      const r = await api.get(`/quizzes/${id}`);
      setQuiz(r.data);
      setStep(0);
      setAnswers([]);
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(false);
    }
  };

  const create = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      await (form.id ? api.put('/quizzes/' + form.id, form) : api.post('/quizzes', form));
      setForm(null);
      load();
      toast.success('Rascunho salvo com sucesso!');
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/quizzes/${quiz.id}/answers`, { respostas: answers });
      const r = await api.get(`/quizzes/${quiz.id}`);
      setQuiz(r.data);
      toast.success('Respostas enviadas!');
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    setBusy(true);
    try {
      await api.post(`/quizzes/${quiz.id}/close`);
      setQuiz({ ...quiz, aberto: false });
      load();
      toast.success('Quiz encerrado.');
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(false);
    }
  };

  const edit = async id => {
    setBusy(true);
    try {
      const r = await api.get('/quizzes/' + id);
      setForm({ ...r.data, nota_maxima: r.data.nota_maxima ?? 10, segundos: r.data.segundos ?? 0 });
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(false);
    }
  };

  const action = async (q, remove = false) => {
    if (remove && !window.confirm('Excluir o rascunho "' + q.titulo + '"?')) return;
    setBusy(true);
    try {
      await (remove ? api.delete('/quizzes/' + q.id) : api.post('/quizzes/' + q.id + '/publish'));
      load();
      toast.success(remove ? 'Rascunho excluído.' : 'Quiz publicado para os alunos com sucesso!');
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(false);
    }
  };

  const importFile = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      if (file.size > 1000000) throw Error();
      const parsed = JSON.parse(await file.text());
      const questions = Array.isArray(parsed) ? parsed : parsed.perguntas;
      if (
        !Array.isArray(questions) ||
        !questions.length ||
        questions.length > 50 ||
        questions.some(
          q =>
            typeof q.texto !== 'string' ||
            !q.texto.trim() ||
            q.texto.length > 2000 ||
            !Array.isArray(q.opcoes) ||
            q.opcoes.length < 2 ||
            q.opcoes.length > 4 ||
            q.opcoes.some(o => typeof o !== 'string' || !o.trim() || o.length > 500) ||
            !Number.isInteger(q.correta) ||
            q.correta < 0 ||
            q.correta >= q.opcoes.length
        )
      )
        throw Error();

      if (form.perguntas.some(q => q.texto.trim()) && !window.confirm('Substituir as perguntas atuais pelas perguntas do arquivo?')) return;

      setForm({
        ...form,
        perguntas: questions.map(({ texto, opcoes, correta }) => ({ texto, opcoes, correta }))
      });
      toast.success('Perguntas importadas! Revise e salve o quiz.');
    } catch {
      toast.error('Use um arquivo JSON válido com até 50 perguntas.');
    }
  };

  const patch = (index, update) =>
    setForm(v => ({ ...v, perguntas: v.perguntas.map((q, i) => (i === index ? { ...q, ...update } : q)) }));

  const immersive = !staff && !!quiz;

  return (
    <DashboardLayout focusMode={immersive}>
      <div className={`quiz-space ${immersive ? 'quiz-immersive' : ''}`}>
        {!immersive && (
          <div className="activities-page-header mb-6">
            <div className="activities-header-title">
              <div className="activities-header-icon">
                <Sparkles size={28} />
              </div>
              <div>
                <h1>{staff ? 'Quizzes Interativos' : 'Desafios de Leitura'}</h1>
                <p>
                  {staff
                    ? 'Crie desafios rápidos de múltipla escolha para sua turma e acompanhe as respostas.'
                    : 'Teste seus conhecimentos sobre as obras lidas, uma pergunta de cada vez!'}
                </p>
              </div>
            </div>

            {staff && !form && !quiz && (
              <Button
                onClick={() => setForm({ titulo: '', turma: '', nota_maxima: 10, segundos: 0, perguntas: [question()] })}
                className="activities-create-btn"
              >
                <Plus size={18} />
                <span>CRIAR QUIZ</span>
              </Button>
            )}
          </div>
        )}

        {immersive && (
          <header className="quiz-arena-header">
            <span>
              ETI LEITURA <b>Desafio de conhecimento</b>
            </span>
            <span>{quiz.resultado ? 'Missão concluída' : 'Sua próxima descoberta começa aqui'}</span>
          </header>
        )}

        {/* LISTAGEM DE QUIZZES */}
        {!quiz && !form && (
          <>
            {failed ? (
              <div className="empty-state" role="alert">
                Não foi possível carregar os quizzes.{' '}
                <button onClick={load} className="underline font-bold">
                  Tentar novamente
                </button>
              </div>
            ) : !items ? (
              <p role="status" className="empty-state">Carregando quizzes…</p>
            ) : (
              <div className="quiz-grid">
                {items.map(q => (
                  <article className="activity-card-modern quiz-card" key={q.id}>
                    <div>
                      <div className="activity-card-top">
                        <span className="activity-turma-pill">{q.turma}</span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${q.rascunho ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' : q.aberto ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
                          {q.rascunho ? 'Rascunho' : q.aberto ? 'Publicado' : 'Encerrado'}
                        </span>
                      </div>

                      <h2 className="activity-card-title mt-2">{q.titulo}</h2>

                      <div className="quiz-card-meta flex items-center justify-between text-xs text-muted-foreground py-3 border-t border-b my-3">
                        <span className="flex items-center gap-1">
                          <HelpCircle size={14} className="text-primary" />
                          <strong>{q.total}</strong> perguntas
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} className="text-primary" />
                          {q.segundos ? `${q.segundos}s por questão` : 'Sem limite de tempo'}
                        </span>
                      </div>
                    </div>

                    <div>
                      {staff && q.rascunho ? (
                        <div className="space-y-2">
                          <Button
                            className="w-full bg-primary text-primary-foreground font-bold hover:opacity-90 flex items-center justify-center gap-2"
                            disabled={busy}
                            onClick={() => action(q)}
                          >
                            <Rocket size={16} /> PUBLICAR PARA ALUNOS
                          </Button>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 font-semibold"
                              disabled={busy}
                              onClick={() => edit(q.id)}
                            >
                              <Pencil size={14} className="mr-1" /> Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive font-semibold"
                              disabled={busy}
                              onClick={() => action(q, true)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          className="w-full activity-card-action-btn"
                          disabled={busy}
                          onClick={() => open(q.id)}
                        >
                          <span>{staff ? 'Acompanhar Turma' : 'Abrir Quiz'}</span>
                          <Rocket size={15} />
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {items?.length === 0 && (
              <div className="empty-state">
                {staff
                  ? 'Nenhum quiz criado ainda. Clique em "CRIAR QUIZ" acima para montar seu primeiro desafio.'
                  : 'Os quizzes publicados pelos seus professores aparecerão neste espaço.'}
              </div>
            )}
          </>
        )}

        {/* EDITOR DE QUIZ (PROFESSOR) */}
        {form && (
          <form onSubmit={create} className="quiz-editor">
            <fieldset disabled={busy} className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <h2 className="text-xl font-extrabold flex items-center gap-2 text-foreground">
                  <Pencil size={22} className="text-primary" /> Elaborar Quiz Interativo
                </h2>
                <Button type="button" variant="ghost" onClick={() => setForm(null)}>
                  Cancelar
                </Button>
              </div>

              {/* Campos Gerais */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-2xl border bg-card/60">
                <div className="md:col-span-1 space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    Título do Quiz *
                  </label>
                  <input
                    required
                    maxLength={160}
                    placeholder="Ex: Quiz de Leitura - Capítulo 1"
                    className="w-full p-2.5 rounded-xl border bg-background text-sm font-semibold"
                    value={form.titulo}
                    onChange={e => setForm({ ...form, titulo: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    Turma Alvo *
                  </label>
                  <select
                    aria-label="Turma alvo"
                    required
                    className="w-full p-2.5 rounded-xl border bg-background text-sm font-semibold"
                    value={form.turma}
                    onChange={e => setForm({ ...form, turma: e.target.value })}
                  >
                    <option value="">Selecione a turma</option>
                    {TURMAS.filter(t => user.role === 'admin' || user.turmas?.includes(t.value)).map(t => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    Nota Máxima (Pontos) *
                  </label>
                  <input
                    required
                    type="number"
                    min="0.1"
                    max="100"
                    step="0.1"
                    className="w-full p-2.5 rounded-xl border bg-background text-sm font-semibold"
                    value={form.nota_maxima}
                    onChange={e =>
                      setForm({ ...form, nota_maxima: e.target.value === '' ? '' : Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              {/* Temporizador */}
              <section className="p-5 rounded-2xl border bg-accent/10 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-sm font-extrabold flex items-center gap-2 text-foreground">
                      <Clock size={18} className="text-primary" /> Limite de Tempo por Pergunta
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ao ativar, os alunos terão um contador em cada questão antes que a resposta seja bloqueada.
                    </p>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-sm">
                    <input
                      type="checkbox"
                      className="w-5 h-5 accent-primary cursor-pointer"
                      checked={form.segundos > 0}
                      onChange={e => setForm({ ...form, segundos: e.target.checked ? 30 : 0 })}
                    />
                    Ativar Temporizador
                  </label>
                </div>

                {form.segundos > 0 && (
                  <div className="pt-2 border-t flex items-center gap-3">
                    <label className="text-xs font-bold text-muted-foreground">Segundos por pergunta:</label>
                    <input
                      type="number"
                      required
                      min="5"
                      max="600"
                      className="w-24 p-2 rounded-lg border text-sm font-bold bg-background"
                      value={form.segundos}
                      onChange={e => setForm({ ...form, segundos: Number(e.target.value) })}
                    />
                  </div>
                )}
              </section>

              {/* Cabeçalho de Questões */}
              <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
                <h3 className="text-base font-extrabold text-foreground">
                  PERGUNTAS DO QUIZ ({form.perguntas.length})
                </h3>
                <div className="flex items-center gap-2">
                  <label className="quiz-import inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer bg-background hover:bg-accent">
                    <Upload size={14} /> Importar JSON
                    <input type="file" accept=".json,application/json" onChange={importFile} />
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={form.perguntas.length >= 50}
                    onClick={() => setForm({ ...form, perguntas: [...form.perguntas, question()] })}
                    className="font-bold"
                  >
                    <Plus size={14} className="mr-1" /> Adicionar Pergunta
                  </Button>
                </div>
              </div>

              {/* Lista de Perguntas */}
              <div className="space-y-4">
                {form.perguntas.map((q, i) => (
                  <section key={i} className="p-5 rounded-2xl border bg-card space-y-3 relative shadow-sm">
                    <div className="flex items-center justify-between border-b pb-3">
                      <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-primary/15 text-primary">
                        PERGUNTA {i + 1}
                      </span>
                      {form.perguntas.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive text-xs font-bold"
                          onClick={() => setForm({ ...form, perguntas: form.perguntas.filter((_, n) => n !== i) })}
                        >
                          <Trash2 size={14} className="mr-1" /> Remover
                        </Button>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider block">
                        Enunciado da Questão *
                      </label>
                      <textarea
                        required
                        maxLength={2000}
                        placeholder="Digite o enunciado da pergunta aqui…"
                        className="w-full p-3 rounded-xl border bg-background text-sm min-h-[80px]"
                        value={q.texto}
                        onChange={e => patch(i, { texto: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">
                        Preencha as 4 opções e selecione a alternativa correta (●):
                      </p>
                      {q.opcoes.map((o, j) => {
                        const isCorrect = q.correta === j;
                        return (
                          <div
                            key={j}
                            className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                              isCorrect ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-background'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`correct-${i}`}
                              className="w-5 h-5 accent-emerald-600 cursor-pointer"
                              aria-label={`Alternativa ${j + 1} correta na pergunta ${i + 1}`}
                              checked={isCorrect}
                              onChange={() => patch(i, { correta: j })}
                            />
                            <span className="font-extrabold text-xs text-muted-foreground w-5 text-center">
                              {String.fromCharCode(65 + j)}
                            </span>
                            <input
                              aria-label={`Pergunta ${i + 1}, alternativa ${j + 1}`}
                              required
                              maxLength={500}
                              placeholder={`Opção ${String.fromCharCode(65 + j)}…`}
                              className="flex-1 p-2 rounded-lg border text-sm bg-transparent"
                              value={o}
                              onChange={e =>
                                patch(i, {
                                  opcoes: q.opcoes.map((v, k) => (k === j ? e.target.value : v))
                                })
                              }
                            />
                            {isCorrect && (
                              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pr-2">
                                <CheckCircle2 size={14} /> Correta
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>

              {/* Ações do Formulário */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  disabled={form.perguntas.length >= 50}
                  onClick={() => setForm({ ...form, perguntas: [...form.perguntas, question()] })}
                  className="font-bold"
                >
                  <Plus size={16} className="mr-1" /> Adicionar outra pergunta
                </Button>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" onClick={() => setForm(null)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={busy} className="bg-primary text-primary-foreground font-bold px-6">
                    {busy ? 'Salvando…' : 'Salvar Quiz ✨'}
                  </Button>
                </div>
              </div>
            </fieldset>
          </form>
        )}

        {/* VISUALIZAÇÃO E EXECUÇÃO DE QUIZ */}
        {quiz && (
          <div>
            <Button
              disabled={busy}
              variant="outline"
              size="sm"
              className="mb-4 font-bold"
              onClick={() => {
                if (
                  !staff &&
                  !quiz.resultado &&
                  quiz.aberto &&
                  !window.confirm(
                    quiz.segundos
                      ? 'Sair do desafio? O tempo da pergunta continuará contando.'
                      : 'Sair do desafio? Suas escolhas ainda não enviadas serão perdidas.'
                  )
                )
                  return;
                setQuiz(null);
                load();
              }}
            >
              <ArrowLeft size={15} className="mr-1" /> Voltar aos quizzes
            </Button>

            <section className="quiz-play p-6 rounded-2xl border bg-card shadow-sm space-y-4">
              <span className="activity-turma-pill">{quiz.turma}</span>
              <h2 className="text-2xl font-extrabold text-foreground">{quiz.titulo}</h2>

              {staff ? (
                /* Monitoramento do Professor */
                <div className="space-y-4 pt-2">
                  <p className="text-sm font-semibold text-muted-foreground">
                    {quiz.aberto ? '🟢 Recebendo respostas em tempo real' : '🔴 Quiz encerrado'} ·{' '}
                    <strong>{quiz.resultados.length}</strong> participantes
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Button disabled={busy} size="sm" variant="outline" onClick={() => open(quiz.id)}>
                      Atualizar Resultados
                    </Button>
                    {quiz.aberto && (
                      <Button disabled={busy} size="sm" variant="destructive" onClick={close}>
                        Encerrar Quiz
                      </Button>
                    )}
                  </div>

                  <div className="quiz-results border-t pt-4 space-y-2">
                    {quiz.resultados.map(r => (
                      <div key={r.user_id} className="flex justify-between items-center p-3 rounded-xl border bg-accent/10">
                        <strong className="text-sm">{r.nome}</strong>
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/15 text-primary">
                          {r.acertos} de {r.total} acertos
                        </span>
                      </div>
                    ))}
                    {!quiz.resultados.length && (
                      <p className="text-xs text-muted-foreground">Aguardando as primeiras respostas da turma.</p>
                    )}
                  </div>
                </div>
              ) : quiz.resultado ? (
                /* Resultado do Aluno */
                <div>
                  <div className="quiz-score">
                    <strong>
                      {quiz.resultado.acertos}/{quiz.resultado.total}
                    </strong>
                    <p className="font-bold">Desafio concluído! Confira seu desempenho.</p>
                    <p className="text-sm mt-1">
                      Nota:{' '}
                      {quiz.resultado.nota ??
                        ((quiz.resultado.acertos / quiz.resultado.total) * (quiz.nota_maxima ?? 10)).toFixed(1)}{' '}
                      / {quiz.nota_maxima ?? 10}
                    </p>
                  </div>
                  <QuizRanking quizId={quiz.id} />
                  <h3 className="quiz-review-heading font-extrabold text-lg mt-6 mb-3">Suas Respostas:</h3>
                  <div className="space-y-3">
                    {quiz.perguntas.map((q, i) => (
                      <article key={i} className="p-4 rounded-xl border bg-accent/5 space-y-1">
                        <h4 className="font-bold text-sm">
                          {i + 1}. {q.texto}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {quiz.resultado.respostas[i] === q.correta ? '✅ Resposta correta' : '❌ Resposta incorreta'} · Você marcou: {q.opcoes[quiz.resultado.respostas[i]] || 'Tempo esgotado'}
                        </p>
                        <strong className="text-xs text-emerald-600 dark:text-emerald-400 block pt-1">
                          Resposta correta: {q.opcoes[q.correta]}
                        </strong>
                      </article>
                    ))}
                  </div>
                </div>
              ) : !quiz.aberto ? (
                <p className="text-sm text-muted-foreground">Este quiz foi encerrado pelo professor.</p>
              ) : quiz.segundos > 0 ? (
                <TimedQuiz key={quiz.id} quiz={quiz} onComplete={() => open(quiz.id)} />
              ) : (
                /* Execução de Quiz (Aluno) */
                <div className="space-y-4">
                  <div className="quiz-progress">
                    <span style={{ width: `${((step + 1) / quiz.perguntas.length) * 100}%` }} />
                  </div>
                  <p className="text-xs font-bold text-muted-foreground">
                    Pergunta {step + 1} de {quiz.perguntas.length}
                  </p>
                  <h3 className="quiz-prompt">{quiz.perguntas[step].texto}</h3>
                  <div className="quiz-options">
                    {quiz.perguntas[step].opcoes.map((o, i) => (
                      <button
                        key={i}
                        disabled={busy}
                        aria-pressed={answers[step] === i}
                        onClick={() =>
                          setAnswers(v => {
                            const next = [...v];
                            next[step] = i;
                            return next;
                          })
                        }
                      >
                        <b>{String.fromCharCode(65 + i)}</b>
                        <span>{o}</span>
                      </button>
                    ))}
                  </div>
                  <div className="quiz-actions flex justify-between gap-2 pt-4">
                    <Button disabled={busy || step === 0} variant="outline" onClick={() => setStep(v => v - 1)}>
                      Anterior
                    </Button>
                    {step < quiz.perguntas.length - 1 ? (
                      <Button
                        className="bg-primary text-primary-foreground font-bold"
                        disabled={answers[step] == null}
                        onClick={() => setStep(v => v + 1)}
                      >
                        Próxima Pergunta →
                      </Button>
                    ) : (
                      <Button
                        className="bg-primary text-primary-foreground font-bold"
                        disabled={busy || quiz.perguntas.some((_, i) => answers[i] == null)}
                        onClick={submit}
                      >
                        {busy ? 'Enviando…' : 'Concluir Quiz ✨'}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

