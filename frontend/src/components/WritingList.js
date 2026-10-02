import { useState } from 'react';
import { Pencil, Trash2, Star, Clock, MessageSquare, FileText, PenLine, TrendingUp, CheckCircle2 } from 'lucide-react';
import OwlEmpty from '@/components/OwlEmpty';

const fmt = v => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const tone = n => (n >= 7 ? 'is-high' : n >= 5 ? 'is-mid' : 'is-low');
const date = v => (v ? new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

// Lista dos textos do aluno (resumos ou produções), com nota e comentário do professor em destaque.
export default function WritingList({ items, kind, onOpen, onDelete, empty }) {
  const [filter, setFilter] = useState('todos');
  const graded = items.filter(i => i.nota != null);
  const avg = graded.length ? graded.reduce((s, i) => s + i.nota, 0) / graded.length : null;
  const visible = items.filter(i => filter === 'todos' || (filter === 'corrigidos') === (i.nota != null));
  const Icon = kind === 'resumo' ? FileText : PenLine;

  if (!items.length) return <div className="ws-card">{empty}</div>;

  return (
    <div className="wl">
      <section className="wl-stats">
        <div>
          <Icon size={17} />
          <strong>{items.length}</strong>
          <span>{kind === 'resumo' ? 'resumos' : 'textos'}</span>
        </div>
        <div>
          <CheckCircle2 size={17} />
          <strong>{graded.length}</strong>
          <span>corrigidos</span>
        </div>
        <div>
          <Clock size={17} />
          <strong>{items.length - graded.length}</strong>
          <span>aguardando</span>
        </div>
        <div className="is-featured">
          <TrendingUp size={17} />
          <strong>{avg == null ? '—' : fmt(avg)}</strong>
          <span>sua média</span>
        </div>
      </section>

      <div className="ws-segment wl-filter" role="group" aria-label="Filtrar">
        {[
          ['todos', 'Todos', items.length],
          ['corrigidos', 'Corrigidos', graded.length],
          ['aguardando', 'Aguardando', items.length - graded.length]
        ].map(([v, l, n]) => (
          <button key={v} type="button" aria-pressed={filter === v} onClick={() => setFilter(v)}>
            {l} <span>{n}</span>
          </button>
        ))}
      </div>

      {!visible.length ? (
        <div className="ws-card">
          <OwlEmpty compact mood="search" title="Nada por aqui" text="Escolha outro filtro." />
        </div>
      ) : (
        <div className="wl-grid">
          {visible.map((item, i) => (
            <article key={item.id} className={`wl-card ${item.nota != null ? 'is-graded' : ''}`} style={{ '--d': `${Math.min(i, 8) * 40}ms` }}>
              <header>
                <span className="wl-icon">
                  <Icon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3>{item.titulo || item.book_titulo || 'Sem título'}</h3>
                  <small>
                    {kind === 'resumo' && item.book_titulo ? 'Resumo · ' : ''}
                    {date(item.updated_at || item.created_at)}
                  </small>
                </div>
                {item.nota != null ? (
                  <span className={`ws-score ${tone(item.nota)}`}>
                    <Star size={12} /> {fmt(item.nota)}
                  </span>
                ) : (
                  <span className="ws-score is-none">
                    <Clock size={12} /> Aguardando
                  </span>
                )}
              </header>
              <p className="wl-excerpt">{item.conteudo}</p>
              {item.feedback && (
                <blockquote className="wl-feedback">
                  <MessageSquare size={14} />
                  <span>
                    <b>{item.corrigido_por ? item.corrigido_por.split(' ')[0] : 'Professor'}:</b> {item.feedback}
                  </span>
                </blockquote>
              )}
              <footer>
                <button type="button" className="wl-open" onClick={() => onOpen(item)}>
                  <Pencil size={14} /> {item.nota != null ? 'Ver e revisar' : 'Continuar escrevendo'}
                </button>
                {onDelete && (
                  <button type="button" className="ws-icon-btn is-danger" onClick={() => onDelete(item)} aria-label="Excluir" title="Excluir">
                    <Trash2 size={15} />
                  </button>
                )}
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
