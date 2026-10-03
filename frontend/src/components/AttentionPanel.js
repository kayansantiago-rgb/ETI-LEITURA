import { useEffect, useState } from 'react';
import Face from '@/components/Face';
import { createPortal } from 'react-dom';
import { AlertTriangle, BellRing, BookX, CalendarX2, RotateCcw, Check, X, ChevronDown, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { toast } from 'sonner';

const first = name => (name || '').split(' ')[0];
const PREVIEW = 4;

// Mensagem sugerida conforme o motivo mais urgente; o professor pode editar antes de enviar.
function suggestion(row) {
  if (row.atrasadas.length) return [`Oi, ${first(row.nome)}! A atividade "${row.atrasadas[0].titulo}" ficou pendente. Ainda dá tempo de entregar 😉`, '/activities'];
  if (row.refazer.length) return [`Oi, ${first(row.nome)}! Sua atividade "${row.refazer[0].titulo}" voltou para você ajustar. Bora refazer?`, '/activities'];
  return [`Oi, ${first(row.nome)}! Sentimos sua falta na biblioteca. Que tal ler algumas páginas hoje? 📚`, '/library'];
}

function reasons(row) {
  const list = [];
  if (row.atrasadas.length) list.push(['is-late', CalendarX2, `${row.atrasadas.length} atividade(s) atrasada(s)`]);
  if (row.refazer.length) list.push(['is-retry', RotateCcw, `${row.refazer.length} para refazer`]);
  if (row.dias_sem_ler == null) list.push(['is-quiet', BookX, 'Ainda não começou a ler']);
  else if (row.dias_sem_ler >= 7) list.push(['is-quiet', BookX, `${row.dias_sem_ler} dias sem ler`]);
  return list;
}

function NudgeDialog({ row, onClose, onSent }) {
  const [initial, destino] = suggestion(row);
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const send = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/admin/students/${row.id}/nudge`, { mensagem: text.trim(), destino });
      toast.success(`Lembrete enviado para ${first(row.nome)}.`);
      onSent(row.id);
    } catch (err) {
      toast.error(typeof err.response?.data?.detail === 'string' ? err.response.data.detail : 'Não foi possível enviar o lembrete.');
    } finally {
      setBusy(false);
    }
  };
  return createPortal(
    <div className="ws-overlay is-center" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <form className="vd-form at-nudge" onSubmit={send} role="dialog" aria-modal="true" aria-label={`Lembrete para ${row.nome}`}>
        <header>
          <div>
            <p className="ws-eyebrow">Lembrete para {row.nome}</p>
            <h2>Enviar um empurrãozinho</h2>
          </div>
          <button type="button" className="ws-icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <div className="vd-form-body">
          <fieldset disabled={busy} className="vd-form-fields">
            <label className="qz-field">
              <span>Mensagem</span>
              <textarea rows={4} required minLength={3} maxLength={200} value={text} onChange={e => setText(e.target.value)} />
              <small className="af-hint">
                {text.length}/200 · Aparece nos avisos do aluno e no celular, se ele ativou as notificações. Um lembrete por aluno por dia.
              </small>
            </label>
          </fieldset>
        </div>
        <footer className="bqe-footer">
          <span className="flex-1" />
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className="qz-btn-primary" disabled={busy || text.trim().length < 3}>
            <Send size={15} /> {busy ? 'Enviando…' : 'Enviar lembrete'}
          </Button>
        </footer>
      </form>
    </div>,
    document.body
  );
}

// Alunos parados há uma semana ou com atividades atrasadas/devolvidas, com botão de lembrete.
export default function AttentionPanel({ turma, onOpen }) {
  const [rows, setRows] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [nudging, setNudging] = useState(null);

  useEffect(() => {
    setRows(null);
    api
      .get('/admin/students/attention', turma ? { params: { turma } } : undefined)
      .then(r => setRows(r.data))
      .catch(() => setRows([]));
  }, [turma]);

  if (!rows) return null;
  if (!rows.length)
    return (
      <section className="ws-card ap ap-ok">
        <span className="ap-ok-icon">
          <Check size={18} />
        </span>
        <div>
          <strong>Turma em dia!</strong>
          <span>Ninguém está há mais de uma semana sem ler nem com atividades atrasadas.</span>
        </div>
      </section>
    );

  const visible = expanded ? rows : rows.slice(0, PREVIEW);
  return (
    <section className="ws-card ap" aria-label="Alunos que precisam de atenção">
      <header className="ap-head">
        <span className="ap-icon">
          <AlertTriangle size={18} />
        </span>
        <div>
          <h2>
            Precisam de atenção <b>{rows.length}</b>
          </h2>
          <p>Uma semana sem ler, atividades atrasadas ou devolvidas para refazer.</p>
        </div>
      </header>
      <ul className="ap-list">
        {visible.map(row => (
          <li key={row.id}>
            <button type="button" className="ap-person" onClick={() => onOpen?.(row.id)} title="Ver histórico completo">
              <Face url={row.avatar_url} name={row.nome} frame={row.moldura} />
              <span className="min-w-0">
                <strong>{row.nome}</strong>
                {!turma && <small>{row.turma}</small>}
              </span>
            </button>
            <span className="ap-reasons">
              {reasons(row).map(([cls, Icon, label]) => (
                <span key={label} className={`ap-tag ${cls}`}>
                  <Icon size={12} /> {label}
                </span>
              ))}
            </span>
            {row.lembrado_hoje ? (
              <span className="ap-sent">
                <Check size={14} /> Lembrado hoje
              </span>
            ) : (
              <button type="button" className="ap-nudge" onClick={() => setNudging(row)}>
                <BellRing size={14} /> Lembrar
              </button>
            )}
          </li>
        ))}
      </ul>
      {rows.length > PREVIEW && (
        <button type="button" className="ap-more" onClick={() => setExpanded(v => !v)} aria-expanded={expanded}>
          {expanded ? 'Mostrar menos' : `Ver todos (${rows.length})`} <ChevronDown size={15} className={expanded ? 'rotate-180' : ''} />
        </button>
      )}
      {nudging && (
        <NudgeDialog
          row={nudging}
          onClose={() => setNudging(null)}
          onSent={id => {
            setNudging(null);
            setRows(list => list.map(r => (r.id === id ? { ...r, lembrado_hoje: true } : r)));
          }}
        />
      )}
    </section>
  );
}
