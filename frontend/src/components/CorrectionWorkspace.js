import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, CheckCircle2, Clock3, RotateCcw, Undo2, Sparkles, ListChecks, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AttemptHistory from '@/components/AttemptHistory';
import RubricPicker from '@/components/RubricPicker';
import AIReview from '@/components/AIReview';
import QuickComments from '@/components/QuickComments';
import useDraft, { readDraft, clearDraft } from '@/hooks/useDraft';
import api from '@/lib/api';
import { toast } from 'sonner';
import { deadline, activityError } from '@/pages/Activities';

export const responseState = r => (r.reenvio ? 'returned' : r.nota != null ? 'graded' : 'pending');
const STATE_LABEL = { pending: 'Aguardando', graded: 'Corrigida', returned: 'Devolvida' };
const FILTERS = [
  ['pending', 'Pendentes'],
  ['graded', 'Corrigidas'],
  ['returned', 'Devolvidas'],
  ['all', 'Todas']
];

const initials = name =>
  (name || 'Estudante')
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const normalize = text => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const todayInBrasilia = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const formatScore = value => Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

function Answer({ question, value }) {
  if (question.tipo === 'alternativa' && question.alternativas?.length) {
    return (
      <ul className="cx-options">
        {question.alternativas.map((option, i) => (
          <li key={i} className={option === value ? 'is-chosen' : ''}>
            <b>{String.fromCharCode(65 + i)}</b>
            <span>{option}</span>
            {option === value && <em>Resposta do aluno</em>}
          </li>
        ))}
      </ul>
    );
  }
  return <div className={`cx-answer ${value ? '' : 'is-empty'}`}>{value || 'Sem resposta'}</div>;
}

function GradePanel({ activity, response, hasNext, onGraded, onNext }) {
  const draftKey = `correction:${response.id}:${response.updated_at}`;
  const [savedDraft] = useState(() => readDraft(draftKey, { nota: response.nota ?? '', feedback: response.feedback || '' }));
  const [grade, setGrade] = useState(savedDraft.nota);
  const [feedback, setFeedback] = useState(savedDraft.feedback);
  const [busy, setBusy] = useState(false);
  const [tool, setTool] = useState('');
  const [returning, setReturning] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [retryDate, setRetryDate] = useState('');
  const formRef = useRef(null);
  const advanceRef = useRef(false);

  const maxScore = activity?.valor_nota ?? 10;
  const dirty = String(grade) !== String(response.nota ?? '') || feedback !== (response.feedback || '');
  const draftStatus = useDraft(draftKey, { nota: grade, feedback }, dirty && !response.reenvio);
  const retryLocked = !!(response.reenvio && response.reenvio.prazo >= todayInBrasilia());

  const apply = r => {
    setGrade(r.nota);
    setFeedback(r.feedback);
  };

  const correct = async e => {
    e.preventDefault();
    const advance = advanceRef.current;
    advanceRef.current = false;
    setBusy(true);
    try {
      const r = await api.put(`/admin/activities/${activity.id}/responses/${response.id}/correction`, {
        nota: Number(grade),
        feedback,
        versao: response.updated_at
      });
      clearDraft(draftKey);
      onGraded(r.data);
      toast.success(`Correção de ${response.user_nome?.split(' ')[0] || 'estudante'} enviada.`);
      if (advance) onNext();
    } catch (err) {
      toast.error(activityError(err, 'Não foi possível salvar a correção.'));
    } finally {
      setBusy(false);
    }
  };

  const returnWork = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post(`/admin/activities/${activity.id}/responses/${response.id}/return`, {
        orientacoes: instructions,
        prazo: retryDate,
        versao: response.updated_at
      });
      onGraded(r.data);
      setReturning(false);
      toast.success('Nova tentativa liberada ao estudante.');
    } catch (err) {
      toast.error(activityError(err, 'Não foi possível devolver a atividade.'));
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      advanceRef.current = hasNext;
      formRef.current?.requestSubmit();
    }
  };

  const percent = grade === '' || !maxScore ? 0 : Math.min(100, Math.max(0, (Number(grade) / maxScore) * 100));

  return (
    <aside className="cx-grade" aria-label="Correção da entrega">
      {response.reenvio && (
        <div className="cx-returned">
          <strong>
            <Undo2 size={16} /> Devolvida para refazer
          </strong>
          <p>{response.reenvio.orientacoes}</p>
          <small>Novo prazo: {deadline(response.reenvio.prazo)}</small>
        </div>
      )}

      {!response.reenvio && (
        <form ref={formRef} onSubmit={correct} onKeyDown={onKeyDown} className="cx-grade-form">
          <fieldset disabled={busy}>
            <label className="cx-label" htmlFor={`grade-${response.id}`}>
              Nota
            </label>
            <div className="cx-score">
              <input
                id={`grade-${response.id}`}
                type="number"
                inputMode="decimal"
                required
                min="0"
                max={maxScore}
                step="0.1"
                placeholder="—"
                value={grade}
                onChange={e => setGrade(e.target.value)}
              />
              <span>/ {formatScore(maxScore)}</span>
            </div>
            <div className="cx-meter" aria-hidden="true">
              <span style={{ width: `${percent}%` }} />
            </div>
            <div className="cx-quick" role="group" aria-label="Notas rápidas">
              {[0, 0.5, 0.7, 0.8, 0.9, 1].map(f => {
                const value = Math.round(maxScore * f * 10) / 10;
                return (
                  <button
                    type="button"
                    key={f}
                    aria-pressed={String(grade) !== '' && Number(grade) === value}
                    onClick={() => setGrade(value)}
                  >
                    {formatScore(value)}
                  </button>
                );
              })}
            </div>

            <label className="cx-label" htmlFor={`feedback-${response.id}`}>
              Comentário para o estudante
            </label>
            <textarea
              id={`feedback-${response.id}`}
              className="cx-feedback"
              maxLength={10000}
              placeholder="Destaque os pontos fortes e o que pode melhorar…"
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
            />

            <div className="cx-tool-tabs" role="tablist" aria-label="Ferramentas de correção">
              {[
                ['rubric', ListChecks, 'Critérios'],
                ['ai', Sparkles, 'IA'],
                ['comments', MessageSquareText, 'Comentários']
              ].map(([key, Icon, label]) => (
                <button
                  type="button"
                  key={key}
                  role="tab"
                  aria-selected={tool === key}
                  onClick={() => setTool(tool === key ? '' : key)}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
            {tool && (
              <div className="cx-tool-body">
                {tool === 'rubric' && <RubricPicker inline onApply={apply} />}
                {tool === 'ai' && <AIReview kind="activity" id={response.id} onApply={apply} />}
                {tool === 'comments' && (
                  <QuickComments inline onUse={text => setFeedback(value => [value, text].filter(Boolean).join('\n\n').slice(0, 10000))} />
                )}
              </div>
            )}

            <div className="cx-actions">
              {hasNext && (
                <Button type="submit" className="cx-primary" onClick={() => (advanceRef.current = true)}>
                  {busy ? 'Salvando…' : 'Salvar e próximo'} <ChevronRight size={16} />
                </Button>
              )}
              <Button
                type="submit"
                variant={hasNext ? 'outline' : 'default'}
                className={hasNext ? '' : 'cx-primary'}
                onClick={() => (advanceRef.current = false)}
              >
                {busy ? 'Salvando…' : response.nota != null ? 'Atualizar correção' : 'Salvar correção'}
              </Button>
            </div>
            <p className="cx-hint">
              {dirty ? draftStatus.replace('Envie quando terminar.', 'Salve para enviar ao aluno.') : 'Ctrl + Enter salva e avança para o próximo.'}
            </p>
          </fieldset>
        </form>
      )}

      <div className="cx-return">
        {!returning ? (
          <button type="button" disabled={busy || retryLocked} onClick={() => setReturning(true)}>
            <RotateCcw size={14} /> {response.reenvio ? 'Ajustar prazo da nova tentativa' : 'Devolver para refazer'}
          </button>
        ) : (
          <form className="cx-return-form" onSubmit={returnWork}>
            <strong>Liberar nova tentativa</strong>
            <p>A entrega atual ficará no histórico quando o aluno reenviar.</p>
            <label htmlFor={`retry-instructions-${response.id}`}>Orientações</label>
            <textarea
              id={`retry-instructions-${response.id}`}
              required
              maxLength={10000}
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
            />
            <label htmlFor={`retry-date-${response.id}`}>Novo prazo (até 23h59, Brasília)</label>
            <input id={`retry-date-${response.id}`} type="date" required value={retryDate} onChange={e => setRetryDate(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" disabled={busy}>
                Liberar tentativa
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setReturning(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </div>
    </aside>
  );
}

export default function CorrectionWorkspace({ activity, responses, onGraded }) {
  const pendingCount = responses.filter(r => responseState(r) === 'pending').length;
  const [filter, setFilter] = useState(pendingCount ? 'pending' : 'all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');
  const mainRef = useRef(null);

  const counts = useMemo(
    () => ({
      all: responses.length,
      pending: pendingCount,
      graded: responses.filter(r => responseState(r) === 'graded').length,
      returned: responses.filter(r => responseState(r) === 'returned').length
    }),
    [responses, pendingCount]
  );

  const visible = responses.filter(
    r => (filter === 'all' || responseState(r) === filter) && normalize(r.user_nome).includes(normalize(query))
  );
  // A resposta selecionada continua aberta mesmo que saia do filtro após a correção.
  const current = responses.find(r => r.id === selected) || visible[0];
  const index = visible.findIndex(r => r.id === current?.id);

  const nextPending = () => {
    const order = [...visible.slice(index + 1), ...visible.slice(0, Math.max(index, 0))];
    return order.find(r => r.id !== current?.id && responseState(r) === 'pending') || visible[index + 1];
  };

  const select = id => {
    setSelected(id);
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const move = offset => {
    const target = visible[index + offset];
    if (target) select(target.id);
  };

  useEffect(() => {
    const keys = e => {
      if (!e.altKey) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        move(1);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        move(-1);
      }
    };
    window.addEventListener('keydown', keys);
    return () => window.removeEventListener('keydown', keys);
  });

  const progress = responses.length ? Math.round(((counts.graded + counts.returned) / responses.length) * 100) : 0;

  return (
    <div className="cx">
      <aside className="cx-list" aria-label="Entregas dos alunos">
        <div className="cx-list-head">
          <div className="cx-progress">
            <div>
              <strong>{counts.graded + counts.returned}</strong> de {responses.length} corrigidas
            </div>
            <span>{progress}%</span>
          </div>
          <div className="cx-meter">
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="cx-search">
            <Search size={15} />
            <input aria-label="Buscar aluno" placeholder="Buscar aluno…" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <div className="cx-filters" role="group" aria-label="Filtrar entregas">
            {FILTERS.map(([key, label]) => (
              <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>
                {label} <span>{counts[key]}</span>
              </button>
            ))}
          </div>
        </div>
        <ul className="cx-students">
          {visible.map(r => {
            const state = responseState(r);
            return (
              <li key={r.id}>
                <button type="button" className={r.id === current?.id ? 'is-active' : ''} onClick={() => select(r.id)}>
                  <span className={`cx-avatar state-${state}`}>{initials(r.user_nome)}</span>
                  <span className="cx-student-name">
                    <strong>{r.user_nome}</strong>
                    <small>
                      {r.user_turma || 'Turma'} · {new Date(r.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </small>
                  </span>
                  {state === 'graded' ? (
                    <span className="cx-pill is-graded">{formatScore(r.nota)}</span>
                  ) : (
                    <span className={`cx-pill is-${state}`}>{state === 'returned' ? <RotateCcw size={12} /> : <Clock3 size={12} />}</span>
                  )}
                </button>
              </li>
            );
          })}
          {!visible.length && (
            <li className="cx-list-empty">
              {filter === 'pending' && !query ? (
                <>
                  <CheckCircle2 size={22} /> Tudo corrigido por aqui!
                </>
              ) : (
                'Nenhuma entrega nesta seleção.'
              )}
            </li>
          )}
        </ul>
      </aside>

      {current ? (
        <>
          <section className="cx-main" ref={mainRef} aria-label="Respostas do aluno">
            <header className="cx-student">
              <span className={`cx-avatar is-lg state-${responseState(current)}`}>{initials(current.user_nome)}</span>
              <div className="min-w-0">
                <h3>{current.user_nome}</h3>
                <p>
                  {current.user_turma || 'Turma'} · Tentativa {current.tentativa || 1} · Entregue em{' '}
                  {new Date(current.updated_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              </div>
              <span className={`cx-state is-${responseState(current)}`}>{STATE_LABEL[responseState(current)]}</span>
              <div className="cx-nav">
                <button type="button" aria-label="Aluno anterior" disabled={index <= 0} onClick={() => move(-1)}>
                  <ChevronLeft size={18} />
                </button>
                <span>{index >= 0 ? `${index + 1}/${visible.length}` : `–/${visible.length}`}</span>
                <button type="button" aria-label="Próximo aluno" disabled={index < 0 || index >= visible.length - 1} onClick={() => move(1)}>
                  <ChevronRight size={18} />
                </button>
              </div>
            </header>

            <ol className="cx-questions">
              {activity.perguntas.map((q, i) => (
                <li key={q.id}>
                  <div className="cx-q-head">
                    <span>Pergunta {i + 1}</span>
                    {q.tipo === 'alternativa' && <em>Múltipla escolha</em>}
                  </div>
                  <p className="cx-prompt">{q.enunciado}</p>
                  <Answer question={q} value={current.respostas.find(a => a.pergunta_id === q.id)?.resposta} />
                </li>
              ))}
            </ol>
            <AttemptHistory activity={activity} response={current} />
          </section>

          <GradePanel
            key={current.id + ':' + current.updated_at}
            activity={activity}
            response={current}
            hasNext={!!nextPending()}
            onGraded={updated => {
              setSelected(id => id || updated.id);
              onGraded(updated);
            }}
            onNext={() => {
              const target = nextPending();
              if (target) select(target.id);
            }}
          />
        </>
      ) : (
        <div className="cx-empty">
          <CheckCircle2 size={36} />
          <h3>Nenhuma entrega para mostrar</h3>
          <p>As respostas aparecem aqui assim que os alunos enviarem.</p>
        </div>
      )}
    </div>
  );
}
