import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Pencil, ChevronLeft, ChevronRight, X, CalendarDays } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DashboardLayout from '@/components/DashboardLayout';
import PageIntro from '@/components/PageIntro';
import OwlEmpty from '@/components/OwlEmpty';
import { confirmAction } from '@/components/ConfirmHost';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { toast } from 'sonner';

const COLORS = [
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#10b981', label: 'Verde' },
  { value: '#f59e0b', label: 'Amarelo' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#ec4899', label: 'Rosa' }
];
const WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const key = d => format(d, 'yyyy-MM-dd');
const parse = s => new Date(s + 'T12:00:00');

function EventForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async e => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.data) return toast.error('Preencha o título e a data.');
    setBusy(true);
    try {
      const body = { titulo: form.titulo, descricao: form.descricao, data: form.data, cor: form.cor };
      await (form.id ? api.put(`/admin/calendar/${form.id}`, body) : api.post('/admin/calendar', body));
      toast.success(form.id ? 'Evento atualizado.' : 'Evento criado.');
      onSaved(form.data);
    } catch {
      toast.error('Não foi possível salvar o evento.');
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="ws-overlay is-center" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <form className="vd-form ca-form" onSubmit={save} role="dialog" aria-modal="true" aria-label={form.id ? 'Editar evento' : 'Novo evento'}>
        <header>
          <div>
            <p className="ws-eyebrow">Agenda da escola</p>
            <h2>{form.id ? 'Editar evento' : 'Novo evento'}</h2>
          </div>
          <button type="button" className="ws-icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <div className="vd-form-body">
<fieldset disabled={busy} className="vd-form-fields">
          <label className="qz-field">
            <span>Título</span>
            <input id="titulo" data-testid="input-event-titulo" required maxLength={160} placeholder="Ex.: Apresentação do livro Dom Casmurro" value={form.titulo} onChange={e => set('titulo', e.target.value)} />
          </label>
          <label className="qz-field">
            <span>Data</span>
            <input id="data" data-testid="input-event-data" type="date" required value={form.data} onChange={e => set('data', e.target.value)} />
          </label>
          <label className="qz-field">
            <span>Descrição (opcional)</span>
            <textarea id="descricao" rows={3} maxLength={2000} placeholder="Horário, local, o que levar…" value={form.descricao} onChange={e => set('descricao', e.target.value)} />
          </label>
          <div className="qz-field">
            <span>Cor</span>
            <div className="ca-colors" role="radiogroup" aria-label="Cor do evento">
              {COLORS.map(c => (
                <button key={c.value} type="button" role="radio" aria-checked={form.cor === c.value} aria-label={c.label} title={c.label} style={{ '--c': c.value }} onClick={() => set('cor', c.value)} />
              ))}
            </div>
          </div>
        </fieldset>
</div>
        <footer className="bqe-footer">
          <span className="flex-1" />
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className="qz-btn-primary">
            {busy ? 'Salvando…' : form.id ? 'Salvar alterações' : 'Criar evento'}
          </Button>
        </footer>
      </form>
    </div>,
    document.body
  );
}

function EventItem({ event, onEdit, onDelete, showDate }) {
  const d = parse(event.data);
  return (
    <li className="ca-event" style={{ '--c': event.cor || '#8b5cf6' }}>
      {showDate ? (
        <span className="ca-event-date">
          <b>{format(d, 'd')}</b>
          <small>{WEEK[d.getDay()]}</small>
        </span>
      ) : (
        <span className="ca-event-bar" />
      )}
      <div className="ca-event-copy">
        <strong>{event.titulo}</strong>
        {event.descricao && <p>{event.descricao}</p>}
      </div>
      <span className="ca-event-actions">
        <button type="button" className="ws-icon-btn" onClick={() => onEdit(event)} aria-label={`Editar ${event.titulo}`} title="Editar">
          <Pencil size={14} />
        </button>
        <button type="button" className="ws-icon-btn is-danger" onClick={() => onDelete(event)} aria-label={`Excluir ${event.titulo}`} title="Excluir">
          <Trash2 size={14} />
        </button>
      </span>
    </li>
  );
}

export default function AdminCalendar() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState(null);
  const [selected, setSelected] = useState(() => new Date());
  const [form, setForm] = useState(null);

  const load = async (m = month) => {
    try {
      setEvents((await api.get(`/calendar?mes=${m.getMonth() + 1}&ano=${m.getFullYear()}`)).data);
    } catch {
      setEvents([]);
      toast.error('Não foi possível carregar os eventos.');
    }
  };
  useEffect(() => {
    load(month);
  }, [month]);

  const remove = async event => {
    if (!(await confirmAction({ title: 'Excluir evento?', message: `“${event.titulo}” sairá da agenda da escola.`, confirmLabel: 'Excluir' }))) return;
    try {
      await api.delete(`/admin/calendar/${event.id}`);
      toast.success('Evento excluído.');
      load();
    } catch {
      toast.error('Não foi possível excluir o evento.');
    }
  };

  const list = events || [];
  const days = eachDayOfInterval({ start: month, end: endOfMonth(month) });
  const padding = Array(month.getDay()).fill(null);
  const byDay = d => list.filter(e => e.data === key(d));
  const today = new Date();
  const selectedEvents = byDay(selected);
  const newEvent = date => setForm({ titulo: '', descricao: '', data: key(date || selected), cor: COLORS[0].value });
  const edit = e => setForm({ id: e.id, titulo: e.titulo, descricao: e.descricao || '', data: e.data, cor: e.cor || COLORS[0].value });
  const goto = m => {
    setMonth(m);
    setSelected(isSameDay(startOfMonth(today), m) ? today : m);
  };

  return (
    <DashboardLayout>
      <div data-testid="admin-calendar-page">
        <PageIntro section="PLANEJAMENTO / AGENDA" title="Calendário da escola" description="Organize os encontros e as próximas experiências de leitura. Clique em um dia para ver ou criar eventos.">
          <Button className="qz-btn-primary" data-testid="new-event-button" onClick={() => newEvent()}>
            <Plus size={17} /> Novo evento
          </Button>
        </PageIntro>

        <div className="ca">
          <section className="ws-card ca-month">
            <header className="ca-head">
              <h2>{format(month, 'MMMM', { locale: ptBR })}</h2>
              <span>{format(month, 'yyyy')}</span>
              <div className="ca-nav">
                <button type="button" className="ca-today" onClick={() => goto(startOfMonth(today))}>
                  Hoje
                </button>
                <button type="button" className="ws-icon-btn" onClick={() => goto(subMonths(month, 1))} aria-label="Mês anterior">
                  <ChevronLeft size={18} />
                </button>
                <button type="button" className="ws-icon-btn" onClick={() => goto(addMonths(month, 1))} aria-label="Próximo mês">
                  <ChevronRight size={18} />
                </button>
              </div>
            </header>
            <div className="ca-week" aria-hidden="true">
              {WEEK.map(d => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="ca-grid" role="grid" aria-label={format(month, 'MMMM yyyy', { locale: ptBR })}>
              {padding.map((_, i) => (
                <span key={`p${i}`} className="ca-pad" />
              ))}
              {days.map(d => {
                const dayEvents = byDay(d);
                const isSel = isSameDay(d, selected);
                return (
                  <button
                    key={key(d)}
                    type="button"
                    className={`ca-day ${isSameDay(d, today) ? 'is-today' : ''} ${isSel ? 'is-selected' : ''} ${dayEvents.length ? 'has-events' : ''}`}
                    onClick={() => setSelected(d)}
                    onDoubleClick={() => newEvent(d)}
                    aria-pressed={isSel}
                    aria-label={`${format(d, "d 'de' MMMM", { locale: ptBR })}${dayEvents.length ? `, ${dayEvents.length} evento(s)` : ''}`}
                  >
                    <b>{format(d, 'd')}</b>
                    <span className="ca-pills">
                      {dayEvents.slice(0, 2).map(e => (
                        <i key={e.id} style={{ '--c': e.cor || '#8b5cf6' }}>
                          {e.titulo}
                        </i>
                      ))}
                      {dayEvents.length > 2 && <small>+{dayEvents.length - 2}</small>}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="ca-side">
            <section className="ws-card ca-panel">
              <header>
                <div>
                  <p className="ws-eyebrow">{isSameDay(selected, today) ? 'Hoje' : WEEK[selected.getDay()]}</p>
                  <h3>{format(selected, "d 'de' MMMM", { locale: ptBR })}</h3>
                </div>
                <button type="button" className="ws-icon-btn" onClick={() => newEvent(selected)} aria-label="Criar evento neste dia" title="Criar evento neste dia">
                  <Plus size={18} />
                </button>
              </header>
              {selectedEvents.length ? (
                <ul className="ca-list">
                  {selectedEvents.map(e => (
                    <EventItem key={e.id} event={e} onEdit={edit} onDelete={remove} />
                  ))}
                </ul>
              ) : (
                <button type="button" className="ca-free" onClick={() => newEvent(selected)}>
                  <CalendarDays size={18} /> Dia livre — adicionar evento
                </button>
              )}
            </section>

            <section className="ws-card ca-panel">
              <header>
                <div>
                  <p className="ws-eyebrow">Agenda do mês</p>
                  <h3>
                    {list.length} evento{list.length === 1 ? '' : 's'}
                  </h3>
                </div>
              </header>
              {!events ? (
                <p className="ca-muted">Carregando…</p>
              ) : list.length ? (
                <ul className="ca-list">
                  {list.map(e => (
                    <EventItem key={e.id} event={e} onEdit={edit} onDelete={remove} showDate />
                  ))}
                </ul>
              ) : (
                <OwlEmpty compact title="Mês tranquilo" text="Nenhum evento programado. Que tal marcar uma roda de leitura?" />
              )}
            </section>
          </aside>
        </div>
      </div>

      {form && (
        <EventForm
          initial={form}
          onClose={() => setForm(null)}
          onSaved={date => {
            setForm(null);
            const d = parse(date);
            if (!isSameDay(startOfMonth(d), month)) setMonth(startOfMonth(d));
            else load();
            setSelected(d);
          }}
        />
      )}
    </DashboardLayout>
  );
}
