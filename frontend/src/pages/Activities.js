import { confirmAction } from '@/components/ConfirmHost';
import { publicationLabel } from '@/lib/publication';
import ActivityLibrary from '@/components/ActivityLibrary';
import ActivityForm from '@/components/ActivityForm';
import CorrectionDrawer from '@/components/CorrectionDrawer';
import DashboardLayout from '@/components/DashboardLayout';
import PageIntro from '@/components/PageIntro';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus,
  ClipboardList,
  ArrowRight,
  Award,
  Clock3,
  CalendarClock,
  Trash2,
  Search,
  PenLine,
  CheckCircle2,
  Send,
  Settings2,
  BookOpen,
  TrendingUp,
  RotateCcw,
  ArrowLeft
} from 'lucide-react';
import { TURMAS } from '@/constants/turmas';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';
import { toast } from 'sonner';

export const deadline = value => (value ? new Date(value + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem prazo');
export const activityError = (e, fallback) => (typeof e.response?.data?.detail === 'string' ? e.response.data.detail : fallback);

const normalize = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const fmt = v => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

function dueInfo(prazo) {
  if (!prazo) return ['Sem prazo', ''];
  const today = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) + 'T00:00:00');
  const days = Math.round((new Date(prazo + 'T00:00:00') - today) / 864e5);
  if (days < 0) return [`Encerrou em ${deadline(prazo)}`, 'is-late'];
  if (days === 0) return ['Vence hoje', 'is-urgent'];
  if (days === 1) return ['Vence amanhã', 'is-urgent'];
  return [`Vence em ${days} dias`, days <= 3 ? 'is-soon' : ''];
}

function studentState(a) {
  const mine = a.minha_resposta;
  if (a.pode_reenviar) return ['Refazer', 'is-retry', RotateCcw];
  if (mine?.nota != null) return ['Corrigida', 'is-graded', CheckCircle2];
  if (mine) return ['Entregue', 'is-sent', Send];
  if (a.encerrada) return ['Encerrada', 'is-closed', Clock3];
  return ['A entregar', 'is-open', PenLine];
}

function staffState(a) {
  if (a.agendada) return ['Agendada', 'is-scheduled'];
  if (a.encerrada) return ['Encerrada', 'is-closed'];
  return ['Aberta', 'is-open'];
}

function StaffCard({ a, onCorrect, onDelete }) {
  const [label, cls] = staffState(a);
  const [due, dueCls] = dueInfo(a.prazo);
  const entregas = a.entregas || 0;
  const corrigidas = a.corrigidas || 0;
  const devolvidas = a.devolvidas || 0;
  const pending = Math.max(0, entregas - corrigidas - devolvidas);
  const graded = entregas ? Math.round(((corrigidas + devolvidas) / entregas) * 100) : 0;
  return (
    <article className={`at-card ${cls}`}>
      <div className="at-card-top">
        <span className="ws-chip">{a.turma === 'TODAS' ? 'Todas as turmas' : a.turma}</span>
        {a.disciplina && <span className="ws-chip is-soft">{a.disciplina}</span>}
        <span className={`at-state ${cls}`}>{label}</span>
      </div>
      <h3>{a.titulo}</h3>
      <div className="at-meta">
        <span className={`at-due ${a.encerrada ? '' : dueCls}`}>
          <CalendarClock size={13} /> {a.agendada ? `Publica ${publicationLabel(a.publicar_em)}` : due}
        </span>
        <span>
          <ClipboardList size={13} /> {a.perguntas?.length || 0} pergunta(s)
        </span>
        <span>
          <Award size={13} /> {fmt(a.valor_nota ?? 10)} pts
        </span>
      </div>
      <div className="at-bars">
        <div>
          <span>Entregas</span>
          <b>{entregas}</b>
        </div>
        <div>
          <span>Corrigidas</span>
          <b>
            {corrigidas}
            {devolvidas ? ` · ${devolvidas} devolvida(s)` : ''}
          </b>
        </div>
        <span className="ws-meter">
          <span style={{ width: `${graded}%` }} />
        </span>
      </div>
      <div className="at-actions">
        <Button className={pending ? 'qz-btn-primary' : ''} variant={pending ? 'default' : 'outline'} onClick={() => onCorrect(a.id)}>
          {pending ? (
            <>
              <PenLine size={15} /> Corrigir {pending}
            </>
          ) : (
            'Ver respostas'
          )}
        </Button>
        <Link to={`/admin/activities/${a.id}`} className="ws-icon-btn" title="Gerenciar (editar, encerrar, duplicar)" aria-label={`Gerenciar ${a.titulo}`}>
          <Settings2 size={16} />
        </Link>
        <button type="button" className="ws-icon-btn at-danger" title="Apagar atividade" aria-label={`Apagar ${a.titulo}`} onClick={() => onDelete(a)}>
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}

function StudentCard({ a }) {
  const [label, cls, Icon] = studentState(a);
  const prazo = a.minha_resposta?.reenvio?.prazo || a.prazo;
  const [due, dueCls] = dueInfo(prazo);
  const open = ['is-open', 'is-retry'].includes(cls);
  return (
    <Link to={`/activities/${a.id}`} className={`at-card is-link ${cls}`}>
      <div className="at-card-top">
        {a.disciplina && <span className="ws-chip is-soft">{a.disciplina}</span>}
        <span className={`at-state ${cls}`}>
          <Icon size={12} /> {label}
        </span>
      </div>
      <h3>{a.titulo}</h3>
      <p className="at-teacher">{a.professor_nome}</p>
      <div className="at-meta">
        <span className={`at-due ${open ? dueCls : ''}`}>
          <CalendarClock size={13} /> {open ? due : `Prazo ${deadline(prazo)}`}
        </span>
        <span>
          <ClipboardList size={13} /> {a.perguntas?.length || 0} pergunta(s)
        </span>
      </div>
      {a.minha_resposta?.nota != null ? (
        <div className="at-grade">
          <strong>{fmt(a.minha_resposta.nota)}</strong>
          <span>de {fmt(a.valor_nota ?? 10)} pontos</span>
        </div>
      ) : (
        <span className={`at-cta ${open ? 'is-primary' : ''}`}>
          {open ? (cls === 'is-retry' ? 'Refazer atividade' : 'Responder agora') : 'Ver minhas respostas'} <ArrowRight size={15} />
        </span>
      )}
    </Link>
  );
}

export default function Activities() {
  const user = getUser();
  const admin = ['admin', 'teacher'].includes(user?.role);
  const [params] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState(() => admin && params.get('nova') === '1');
  const [draft, setDraft] = useState(() =>
    params.get('turma') ? { titulo: '', valor_nota: 10, descricao: '', turma: params.get('turma'), perguntas: [{ enunciado: '', tipo: 'texto', alternativas: ['', ''] }] } : null
  );
  const [tab, setTab] = useState('published');
  const [filter, setFilter] = useState('all');
  const [turma, setTurma] = useState('');
  const [query, setQuery] = useState('');
  const [correcting, setCorrecting] = useState(null);

  const load = async () => {
    setFailed(false);
    setLoading(true);
    try {
      setItems((await api.get('/activities')).data);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async a => {
    if (!(await confirmAction({ title: 'Apagar atividade?', message: `Apagar a atividade "${a.titulo}"? Esta ação é permanente e remove também as entregas.`, confirmLabel: 'Apagar' }))) return;
    try {
      await api.delete(`/admin/activities/${a.id}`);
      setItems(list => list.filter(x => x.id !== a.id));
      toast.success('Atividade apagada.');
    } catch (e) {
      toast.error(activityError(e, 'Não foi possível apagar a atividade.'));
    }
  };

  const matchesText = a => normalize(`${a.titulo} ${a.disciplina}`).includes(normalize(query));
  let visible = items.filter(matchesText);
  let kpis;
  if (admin) {
    visible = visible
      .filter(a => (tab === 'scheduled' ? a.agendada : !a.agendada))
      .filter(a => !turma || a.turma === turma || a.turma === 'TODAS')
      .filter(a => filter === 'all' || (filter === 'open' ? !a.encerrada : filter === 'closed' ? a.encerrada : (a.entregas || 0) - (a.corrigidas || 0) - (a.devolvidas || 0) > 0));
    const toGrade = items.reduce((s, a) => s + Math.max(0, (a.entregas || 0) - (a.corrigidas || 0) - (a.devolvidas || 0)), 0);
    const delivered = items.reduce((s, a) => s + (a.entregas || 0), 0);
    const graded = items.reduce((s, a) => s + (a.corrigidas || 0), 0);
    kpis = [
      ['Para corrigir', toGrade, 'Entregas aguardando nota', PenLine, true],
      ['Abertas', items.filter(a => !a.agendada && !a.encerrada).length, 'Recebendo respostas', ClipboardList],
      ['Agendadas', items.filter(a => a.agendada).length, 'Publicação programada', CalendarClock],
      ['Correção em dia', delivered ? `${Math.round((graded / delivered) * 100)}%` : '—', `${graded} de ${delivered} entregas corrigidas`, TrendingUp]
    ];
  } else {
    visible = visible.filter(a => {
      const cls = studentState(a)[1];
      return filter === 'all' || (filter === 'todo' ? ['is-open', 'is-retry'].includes(cls) : filter === 'sent' ? cls === 'is-sent' : cls === 'is-graded');
    });
    visible.sort((a, b) => {
      const rank = x => ['is-retry', 'is-open', 'is-sent', 'is-graded', 'is-closed'].indexOf(studentState(x)[1]);
      return rank(a) - rank(b) || (a.prazo || '9999').localeCompare(b.prazo || '9999');
    });
    const grades = items.filter(a => a.minha_resposta?.nota != null).map(a => (a.minha_resposta.nota / (a.valor_nota || 10)) * 10);
    kpis = [
      ['Para fazer', items.filter(a => ['is-open', 'is-retry'].includes(studentState(a)[1])).length, 'Atividades a entregar', PenLine, true],
      ['Entregues', items.filter(a => a.minha_resposta).length, 'Respostas enviadas', Send],
      ['Média', grades.length ? fmt(grades.reduce((s, v) => s + v, 0) / grades.length) : '—', 'Nas atividades corrigidas (0 a 10)', Award]
    ];
  }

  const filters = admin
    ? [
        ['all', 'Todas'],
        ['grade', 'Para corrigir'],
        ['open', 'Abertas'],
        ['closed', 'Encerradas']
      ]
    : [
        ['all', 'Todas'],
        ['todo', 'Para fazer'],
        ['sent', 'Entregues'],
        ['graded', 'Corrigidas']
      ];

  if (creating) {
    return (
      <DashboardLayout>
        <button type="button" className="ws-back" onClick={() => setCreating(false)}>
          <ArrowLeft size={15} /> Voltar às atividades
        </button>
        <ActivityForm
          draft={draft}
          onCancel={() => setCreating(false)}
          onSaved={saved => {
            setCreating(false);
            setTab(saved?.publicar_em && new Date(saved.publicar_em) > new Date() ? 'scheduled' : 'published');
            load();
          }}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageIntro
        section={admin ? 'ENSINO / ATIVIDADES' : 'MEU APRENDIZADO'}
        title={admin ? 'Atividades escolares' : 'Minhas atividades'}
        description={admin ? 'Crie atividades para as suas turmas, acompanhe as entregas e corrija sem sair da página.' : 'Responda as atividades dos seus professores dentro do prazo e veja suas notas e comentários.'}
      >
        {admin && (
          <Button
            className="qz-btn-primary"
            onClick={() => {
              setDraft(null);
              setCreating(true);
            }}
          >
            <Plus size={16} /> Nova atividade
          </Button>
        )}
      </PageIntro>

      <section className="ws-kpis">
        {kpis.map(([label, value, hint, Icon, featured]) => (
          <article key={label} className={`ws-card ws-kpi ${featured ? 'is-featured' : ''}`}>
            <span className="ws-kpi-icon">
              <Icon size={18} />
            </span>
            <span>{label}</span>
            <strong>{value}</strong>
            <p>{hint}</p>
          </article>
        ))}
      </section>

      <div className="ws-card ws-toolbar">
        {admin && (
          <div className="ws-segment" role="group" aria-label="Área de atividades">
            {[
              ['published', 'Publicadas', items.filter(a => !a.agendada).length],
              ['scheduled', 'Agendadas', items.filter(a => a.agendada).length],
              ['models', 'Meus modelos']
            ].map(([key, label, n]) => (
              <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}>
                {label} {n != null && <span>{n}</span>}
              </button>
            ))}
          </div>
        )}
        {tab !== 'models' && (
          <>
            <label className="ws-search">
              <Search size={16} />
              <input aria-label="Buscar atividade" placeholder="Buscar por título ou disciplina…" value={query} onChange={e => setQuery(e.target.value)} />
            </label>
            {admin && (
              <select aria-label="Filtrar turma" value={turma} onChange={e => setTurma(e.target.value)}>
                <option value="">Todas as turmas</option>
                {TURMAS.filter(t => user.role === 'admin' || user.turmas?.includes(t.value)).map(t => (
                  <option key={t.value} value={t.value}>
                    {t.value}
                  </option>
                ))}
              </select>
            )}
          </>
        )}
      </div>

      {tab !== 'models' && (
        <div className="nt-chips at-filters" role="group" aria-label="Situação">
          {filters.map(([key, label]) => (
            <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>
              {label}
            </button>
          ))}
        </div>
      )}

      {tab === 'models' ? (
        <ActivityLibrary
          onUse={source => {
            setDraft(source);
            setTab('published');
            setCreating(true);
          }}
        />
      ) : loading ? (
        <div className="ws-card ws-empty" role="status">
          <span className="cx-spinner mx-auto mb-3" /> Carregando atividades…
        </div>
      ) : failed ? (
        <div className="ws-card ws-empty" role="alert">
          <h3>Não foi possível carregar as atividades</h3>
          <button className="underline font-semibold" onClick={load}>
            Tentar novamente
          </button>
        </div>
      ) : !visible.length ? (
        <div className="ws-card ws-empty">
          <BookOpen size={30} />
          <h3>{items.length ? 'Nenhuma atividade nesta seleção' : admin ? 'Sua primeira atividade começa aqui' : 'Novas atividades estão a caminho'}</h3>
          <p>{items.length ? 'Ajuste a busca ou os filtros.' : admin ? 'Prepare perguntas para uma turma e acompanhe cada resposta.' : 'As atividades dos seus professores aparecem aqui.'}</p>
          {admin && !items.length && (
            <Button className="qz-btn-primary mt-4" onClick={() => setCreating(true)}>
              <Plus size={16} /> Criar atividade
            </Button>
          )}
        </div>
      ) : (
        <div className="at-grid">
          {visible.map(a => (admin ? <StaffCard key={a.id} a={a} onCorrect={setCorrecting} onDelete={remove} /> : <StudentCard key={a.id} a={a} />))}
        </div>
      )}

      {correcting && <CorrectionDrawer activityId={correcting} onClose={() => setCorrecting(null)} onChanged={load} />}
    </DashboardLayout>
  );
}
