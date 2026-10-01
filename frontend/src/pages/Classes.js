import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Users,
  ArrowLeft,
  ArrowRight,
  Plus,
  BookOpen,
  ClipboardList,
  PlayCircle,
  Search,
  TrendingUp,
  CheckCheck,
  Clock3,
  FileDown,
  FileText,
  CalendarClock
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import PageIntro from '@/components/PageIntro';
import CorrectionDrawer from '@/components/CorrectionDrawer';
import SubjectBadge from '@/components/SubjectBadge';
import { Button } from '@/components/ui/button';
import { TURMAS } from '@/constants/turmas';
import { getUser } from '@/lib/auth';
import { deadline } from '@/pages/Activities';
import api from '@/lib/api';
import { toast } from 'sonner';

const normalize = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const num = v => (v == null ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const tone = v => (v == null ? 'is-none' : v >= 7 ? 'is-high' : v >= 5 ? 'is-mid' : 'is-low');
const initials = name =>
  (name || 'A')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();
const avg = list => (list.length ? list.reduce((s, v) => s + v, 0) / list.length : null);
const COVERS = ['qz-cover-violet', 'qz-cover-blue', 'qz-cover-teal', 'qz-cover-amber', 'qz-cover-pink'];

function stats(students, activities) {
  return {
    alunos: students.length,
    media: avg(students.filter(s => s.media != null).map(s => s.media)),
    participacao: avg(students.filter(s => s.participacao != null).map(s => s.participacao)),
    leituras: students.reduce((s, a) => s + (a.leituras_concluidas || 0), 0),
    corrigir: activities.reduce((s, a) => s + Math.max(0, (a.entregas || 0) - (a.corrigidas || 0) - (a.devolvidas || 0)), 0),
    abertas: activities.filter(a => !a.agendada && !a.encerrada).length
  };
}

function Overview({ allowed, report, activities }) {
  if (!allowed.length)
    return (
      <div className="ws-card ws-empty">
        <Users size={28} />
        <h3>Nenhuma turma atribuída</h3>
        <p>Peça ao administrador para vincular suas turmas.</p>
      </div>
    );
  return (
    <div className="cl-grid">
      {allowed.map((t, i) => {
        const s = stats(
          report.filter(a => a.turma === t.value),
          activities.filter(a => a.turma === t.value || a.turma === 'TODAS')
        );
        return (
          <Link key={t.value} to={'/admin/classes/' + encodeURIComponent(t.value)} className="cl-card">
            <div className={`cl-card-cover ${COVERS[i % COVERS.length]}`}>
              <span className="cl-card-icon">
                <Users size={20} />
              </span>
              <h2>{t.value}</h2>
              <p>{t.label.split(' - ')[1] || 'Turma'}</p>
              {s.corrigir > 0 && (
                <span className="cl-badge">
                  <Clock3 size={12} /> {s.corrigir} para corrigir
                </span>
              )}
            </div>
            <div className="cl-card-stats">
              <div>
                <strong>{s.alunos}</strong>
                <span>alunos</span>
              </div>
              <div>
                <strong className={`cl-num ${tone(s.media)}`}>{num(s.media)}</strong>
                <span>média</span>
              </div>
              <div>
                <strong>{s.participacao == null ? '—' : `${Math.round(s.participacao)}%`}</strong>
                <span>participação</span>
              </div>
            </div>
            <div className="cl-card-foot">
              <span>{s.abertas} atividade(s) aberta(s)</span>
              <span className="cl-go">
                Abrir turma <ArrowRight size={14} />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default function Classes() {
  const { turma } = useParams();
  const [params, setParams] = useSearchParams();
  const user = getUser();
  const allowed = TURMAS.filter(t => user.role === 'admin' || user.turmas?.includes(t.value));
  const valid = !turma || allowed.some(t => t.value === turma);
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [correcting, setCorrecting] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const tab = ['atividades', 'materiais'].includes(params.get('aba')) ? params.get('aba') : 'alunos';
  const setTab = value =>
    setParams(previous => {
      const next = new URLSearchParams(previous);
      value === 'alunos' ? next.delete('aba') : next.set('aba', value);
      return next;
    });

  const load = () => {
    setData(null);
    setFailed(false);
    if (!valid) return;
    Promise.all([api.get('/admin/reports', turma ? { params: { turma } } : undefined), api.get('/activities'), api.get('/materials')])
      .then(([r, a, m]) => setData({ report: r.data.alunos || [], activities: a.data || [], materials: m.data || [] }))
      .catch(() => setFailed(true));
  };

  useEffect(() => {
    setSearch('');
    load();
  }, [turma, valid]);

  const belongs = item => item.turma === turma || item.turma === 'TODAS';
  const students = (data?.report || []).filter(s => !turma || s.turma === turma);
  const activities = (data?.activities || []).filter(belongs);
  const materials = (data?.materials || []).filter(belongs);
  const s = stats(students, activities);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const r = await api.get('/admin/reports.pdf', { params: { turma }, responseType: 'blob', timeout: 60000 });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${normalize(turma).replace(/[^a-z0-9]+/g, '-')}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error('Não foi possível gerar o relatório.');
    } finally {
      setDownloading(false);
    }
  };

  const filteredStudents = students.filter(x => normalize(x.nome).includes(normalize(search))).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const filteredActivities = activities
    .filter(x => normalize(`${x.titulo} ${x.disciplina}`).includes(normalize(search)))
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  const filteredMaterials = materials.filter(x => normalize(`${x.titulo} ${x.disciplina}`).includes(normalize(search)));

  return (
    <DashboardLayout>
      {turma && (
        <Link className="ws-back" to="/admin/classes">
          <ArrowLeft size={15} /> Todas as turmas
        </Link>
      )}
      <PageIntro
        section={turma ? 'MINHAS TURMAS' : 'ENSINAR COMEÇA POR CONHECER'}
        title={turma || 'Minhas turmas'}
        description={turma ? 'Alunos, atividades e materiais da turma em um só lugar.' : 'Escolha uma turma para acompanhar participação, médias e entregas.'}
      >
        {turma && valid && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={downloading || !data} onClick={downloadPdf}>
              <FileDown size={16} /> {downloading ? 'Gerando…' : 'Relatório PDF'}
            </Button>
            <Button asChild className="qz-btn-primary">
              <Link to={'/admin/activities?nova=1&turma=' + encodeURIComponent(turma)}>
                <Plus size={16} /> Criar atividade
              </Link>
            </Button>
          </div>
        )}
      </PageIntro>

      {!valid ? (
        <div role="alert" className="ws-card ws-empty">
          <h3>Esta turma não está atribuída à sua conta.</h3>
        </div>
      ) : failed ? (
        <div role="alert" className="ws-card ws-empty">
          <h3>Não foi possível carregar as turmas</h3>
          <button className="underline font-semibold" onClick={load}>
            Tentar novamente
          </button>
        </div>
      ) : !data ? (
        <div className="ws-card ws-empty" role="status">
          <span className="cx-spinner mx-auto mb-3" /> Carregando suas turmas…
        </div>
      ) : !turma ? (
        <Overview allowed={allowed} report={data.report} activities={data.activities} />
      ) : (
        <>
          <section className="ws-kpis">
            <article className="ws-card ws-kpi is-featured">
              <span className="ws-kpi-icon">
                <TrendingUp size={18} />
              </span>
              <span>Média da turma</span>
              <strong>
                {num(s.media)}
                <small> /10</small>
              </strong>
              <p>{s.alunos} aluno(s)</p>
            </article>
            <article className="ws-card ws-kpi">
              <span className="ws-kpi-icon">
                <CheckCheck size={18} />
              </span>
              <span>Participação</span>
              <strong>
                {s.participacao == null ? '—' : Math.round(s.participacao)}
                <small>%</small>
              </strong>
              <p>Atividades entregues</p>
            </article>
            <article className="ws-card ws-kpi">
              <span className="ws-kpi-icon gb-warn">
                <Clock3 size={18} />
              </span>
              <span>Para corrigir</span>
              <strong>{s.corrigir}</strong>
              <p>Entregas aguardando nota</p>
            </article>
            <article className="ws-card ws-kpi">
              <span className="ws-kpi-icon">
                <BookOpen size={18} />
              </span>
              <span>Leituras concluídas</span>
              <strong>{s.leituras}</strong>
              <p>Livros lidos até o fim</p>
            </article>
          </section>

          <div className="ws-card ws-toolbar">
            <div className="ws-segment" role="tablist" aria-label="Conteúdo da turma">
              {[
                ['alunos', Users, 'Alunos', students.length],
                ['atividades', ClipboardList, 'Atividades', activities.length],
                ['materiais', PlayCircle, 'Materiais', materials.length]
              ].map(([key, Icon, label, n]) => (
                <button key={key} type="button" role="tab" aria-pressed={tab === key} aria-selected={tab === key} onClick={() => setTab(key)}>
                  <Icon size={15} /> {label} <span>{n}</span>
                </button>
              ))}
            </div>
            <label className="ws-search">
              <Search size={16} />
              <input aria-label="Buscar nesta turma" placeholder={tab === 'alunos' ? 'Buscar aluno…' : 'Buscar por título ou disciplina…'} value={search} onChange={e => setSearch(e.target.value)} />
            </label>
          </div>

          {tab === 'alunos' &&
            (filteredStudents.length ? (
              <div className="ws-card ws-table-wrap">
                <table className="ws-table">
                  <thead>
                    <tr>
                      <th>Aluno</th>
                      <th>Participação</th>
                      <th className="is-center">Leituras</th>
                      <th className="is-center">Resumos</th>
                      <th className="is-center">Produções</th>
                      <th className="is-center">Média</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(a => (
                      <tr key={a.id}>
                        <td>
                          <div className="ws-person">
                            <span className="ws-avatar">{initials(a.nome)}</span>
                            <div className="min-w-0">
                              <strong>{a.nome}</strong>
                              <small>
                                {a.atividades_entregues} de {a.atividades_disponiveis || 0} atividade(s)
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          {a.participacao == null ? (
                            <span className="rp-muted">Sem atividades</span>
                          ) : (
                            <div className="rp-part">
                              <span className="ws-meter">
                                <span style={{ width: `${a.participacao}%` }} />
                              </span>
                              <b>{a.participacao}%</b>
                            </div>
                          )}
                        </td>
                        <td className="is-center">{a.leituras_concluidas}</td>
                        <td className="is-center">{a.resumos}</td>
                        <td className="is-center">{a.producoes}</td>
                        <td className="is-center">
                          <span className={`ws-score ${tone(a.media)}`}>{num(a.media)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="ws-card ws-empty">
                <Users size={26} />
                <h3>{students.length ? 'Nenhum aluno encontrado' : 'Nenhum aluno nesta turma'}</h3>
                <p>{students.length ? 'Tente outra busca.' : 'Os alunos aparecem aqui quando se cadastram com esta turma.'}</p>
              </div>
            ))}

          {tab === 'atividades' &&
            (filteredActivities.length ? (
              <div className="cl-activities">
                {filteredActivities.map(a => {
                  const pending = Math.max(0, (a.entregas || 0) - (a.corrigidas || 0) - (a.devolvidas || 0));
                  const rate = s.alunos ? Math.min(100, Math.round(((a.entregas || 0) / s.alunos) * 100)) : 0;
                  return (
                    <article key={a.id} className="ws-card cl-activity">
                      <div className="cl-activity-head">
                        {a.disciplina && <SubjectBadge subject={a.disciplina} />}
                        <span className={`cl-state ${a.agendada ? 'is-scheduled' : a.encerrada ? 'is-closed' : 'is-open'}`}>
                          {a.agendada ? 'Agendada' : a.encerrada ? 'Encerrada' : 'Aberta'}
                        </span>
                      </div>
                      <h3>{a.titulo}</h3>
                      <p className="cl-activity-meta">
                        <CalendarClock size={13} /> Prazo {deadline(a.prazo)} · {a.perguntas?.length || 0} pergunta(s)
                        {a.turma === 'TODAS' ? ' · todas as turmas' : ''}
                      </p>
                      <div className="cl-delivery">
                        <div>
                          <span>Entregas</span>
                          <b>
                            {a.entregas || 0}/{s.alunos}
                          </b>
                        </div>
                        <span className="ws-meter">
                          <span style={{ width: `${rate}%` }} />
                        </span>
                      </div>
                      <div className="cl-activity-actions">
                        <Button className={pending ? 'qz-btn-primary' : ''} variant={pending ? 'default' : 'outline'} onClick={() => setCorrecting(a.id)}>
                          {pending ? `Corrigir ${pending}` : 'Ver respostas'}
                        </Button>
                        <Link to={'/admin/activities/' + a.id} className="ws-icon-btn" title="Gerenciar atividade" aria-label={`Gerenciar ${a.titulo}`}>
                          <ArrowRight size={16} />
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="ws-card ws-empty">
                <ClipboardList size={26} />
                <h3>Nenhuma atividade</h3>
                <p>Crie a primeira atividade para esta turma.</p>
              </div>
            ))}

          {tab === 'materiais' &&
            (filteredMaterials.length ? (
              <div className="cl-materials">
                {filteredMaterials.map(m => (
                  <Link key={m.id} to={'/videos#material-' + m.id} className="ws-card cl-material">
                    <span className="cl-material-icon">{m.video_id ? <PlayCircle size={20} /> : <FileText size={20} />}</span>
                    <span className="min-w-0">
                      <strong>{m.titulo}</strong>
                      <small>
                        {m.disciplina}
                        {m.turma === 'TODAS' ? ' · todas as turmas' : ''}
                      </small>
                    </span>
                    <ArrowRight size={16} className="cl-material-go" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="ws-card ws-empty">
                <PlayCircle size={26} />
                <h3>Nenhum material</h3>
                <p>Compartilhe vídeos e PDFs em Vídeos e materiais.</p>
              </div>
            ))}
        </>
      )}
      {correcting && <CorrectionDrawer activityId={correcting} onClose={() => setCorrecting(null)} onChanged={load} />}
    </DashboardLayout>
  );
}
