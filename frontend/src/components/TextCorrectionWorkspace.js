import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, CheckCircle2, Clock3, Sparkles, ListChecks, MessageSquareText, Trash2, BookOpen, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RubricPicker from '@/components/RubricPicker';
import AIReview from '@/components/AIReview';
import QuickComments from '@/components/QuickComments';
import api from '@/lib/api';
import { toast } from 'sonner';

const initials = name =>
  (name || 'Estudante')
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
const normalize = text => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const fmt = value => Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const stateOf = item => (item.nota != null ? 'graded' : 'pending');
const words = text => (String(text || '').trim().match(/\S+/g) || []).length;

const KINDS = {
  summary: {
    ai: 'summary',
    endpoint: id => `/admin/summaries/${id}/correction`,
    remove: id => `/admin/summaries/${id}`,
    title: item => item.book_titulo || 'Resumo',
    label: 'Resumo do livro',
    Icon: BookOpen
  },
  production: {
    ai: 'production',
    endpoint: id => `/admin/text-productions/${id}/correction`,
    remove: id => `/admin/text-productions/${id}`,
    title: item => item.titulo || 'Produção textual',
    label: 'Produção textual',
    Icon: PenTool
  }
};

function GradePanel({ item, kind, hasNext, onSaved, onNext }) {
  const config = KINDS[kind];
  const [grade, setGrade] = useState(item.nota ?? '');
  const [feedback, setFeedback] = useState(item.feedback || '');
  const [tool, setTool] = useState('');
  const [busy, setBusy] = useState(false);
  const formRef = useRef(null);
  const advanceRef = useRef(false);
  const percent = grade === '' ? 0 : Math.min(100, Math.max(0, Number(grade) * 10));

  const apply = r => {
    setGrade(r.nota);
    setFeedback(r.feedback);
  };

  const save = async e => {
    e.preventDefault();
    const advance = advanceRef.current;
    advanceRef.current = false;
    if (!feedback.trim()) {
      toast.error('Escreva um comentário para o aluno.');
      return;
    }
    setBusy(true);
    try {
      const r = await api.put(config.endpoint(item.id), { nota: Number(grade), feedback: feedback.trim() });
      onSaved(r.data);
      toast.success(`Correção de ${item.user_nome?.split(' ')[0] || 'estudante'} enviada.`);
      if (advance) onNext();
    } catch (err) {
      toast.error(typeof err.response?.data?.detail === 'string' ? err.response.data.detail : 'Não foi possível salvar a correção.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="cx-grade" aria-label="Correção">
      <form
        ref={formRef}
        onSubmit={save}
        className="cx-grade-form"
        onKeyDown={e => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            advanceRef.current = hasNext;
            formRef.current?.requestSubmit();
          }
        }}
      >
        <fieldset disabled={busy}>
          <label className="cx-label" htmlFor={`text-grade-${item.id}`}>
            Nota
          </label>
          <div className="cx-score">
            <input
              id={`text-grade-${item.id}`}
              data-testid="input-nota"
              type="number"
              inputMode="decimal"
              required
              min="0"
              max="10"
              step="0.1"
              placeholder="—"
              value={grade}
              onChange={e => setGrade(e.target.value)}
            />
            <span>/ 10</span>
          </div>
          <div className="cx-meter" aria-hidden="true">
            <span style={{ width: `${percent}%` }} />
          </div>
          <div className="cx-quick" role="group" aria-label="Notas rápidas">
            {[0, 5, 7, 8, 9, 10].map(v => (
              <button type="button" key={v} aria-pressed={String(grade) !== '' && Number(grade) === v} onClick={() => setGrade(v)}>
                {v}
              </button>
            ))}
          </div>
          <label className="cx-label" htmlFor={`text-feedback-${item.id}`}>
            Comentário para o estudante
          </label>
          <textarea
            id={`text-feedback-${item.id}`}
            data-testid="input-feedback"
            className="cx-feedback"
            required
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
              <button type="button" key={key} role="tab" aria-selected={tool === key} onClick={() => setTool(tool === key ? '' : key)}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
          {tool && (
            <div className="cx-tool-body">
              {tool === 'rubric' && <RubricPicker inline onApply={apply} />}
              {tool === 'ai' && <AIReview kind={config.ai} id={item.id} onApply={apply} />}
              {tool === 'comments' && <QuickComments inline onUse={text => setFeedback(value => [value, text].filter(Boolean).join('\n\n').slice(0, 10000))} />}
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
              data-testid="submit-correction"
              variant={hasNext ? 'outline' : 'default'}
              className={hasNext ? '' : 'cx-primary'}
              onClick={() => (advanceRef.current = false)}
            >
              {busy ? 'Salvando…' : item.nota != null ? 'Atualizar correção' : 'Salvar correção'}
            </Button>
          </div>
          <p className="cx-hint">Ctrl + Enter salva e avança para o próximo.</p>
        </fieldset>
      </form>
      {item.corrigido_por && (
        <p className="cx-hint tc-graded-by">
          Última correção por {item.corrigido_por}
          {item.corrigido_em ? ` em ${new Date(item.corrigido_em).toLocaleDateString('pt-BR')}` : ''}
        </p>
      )}
    </aside>
  );
}

export default function TextCorrectionWorkspace({ items, kind, canDelete, onSaved, onDeleted }) {
  const config = KINDS[kind];
  const pending = items.filter(i => stateOf(i) === 'pending').length;
  const [filter, setFilter] = useState(pending ? 'pending' : 'all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');
  const mainRef = useRef(null);

  const visible = items
    .filter(i => (filter === 'all' || stateOf(i) === filter) && normalize(`${i.user_nome} ${config.title(i)}`).includes(normalize(query)))
    .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
  const current = items.find(i => i.id === selected) || visible[0];
  const index = visible.findIndex(i => i.id === current?.id);
  const graded = items.length - pending;
  const progress = items.length ? Math.round((graded / items.length) * 100) : 0;

  const nextPending = () => {
    const order = [...visible.slice(index + 1), ...visible.slice(0, Math.max(index, 0))];
    return order.find(i => i.id !== current?.id && stateOf(i) === 'pending') || visible[index + 1];
  };
  const select = id => {
    setSelected(id);
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const move = offset => visible[index + offset] && select(visible[index + offset].id);

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

  const remove = async () => {
    if (!window.confirm(`Excluir este texto de ${current.user_nome}? Esta ação é permanente.`)) return;
    try {
      await api.delete(config.remove(current.id));
      toast.success('Texto excluído.');
      setSelected('');
      onDeleted(current.id);
    } catch {
      toast.error('Não foi possível excluir.');
    }
  };

  const count = current ? words(current.conteudo) : 0;
  const Icon = config.Icon;

  return (
    <div className="cx tc">
      <aside className="cx-list" aria-label="Textos dos alunos">
        <div className="cx-list-head">
          <div className="cx-progress">
            <div>
              <strong>{graded}</strong> de {items.length} corrigidos
            </div>
            <span>{progress}%</span>
          </div>
          <div className="cx-meter">
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="cx-search">
            <Search size={15} />
            <input aria-label="Buscar aluno ou título" placeholder="Buscar aluno ou título…" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <div className="cx-filters" role="group" aria-label="Filtrar textos">
            {[
              ['pending', 'Pendentes', pending],
              ['graded', 'Corrigidos', graded],
              ['all', 'Todos', items.length]
            ].map(([key, label, n]) => (
              <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>
                {label} <span>{n}</span>
              </button>
            ))}
          </div>
        </div>
        <ul className="cx-students">
          {visible.map(i => {
            const state = stateOf(i);
            return (
              <li key={i.id}>
                <button type="button" className={i.id === current?.id ? 'is-active' : ''} onClick={() => select(i.id)}>
                  <span className={`cx-avatar state-${state}`}>{initials(i.user_nome)}</span>
                  <span className="cx-student-name">
                    <strong>{i.user_nome}</strong>
                    <small>{config.title(i)}</small>
                  </span>
                  {state === 'graded' ? <span className="cx-pill is-graded">{fmt(i.nota)}</span> : <span className="cx-pill is-pending"><Clock3 size={12} /></span>}
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
                'Nenhum texto nesta seleção.'
              )}
            </li>
          )}
        </ul>
      </aside>

      {current ? (
        <>
          <section className="cx-main" ref={mainRef} aria-label="Texto do aluno">
            <header className="cx-student">
              <span className={`cx-avatar is-lg state-${stateOf(current)}`}>{initials(current.user_nome)}</span>
              <div className="min-w-0">
                <h3>{current.user_nome}</h3>
                <p>
                  {current.user_turma || 'Turma'} · Enviado em {new Date(current.updated_at || current.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              </div>
              <span className={`cx-state is-${stateOf(current)}`}>{stateOf(current) === 'graded' ? 'Corrigido' : 'Aguardando'}</span>
              <div className="cx-nav">
                <button type="button" aria-label="Anterior" disabled={index <= 0} onClick={() => move(-1)}>
                  <ChevronLeft size={18} />
                </button>
                <span>{index >= 0 ? `${index + 1}/${visible.length}` : `–/${visible.length}`}</span>
                <button type="button" aria-label="Próximo" disabled={index < 0 || index >= visible.length - 1} onClick={() => move(1)}>
                  <ChevronRight size={18} />
                </button>
              </div>
              {canDelete && (
                <button type="button" className="ws-icon-btn tc-delete" onClick={remove} aria-label="Excluir texto" title="Excluir texto">
                  <Trash2 size={16} />
                </button>
              )}
            </header>
            <article className="tc-paper">
              <div className="tc-paper-head">
                <span className="tc-kind">
                  <Icon size={14} /> {config.label}
                </span>
                <h2>{config.title(current)}</h2>
                <div className="tc-meta">
                  <span>{count} palavras</span>
                  <span>· cerca de {Math.max(1, Math.round(count / 180))} min de leitura</span>
                </div>
              </div>
              <div className="tc-text">{current.conteudo || 'O aluno não enviou um texto.'}</div>
            </article>
            {current.feedback && stateOf(current) === 'graded' && (
              <div className="tc-previous">
                <strong>Comentário enviado ao aluno</strong>
                <p>{current.feedback}</p>
              </div>
            )}
          </section>
          <GradePanel
            key={current.id + ':' + (current.corrigido_em || '')}
            item={current}
            kind={kind}
            hasNext={!!nextPending()}
            onSaved={updated => {
              setSelected(id => id || updated.id);
              onSaved(updated);
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
          <h3>Nenhum texto para mostrar</h3>
          <p>Os textos aparecem aqui assim que os alunos enviarem.</p>
        </div>
      )}
    </div>
  );
}
