import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X, BookOpen, ClipboardList, PenTool, Sparkles, Trophy, Flame, TrendingUp, CheckCircle2, Trash2, Mail, CalendarDays, RotateCcw } from 'lucide-react';
import { confirmAction } from '@/components/ConfirmHost';
import api from '@/lib/api';
import { toast } from 'sonner';

const num = (v, d = 1) => (v == null ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
const date = v => (v ? new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const tone = v => (v == null ? 'is-none' : v >= 7 ? 'is-high' : v >= 5 ? 'is-mid' : 'is-low');
const initials = name =>
  (name || 'A')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();

function Empty({ children }) {
  return <p className="sh-empty">{children}</p>;
}

// Ficha completa do aluno: leituras, atividades, textos, quizzes e certificados.
export default function StudentHistory({ studentId, onClose, onDeleted }) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState('leituras');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get(`/admin/students/${studentId}/history`)
      .then(r => setData(r.data))
      .catch(() => setFailed(true));
  }, [studentId]);

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const remove = async () => {
    const ok = await confirmAction({
      title: `Excluir ${data.aluno.nome}?`,
      message: 'A conta e todo o histórico do aluno (leituras, atividades, textos, quizzes e certificados) serão apagados. Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir aluno'
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.delete(`/admin/users/${studentId}`);
      toast.success('Aluno excluído.');
      onDeleted?.(studentId);
      onClose();
    } catch (e) {
      toast.error(typeof e.response?.data?.detail === 'string' ? e.response.data.detail : 'Não foi possível excluir o aluno.');
    } finally {
      setBusy(false);
    }
  };

  const r = data?.resumo;
  const textos = data ? [...data.resumos.map(t => ({ ...t, tipo: 'Resumo' })), ...data.producoes.map(t => ({ ...t, tipo: 'Produção textual' }))].sort((a, b) => (b.enviado_em || '').localeCompare(a.enviado_em || '')) : [];
  const tabs = data
    ? [
        ['leituras', BookOpen, 'Leituras', data.leituras.length],
        ['atividades', ClipboardList, 'Atividades', data.atividades.length],
        ['textos', PenTool, 'Textos', textos.length],
        ['quizzes', Sparkles, 'Quizzes', data.quizzes.length],
        ['certificados', Trophy, 'Certificados', data.certificados.length]
      ]
    : [];

  return createPortal(
    <div className="ws-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="ws-sheet sh" role="dialog" aria-modal="true" aria-label={data ? `Histórico de ${data.aluno.nome}` : 'Histórico do aluno'}>
        {!data ? (
          <div className="ws-empty" role={failed ? 'alert' : 'status'}>
            {failed ? (
              <>
                <h3>Não foi possível abrir o histórico</h3>
                <button className="underline font-semibold" onClick={onClose}>
                  Fechar
                </button>
              </>
            ) : (
              <>
                <span className="cx-spinner mx-auto mb-3" /> Carregando histórico…
              </>
            )}
          </div>
        ) : (
          <>
            <header className="sh-head">
              <span className="sh-avatar">{data.aluno.avatar_url ? <img src={data.aluno.avatar_url} alt="" /> : initials(data.aluno.nome)}</span>
              <div className="min-w-0 flex-1">
                <p className="ws-eyebrow">Histórico do aluno</p>
                <h2>{data.aluno.nome}</h2>
                <p className="sh-meta">
                  <span className="ws-chip">{data.aluno.turma || 'Sem turma'}</span>
                  {data.aluno.email && (
                    <span>
                      <Mail size={13} /> {data.aluno.email}
                    </span>
                  )}
                  {data.aluno.created_at && (
                    <span>
                      <CalendarDays size={13} /> desde {date(data.aluno.created_at)}
                    </span>
                  )}
                </p>
              </div>
              <button type="button" className="ws-icon-btn" onClick={onClose} aria-label="Fechar">
                <X size={19} />
              </button>
            </header>

            <div className="ws-sheet-body sh-body">
              <section className="sh-stats">
                <div className="is-featured">
                  <TrendingUp size={16} />
                  <strong>{num(r.media)}</strong>
                  <span>média geral</span>
                </div>
                <div>
                  <CheckCircle2 size={16} />
                  <strong>
                    {r.atividades_entregues}
                    <small>/{r.atividades_disponiveis}</small>
                  </strong>
                  <span>atividades entregues</span>
                </div>
                <div>
                  <BookOpen size={16} />
                  <strong>{r.livros_concluidos}</strong>
                  <span>livros concluídos</span>
                </div>
                <div>
                  <Trophy size={16} />
                  <strong>{r.certificados}</strong>
                  <span>certificados</span>
                </div>
                <div>
                  <Flame size={16} />
                  <strong>{r.sequencia}</strong>
                  <span>dias seguidos (recorde {r.melhor_sequencia})</span>
                </div>
                <div>
                  <BookOpen size={16} />
                  <strong>{r.paginas_lidas}</strong>
                  <span>páginas lidas</span>
                </div>
              </section>

              <div className="ws-segment sh-tabs" role="tablist" aria-label="Histórico">
                {tabs.map(([key, Icon, label, n]) => (
                  <button key={key} type="button" role="tab" aria-selected={tab === key} aria-pressed={tab === key} onClick={() => setTab(key)}>
                    <Icon size={14} /> {label} <span>{n}</span>
                  </button>
                ))}
              </div>

              {tab === 'leituras' &&
                (data.leituras.length ? (
                  <ul className="sh-list">
                    {data.leituras.map(l => (
                      <li key={l.book_id}>
                        <span className="sh-cover">{l.capa_url ? <img src={l.capa_url} alt="" /> : <BookOpen size={16} />}</span>
                        <div className="sh-main">
                          <strong>{l.titulo}</strong>
                          <span className="sh-bar">
                            <span className="ws-meter">
                              <span style={{ width: `${l.percentual}%` }} />
                            </span>
                            <b>{l.percentual}%</b>
                          </span>
                        </div>
                        <small>{l.percentual >= 100 ? 'Concluído' : date(l.atualizado_em)}</small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty>Ainda não começou nenhum livro.</Empty>
                ))}

              {tab === 'atividades' &&
                (data.atividades.length ? (
                  <ul className="sh-list">
                    {data.atividades.map(a => (
                      <li key={a.activity_id}>
                        <span className="sh-icon">
                          <ClipboardList size={16} />
                        </span>
                        <div className="sh-main">
                          <Link to={`/admin/activities/${a.activity_id}`}>{a.titulo}</Link>
                          <span className="sh-sub">
                            Tentativa {a.tentativa} · {date(a.enviado_em)}
                            {a.feedback ? ` · “${a.feedback.slice(0, 80)}${a.feedback.length > 80 ? '…' : ''}”` : ''}
                          </span>
                        </div>
                        {a.devolvida ? (
                          <span className="ws-score is-mid">
                            <RotateCcw size={12} /> Refazer
                          </span>
                        ) : a.nota != null ? (
                          <span className={`ws-score ${tone((a.nota * 10) / a.valor)}`}>
                            {num(a.nota)}/{num(a.valor, 0)}
                          </span>
                        ) : (
                          <span className="ws-score is-none">A corrigir</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty>Nenhuma atividade entregue.</Empty>
                ))}

              {tab === 'textos' &&
                (textos.length ? (
                  <ul className="sh-list">
                    {textos.map(t => (
                      <li key={t.tipo + t.id}>
                        <span className="sh-icon">
                          <PenTool size={16} />
                        </span>
                        <div className="sh-main">
                          <strong>{t.titulo}</strong>
                          <span className="sh-sub">
                            {t.tipo} · {date(t.enviado_em)}
                          </span>
                        </div>
                        <span className={`ws-score ${tone(t.nota)}`}>{t.nota == null ? 'A corrigir' : num(t.nota)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty>Nenhum resumo ou produção textual enviado.</Empty>
                ))}

              {tab === 'quizzes' &&
                (data.quizzes.length ? (
                  <ul className="sh-list">
                    {data.quizzes.map((q, i) => (
                      <li key={i}>
                        <span className="sh-icon">
                          <Sparkles size={16} />
                        </span>
                        <div className="sh-main">
                          <strong>{q.titulo}</strong>
                          <span className="sh-sub">{date(q.enviado_em)}</span>
                        </div>
                        <span className={`ws-score ${tone(q.total ? (q.acertos / q.total) * 10 : null)}`}>
                          {q.acertos}/{q.total}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty>Nenhum quiz respondido.</Empty>
                ))}

              {tab === 'certificados' &&
                (data.certificados.length ? (
                  <ul className="sh-list">
                    {data.certificados.map(c => (
                      <li key={c.codigo}>
                        <span className="sh-icon is-gold">
                          <Trophy size={16} />
                        </span>
                        <div className="sh-main">
                          <strong>{c.book_titulo}</strong>
                          <span className="sh-sub">
                            {c.percentual}% no questionário · código {c.codigo}
                          </span>
                        </div>
                        <small>{date(c.emitido_em)}</small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty>Nenhum certificado conquistado ainda.</Empty>
                ))}
            </div>

            <footer className="bqe-footer">
              <button type="button" className="sh-delete" disabled={busy} onClick={remove}>
                <Trash2 size={15} /> {busy ? 'Excluindo…' : 'Excluir aluno'}
              </button>
              <span className="flex-1" />
              <button type="button" className="a11y-done" onClick={onClose}>
                Fechar
              </button>
            </footer>
          </>
        )}
      </section>
    </div>,
    document.body
  );
}
