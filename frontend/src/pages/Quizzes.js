import QuizRanking from '@/components/QuizRanking';
import TimedQuiz, { QuizOptions } from '@/components/TimedQuiz';
import {
  Clock,
  HelpCircle,
  Pencil,
  Trash2,
  Upload,
  Plus,
  Rocket,
  ArrowLeft,
  Check,
  X,
  RefreshCw,
  Lock,
  Users,
  Target,
  Trophy,
  Award,
  Sparkles,
  ChevronRight,
  Play,
  BarChart3
} from 'lucide-react';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageIntro from '@/components/PageIntro';
import { Button } from '@/components/ui/button';
import { getUser } from '@/lib/auth';
import { TURMAS } from '@/constants/turmas';
import api from '@/lib/api';
import { toast } from 'sonner';

const question = () => ({ texto: '', opcoes: ['', '', '', ''], correta: 0 });
const message = e => (typeof e.response?.data?.detail === 'string' ? e.response.data.detail : 'Não foi possível concluir. Confira os campos e tente novamente.');
const letter = i => String.fromCharCode(65 + i);
const fmt = (value, digits = 1) => Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: digits });
const COVERS = ['qz-cover-violet', 'qz-cover-blue', 'qz-cover-amber', 'qz-cover-pink', 'qz-cover-teal'];
const coverFor = id => COVERS[[...String(id)].reduce((sum, c) => sum + c.charCodeAt(0), 0) % COVERS.length];
const stateOf = q => (q.rascunho ? 'draft' : q.aberto ? 'open' : 'closed');
const STATE = { draft: 'Rascunho', open: 'Aberto', closed: 'Encerrado' };

function ScoreRing({ value, total, size = 148 }) {
  const ratio = total ? value / total : 0;
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg className="qz-ring" width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`${value} de ${total} acertos`}>
      <defs>
        <linearGradient id="qz-ring-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(238 70% 60%)" />
          <stop offset="60%" stopColor="hsl(258 72% 60%)" />
          <stop offset="100%" stopColor="hsl(322 80% 62%)" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r={r} className="qz-ring-track" />
      <circle cx="60" cy="60" r={r} className="qz-ring-value" strokeDasharray={c} strokeDashoffset={c * (1 - ratio)} />
      <text x="60" y="58" textAnchor="middle" className="qz-ring-main">
        {value}/{total}
      </text>
      <text x="60" y="78" textAnchor="middle" className="qz-ring-sub">
        acertos
      </text>
    </svg>
  );
}

function QuizCard({ q, staff, busy, onOpen, onEdit, onPublish, onRemove }) {
  const state = stateOf(q);
  return (
    <article className="qz-card">
      <div className={`qz-cover ${coverFor(q.id)}`}>
        <span className="qz-cover-icon">
          <Sparkles size={22} />
        </span>
        <span className={`qz-state is-${state}`}>
          {state === 'open' && <i />}
          {STATE[state]}
        </span>
        <span className="qz-cover-count">
          {q.total}
          <small>perguntas</small>
        </span>
      </div>
      <div className="qz-card-body">
        <span className="ws-chip">{q.turma}</span>
        <h2>{q.titulo}</h2>
        <div className="qz-card-meta">
          <span>
            <Clock size={13} /> {q.segundos ? `${q.segundos}s por pergunta` : 'Sem limite de tempo'}
          </span>
          <span>
            <Award size={13} /> {fmt(q.nota_maxima ?? 10)} pts
          </span>
        </div>
        <div className="qz-card-actions">
          {!staff ? (
            <Button className="qz-btn-primary" disabled={busy} onClick={() => onOpen(q.id)}>
              <Play size={15} /> {q.aberto ? 'Jogar desafio' : 'Ver desafio'}
            </Button>
          ) : state === 'draft' ? (
            <>
              <Button className="qz-btn-primary" disabled={busy} onClick={() => onPublish(q)}>
                <Rocket size={15} /> Publicar
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => onEdit(q.id)}>
                <Pencil size={14} /> Editar
              </Button>
            </>
          ) : (
            <Button className="qz-btn-primary" disabled={busy} onClick={() => onOpen(q.id)}>
              <BarChart3 size={15} /> Ver resultados
            </Button>
          )}
          {staff && (
            <button type="button" className="ws-icon-btn qz-delete" disabled={busy} title="Apagar quiz" aria-label={`Apagar quiz ${q.titulo}`} onClick={() => onRemove(q)}>
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function QuizEditor({ form, setForm, busy, user, onSubmit, onCancel }) {
  const patch = (index, update) => setForm(v => ({ ...v, perguntas: v.perguntas.map((q, i) => (i === index ? { ...q, ...update } : q)) }));

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
      setForm({ ...form, perguntas: questions.map(({ texto, opcoes, correta }) => ({ texto, opcoes, correta })) });
      toast.success('Perguntas importadas! Revise e salve o quiz.');
    } catch {
      toast.error('Use um arquivo JSON válido com até 50 perguntas.');
    }
  };

  const filled = form.perguntas.filter(q => q.texto.trim() && q.opcoes.every(o => o.trim())).length;

  return (
    <form onSubmit={onSubmit} className="qz-editor">
      <fieldset disabled={busy} className="qz-editor-grid">
        <aside className="qz-settings ws-card">
          <div className="qz-settings-head">
            <span className="qz-settings-icon">
              <Pencil size={18} />
            </span>
            <div>
              <h2>{form.id ? 'Editar rascunho' : 'Novo quiz'}</h2>
              <p>Configure e monte as perguntas.</p>
            </div>
          </div>

          <label className="qz-field">
            <span>Título</span>
            <input required maxLength={160} placeholder="Ex.: Capítulo 1 de Dom Casmurro" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} />
          </label>
          <label className="qz-field">
            <span>Turma</span>
            <select aria-label="Turma alvo" required value={form.turma} onChange={e => setForm({ ...form, turma: e.target.value })}>
              <option value="">Selecione a turma</option>
              {TURMAS.filter(t => user.role === 'admin' || user.turmas?.includes(t.value)).map(t => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="qz-field">
            <span>Nota máxima</span>
            <input
              required
              type="number"
              min="0.1"
              max="100"
              step="0.1"
              value={form.nota_maxima}
              onChange={e => setForm({ ...form, nota_maxima: e.target.value === '' ? '' : Number(e.target.value) })}
            />
          </label>

          <div className="qz-toggle-row">
            <div>
              <strong>
                <Clock size={14} /> Tempo por pergunta
              </strong>
              <small>O tempo esgotado conta como erro.</small>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.segundos > 0}
              aria-label="Ativar temporizador"
              className="qz-switch"
              onClick={() => setForm({ ...form, segundos: form.segundos > 0 ? 0 : 30 })}
            >
              <span />
            </button>
          </div>
          {form.segundos > 0 && (
            <div className="qz-seconds" role="group" aria-label="Segundos por pergunta">
              {[10, 20, 30, 60].map(s => (
                <button type="button" key={s} aria-pressed={form.segundos === s} onClick={() => setForm({ ...form, segundos: s })}>
                  {s}s
                </button>
              ))}
              <input
                type="number"
                required
                min="5"
                max="600"
                aria-label="Segundos personalizados"
                value={form.segundos}
                onChange={e => setForm({ ...form, segundos: Number(e.target.value) })}
              />
            </div>
          )}

          <div className="qz-progress-box">
            <div>
              <span>Perguntas completas</span>
              <strong>
                {filled}/{form.perguntas.length}
              </strong>
            </div>
            <div className="ws-meter">
              <span style={{ width: `${(filled / form.perguntas.length) * 100}%` }} />
            </div>
          </div>

          <label className="qz-import">
            <Upload size={15} /> Importar perguntas (JSON)
            <input type="file" accept=".json,application/json" onChange={importFile} />
          </label>
          <a className="qz-template-link" href="/modelo-quiz.json" download>
            Baixar modelo de arquivo
          </a>

          <div className="qz-settings-actions">
            <Button type="submit" className="qz-btn-primary" disabled={busy}>
              {busy ? 'Salvando…' : 'Salvar rascunho'}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </aside>

        <div className="qz-questions">
          {form.perguntas.map((q, i) => (
            <section key={i} className="qz-q ws-card">
              <header>
                <span className="qz-q-number">{i + 1}</span>
                <strong>Pergunta {i + 1}</strong>
                {form.perguntas.length > 1 && (
                  <button
                    type="button"
                    className="ws-icon-btn"
                    aria-label={`Remover pergunta ${i + 1}`}
                    onClick={() => setForm({ ...form, perguntas: form.perguntas.filter((_, n) => n !== i) })}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </header>
              <textarea
                required
                maxLength={2000}
                aria-label={`Enunciado da pergunta ${i + 1}`}
                placeholder="Escreva a pergunta…"
                className="qz-q-text"
                value={q.texto}
                onChange={e => patch(i, { texto: e.target.value })}
              />
              <p className="qz-q-help">Clique na letra para marcar a alternativa correta.</p>
              <div className="qz-q-options">
                {q.opcoes.map((o, j) => (
                  <div key={j} className={`qz-q-option ${q.correta === j ? 'is-correct' : ''}`}>
                    <button
                      type="button"
                      className="qz-q-letter"
                      aria-pressed={q.correta === j}
                      aria-label={`Marcar alternativa ${letter(j)} como correta na pergunta ${i + 1}`}
                      onClick={() => patch(i, { correta: j })}
                    >
                      {q.correta === j ? <Check size={15} /> : letter(j)}
                    </button>
                    <input
                      aria-label={`Pergunta ${i + 1}, alternativa ${j + 1}`}
                      required
                      maxLength={500}
                      placeholder={`Alternativa ${letter(j)}`}
                      value={o}
                      onChange={e => patch(i, { opcoes: q.opcoes.map((v, k) => (k === j ? e.target.value : v)) })}
                    />
                    {q.opcoes.length > 2 && (
                      <button
                        type="button"
                        className="ws-icon-btn"
                        aria-label={`Remover alternativa ${letter(j)}`}
                        onClick={() =>
                          patch(i, {
                            opcoes: q.opcoes.filter((_, k) => k !== j),
                            correta: q.correta === j ? 0 : q.correta > j ? q.correta - 1 : q.correta
                          })
                        }
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {q.opcoes.length < 4 && (
                  <button type="button" className="qz-add-option" onClick={() => patch(i, { opcoes: [...q.opcoes, ''] })}>
                    <Plus size={14} /> Adicionar alternativa
                  </button>
                )}
              </div>
            </section>
          ))}
          <button
            type="button"
            className="qz-add-question"
            disabled={form.perguntas.length >= 50}
            onClick={() => setForm({ ...form, perguntas: [...form.perguntas, question()] })}
          >
            <Plus size={18} /> Adicionar pergunta
          </button>
        </div>
      </fieldset>
    </form>
  );
}

function QuizResults({ quiz, busy, onRefresh, onClose, onRemove }) {
  const results = [...(quiz.resultados || [])].sort((a, b) => b.acertos - a.acertos || (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
  const total = quiz.perguntas.length;
  const max = quiz.nota_maxima ?? 10;
  const avgHits = results.length ? results.reduce((s, r) => s + r.acertos, 0) / results.length : 0;
  const avgGrade = results.length ? results.reduce((s, r) => s + (r.nota ?? (r.acertos / total) * max), 0) / results.length : 0;
  const perQuestion = quiz.perguntas.map((q, i) => {
    const answered = results.filter(r => Array.isArray(r.respostas));
    const right = answered.filter(r => r.respostas[i] === q.correta).length;
    const counts = q.opcoes.map((_, j) => answered.filter(r => r.respostas[i] === j).length);
    return { q, rate: answered.length ? right / answered.length : null, counts, answered: answered.length };
  });
  let position = 0;
  let previous = null;

  return (
    <div className="qz-results">
      <section className="ws-kpis">
        <article className="ws-card ws-kpi is-featured">
          <span className="ws-kpi-icon">
            <Users size={18} />
          </span>
          <span>Participantes</span>
          <strong>{results.length}</strong>
          <p>{quiz.aberto ? 'Recebendo respostas agora' : 'Quiz encerrado'}</p>
        </article>
        <article className="ws-card ws-kpi">
          <span className="ws-kpi-icon">
            <Target size={18} />
          </span>
          <span>Acerto médio</span>
          <strong>
            {results.length ? Math.round((avgHits / total) * 100) : 0}
            <small>%</small>
          </strong>
          <p>
            {fmt(avgHits)} de {total} perguntas
          </p>
        </article>
        <article className="ws-card ws-kpi">
          <span className="ws-kpi-icon">
            <Award size={18} />
          </span>
          <span>Nota média</span>
          <strong>
            {fmt(avgGrade)}
            <small> /{fmt(max)}</small>
          </strong>
          <p>Calculada pelos acertos</p>
        </article>
        <article className="ws-card ws-kpi">
          <span className="ws-kpi-icon">
            <Trophy size={18} />
          </span>
          <span>Destaque</span>
          <strong className="qz-kpi-name">{results[0]?.nome?.split(' ').slice(0, 2).join(' ') || '—'}</strong>
          <p>{results[0] ? `${results[0].acertos} de ${total} acertos` : 'Aguardando respostas'}</p>
        </article>
      </section>

      <div className="qz-results-actions">
        <Button variant="outline" disabled={busy} onClick={onRefresh}>
          <RefreshCw size={15} /> Atualizar
        </Button>
        {quiz.aberto && (
          <Button variant="outline" disabled={busy} onClick={onClose}>
            <Lock size={15} /> Encerrar quiz
          </Button>
        )}
        <Button variant="ghost" className="text-destructive" disabled={busy} onClick={onRemove}>
          <Trash2 size={15} /> Apagar
        </Button>
      </div>

      <div className="qz-results-grid">
        <section className="ws-card qz-panel">
          <header>
            <h2>
              <Trophy size={18} /> Classificação
            </h2>
            <span>{results.length} aluno(s)</span>
          </header>
          {!results.length ? (
            <div className="ws-empty">
              <Users size={28} />
              <h3>Aguardando a turma</h3>
              <p>Os resultados aparecem assim que os alunos concluírem.</p>
            </div>
          ) : (
            <ol className="qz-leaderboard">
              {results.map((r, i) => {
                if (r.acertos !== previous) position = i + 1;
                previous = r.acertos;
                return (
                  <li key={r.user_id} className={position <= 3 ? `is-top is-top-${position}` : ''}>
                    <span className="qz-pos">{position}º</span>
                    <span className="qz-lb-name">
                      <strong>{r.nome}</strong>
                      <span className="ws-meter">
                        <span style={{ width: `${(r.acertos / total) * 100}%` }} />
                      </span>
                    </span>
                    <span className="qz-lb-score">
                      <strong>
                        {r.acertos}/{total}
                      </strong>
                      <small>{fmt(r.nota ?? (r.acertos / total) * max)} pts</small>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="ws-card qz-panel">
          <header>
            <h2>
              <BarChart3 size={18} /> Análise por pergunta
            </h2>
            <span>Onde a turma mais errou</span>
          </header>
          <ol className="qz-analysis">
            {perQuestion.map(({ q, rate, counts, answered }, i) => (
              <li key={i}>
                <div className="qz-analysis-head">
                  <span className="qz-q-number">{i + 1}</span>
                  <p>{q.texto}</p>
                  <strong className={rate == null ? '' : rate >= 0.7 ? 'is-high' : rate >= 0.4 ? 'is-mid' : 'is-low'}>
                    {rate == null ? '—' : `${Math.round(rate * 100)}%`}
                  </strong>
                </div>
                <div className="qz-bars">
                  {q.opcoes.map((o, j) => (
                    <div key={j} className={j === q.correta ? 'is-correct' : ''} title={o}>
                      <b>{letter(j)}</b>
                      <span className="qz-bar">
                        <span style={{ width: answered ? `${(counts[j] / answered) * 100}%` : 0 }} />
                      </span>
                      <small>{counts[j]}</small>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

function StudentResult({ quiz }) {
  const result = quiz.resultado;
  const max = quiz.nota_maxima ?? 10;
  const grade = result.nota ?? (result.acertos / result.total) * max;
  const ratio = result.total ? result.acertos / result.total : 0;
  return (
    <div className="qz-result">
      <section className="qz-result-hero">
        <ScoreRing value={result.acertos} total={result.total} />
        <div>
          <p className="ws-eyebrow">Desafio concluído</p>
          <h2>{ratio === 1 ? 'Perfeito! Você acertou tudo.' : ratio >= 0.7 ? 'Mandou muito bem!' : ratio >= 0.4 ? 'Bom trabalho, continue praticando!' : 'Cada desafio é um aprendizado.'}</h2>
          <p className="qz-result-grade">
            Nota <strong>{fmt(grade)}</strong> de {fmt(max)}
          </p>
        </div>
      </section>
      <QuizRanking quizId={quiz.id} />
      <h3 className="qz-review-title">Revise suas respostas</h3>
      <ol className="qz-review">
        {quiz.perguntas.map((q, i) => {
          const chosen = result.respostas[i];
          const right = chosen === q.correta;
          return (
            <li key={i} className={right ? 'is-right' : 'is-wrong'}>
              <span className="qz-review-icon">{right ? <Check size={16} /> : <X size={16} />}</span>
              <div>
                <p>
                  <b>{i + 1}.</b> {q.texto}
                </p>
                <small>
                  Você marcou: <b>{q.opcoes[chosen] ?? 'Tempo esgotado'}</b>
                </small>
                {!right && (
                  <small className="qz-review-correct">
                    Resposta correta: <b>{q.opcoes[q.correta]}</b>
                  </small>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StudentPlay({ quiz, busy, onSubmit }) {
  const [answers, setAnswers] = useState([]);
  const [step, setStep] = useState(0);
  const current = quiz.perguntas[step];
  const last = step === quiz.perguntas.length - 1;
  return (
    <div className="qz-play">
      <div className="qz-play-progress">
        {quiz.perguntas.map((_, i) => (
          <span key={i} className={i === step ? 'is-current' : answers[i] != null ? 'is-done' : ''} />
        ))}
      </div>
      <p className="qz-play-count">
        Pergunta {step + 1} de {quiz.perguntas.length}
      </p>
      <h2 className="qz-prompt">{current.texto}</h2>
      <QuizOptions
        options={current.opcoes}
        selected={answers[step]}
        disabled={busy}
        onSelect={i =>
          setAnswers(v => {
            const next = [...v];
            next[step] = i;
            return next;
          })
        }
      />
      <div className="qz-play-actions">
        <Button variant="ghost" disabled={busy || step === 0} onClick={() => setStep(v => v - 1)}>
          <ArrowLeft size={16} /> Anterior
        </Button>
        {!last ? (
          <Button className="qz-btn-primary" disabled={answers[step] == null} onClick={() => setStep(v => v + 1)}>
            Próxima <ChevronRight size={16} />
          </Button>
        ) : (
          <Button className="qz-btn-primary" disabled={busy || quiz.perguntas.some((_, i) => answers[i] == null)} onClick={() => onSubmit(answers)}>
            {busy ? 'Enviando…' : 'Concluir desafio'} <Check size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Quizzes() {
  const user = getUser();
  const staff = ['admin', 'teacher'].includes(user?.role);
  const [items, setItems] = useState(null);
  const [failed, setFailed] = useState(false);
  const [form, setForm] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = () => {
    setFailed(false);
    api.get('/quizzes').then(r => setItems(r.data)).catch(() => setFailed(true));
  };

  useEffect(load, []);

  const run = async (task, success) => {
    setBusy(true);
    try {
      await task();
      if (success) toast.success(success);
      return true;
    } catch (e) {
      toast.error(message(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const open = id => run(async () => setQuiz((await api.get(`/quizzes/${id}`)).data));

  const save = async e => {
    e.preventDefault();
    if (await run(() => (form.id ? api.put('/quizzes/' + form.id, form) : api.post('/quizzes', form)), 'Rascunho salvo. Publique quando estiver pronto.')) {
      setForm(null);
      load();
    }
  };

  const submit = answers =>
    run(async () => {
      await api.post(`/quizzes/${quiz.id}/answers`, { respostas: answers });
      setQuiz((await api.get(`/quizzes/${quiz.id}`)).data);
    }, 'Respostas enviadas!');

  const closeQuiz = () =>
    run(async () => {
      await api.post(`/quizzes/${quiz.id}/close`);
      setQuiz({ ...quiz, aberto: false });
      load();
    }, 'Quiz encerrado.');

  const edit = id =>
    run(async () => {
      const r = await api.get('/quizzes/' + id);
      setForm({ ...r.data, nota_maxima: r.data.nota_maxima ?? 10, segundos: r.data.segundos ?? 0 });
    });

  const publish = q => run(() => api.post('/quizzes/' + q.id + '/publish'), 'Quiz publicado para a turma!').then(ok => ok && load());

  const remove = async q => {
    if (!window.confirm(`Apagar o quiz "${q.titulo}"? As respostas da turma também serão removidas.`)) return false;
    const ok = await run(() => api.delete('/quizzes/' + q.id), 'Quiz apagado.');
    if (ok) load();
    return ok;
  };

  const leave = () => {
    if (!staff && quiz && !quiz.resultado && quiz.aberto && !window.confirm(quiz.segundos ? 'Sair do desafio? O tempo da pergunta continuará contando.' : 'Sair do desafio? Suas escolhas ainda não enviadas serão perdidas.')) return;
    setQuiz(null);
    load();
  };

  const immersive = !staff && !!quiz;
  const counts = {
    all: items?.length || 0,
    draft: items?.filter(q => stateOf(q) === 'draft').length || 0,
    open: items?.filter(q => stateOf(q) === 'open').length || 0,
    closed: items?.filter(q => stateOf(q) === 'closed').length || 0
  };
  const visible = (items || []).filter(q => filter === 'all' || stateOf(q) === filter);

  if (immersive) {
    return (
      <DashboardLayout focusMode>
        <div className="qz-arena">
          <header className="qz-arena-bar">
            <button type="button" onClick={leave} disabled={busy}>
              <ArrowLeft size={17} /> Sair
            </button>
            <span>{quiz.titulo}</span>
            <span className="ws-chip">{quiz.turma}</span>
          </header>
          <div className="qz-arena-stage">
            {quiz.resultado ? (
              <StudentResult quiz={quiz} />
            ) : !quiz.aberto ? (
              <div className="ws-empty">
                <Lock size={30} />
                <h3>Este quiz foi encerrado</h3>
                <p>O professor encerrou o desafio antes da sua participação.</p>
              </div>
            ) : quiz.segundos > 0 ? (
              <TimedQuiz key={quiz.id} quiz={quiz} onComplete={() => open(quiz.id)} />
            ) : (
              <StudentPlay quiz={quiz} busy={busy} onSubmit={submit} />
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="qz-space">
        {quiz ? (
          <>
            <button type="button" className="ws-back" onClick={leave}>
              <ArrowLeft size={15} /> Voltar aos quizzes
            </button>
            <PageIntro section={`QUIZ · ${quiz.turma}`} title={quiz.titulo} description={`${quiz.perguntas.length} perguntas · ${quiz.segundos ? `${quiz.segundos}s por pergunta` : 'sem limite de tempo'} · vale ${fmt(quiz.nota_maxima ?? 10)} pontos`} />
            <QuizResults
              quiz={quiz}
              busy={busy}
              onRefresh={() => open(quiz.id)}
              onClose={closeQuiz}
              onRemove={async () => {
                if (await remove(quiz)) setQuiz(null);
              }}
            />
          </>
        ) : form ? (
          <>
            <button type="button" className="ws-back" onClick={() => setForm(null)}>
              <ArrowLeft size={15} /> Voltar aos quizzes
            </button>
            <QuizEditor form={form} setForm={setForm} busy={busy} user={user} onSubmit={save} onCancel={() => setForm(null)} />
          </>
        ) : (
          <>
            <PageIntro
              section={staff ? 'AVALIAÇÃO / QUIZZES' : 'DESAFIOS DE LEITURA'}
              title={staff ? 'Quizzes' : 'Desafios de leitura'}
              description={staff ? 'Crie desafios de múltipla escolha, publique para a turma e acompanhe os resultados em tempo real.' : 'Teste o que você aprendeu nas leituras e veja sua posição no ranking da turma.'}
            >
              {staff && (
                <Button className="qz-btn-primary" onClick={() => setForm({ titulo: '', turma: '', nota_maxima: 10, segundos: 0, perguntas: [question()] })}>
                  <Plus size={17} /> Criar quiz
                </Button>
              )}
            </PageIntro>

            {staff && !!items?.length && (
              <div className="ws-segment qz-filter" role="group" aria-label="Filtrar quizzes">
                {[
                  ['all', 'Todos'],
                  ['open', 'Abertos'],
                  ['draft', 'Rascunhos'],
                  ['closed', 'Encerrados']
                ].map(([key, label]) => (
                  <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>
                    {label} <span>{counts[key]}</span>
                  </button>
                ))}
              </div>
            )}

            {failed ? (
              <div className="ws-card ws-empty" role="alert">
                <h3>Não foi possível carregar os quizzes</h3>
                <button onClick={load} className="underline font-semibold">
                  Tentar novamente
                </button>
              </div>
            ) : !items ? (
              <div className="ws-card ws-empty" role="status">
                Carregando quizzes…
              </div>
            ) : !visible.length ? (
              <div className="ws-card ws-empty">
                <HelpCircle size={30} />
                <h3>{staff ? (items.length ? 'Nenhum quiz neste filtro' : 'Crie seu primeiro quiz') : 'Nenhum desafio por enquanto'}</h3>
                <p>{staff ? 'Monte perguntas de múltipla escolha e publique para a turma.' : 'Os quizzes publicados pelos professores aparecem aqui.'}</p>
              </div>
            ) : (
              <div className="qz-grid">
                {visible.map(q => (
                  <QuizCard key={q.id} q={q} staff={staff} busy={busy} onOpen={open} onEdit={edit} onPublish={publish} onRemove={remove} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
