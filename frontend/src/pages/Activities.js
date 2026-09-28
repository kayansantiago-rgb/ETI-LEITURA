import { publicationLabel } from '@/lib/publication';
import ActivityLibrary from '@/components/ActivityLibrary';
import StatusBadge, { activityState } from '@/components/StatusBadge';
import EmptyCollection from '@/components/EmptyCollection';
import ActivityForm from '@/components/ActivityForm';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus,
  ClipboardList,
  ArrowRight,
  Award,
  Clock,
  TrendingUp,
  BarChart3,
  BookOpen,
  FileCheck
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';

export const deadline = value => (value ? new Date(value + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem prazo');
export const activityError = (e, fallback) => (typeof e.response?.data?.detail === 'string' ? e.response.data.detail : fallback);

export default function Activities() {
  const user = getUser();
  const admin = ['admin', 'teacher'].includes(user?.role);
  const [params] = useSearchParams();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState(() => admin && params.get('nova') === '1');
  const [tab, setTab] = useState('published');
  const [draft, setDraft] = useState(() =>
    params.get('turma')
      ? { titulo: '', valor_nota: 10, descricao: '', turma: params.get('turma'), perguntas: [{ enunciado: '', tipo: 'texto', alternativas: ['', ''] }] }
      : null
  );

  // Filtros de Engajamento
  const [selectedClassFilter, setSelectedClassFilter] = useState('TODAS');
  const [selectedActivityId, setSelectedActivityId] = useState('');

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

  const visibleItems = items.filter(a => !admin || (tab === 'scheduled' ? a.agendada : !a.agendada));

  // Métricas do Professor (KPIs)
  const totalElaborado = items.length;
  const totalEntregas = items.reduce((sum, a) => sum + (a.entregas || 0), 0);
  const totalCorrigidas = items.reduce((sum, a) => sum + (a.corrigidas || 0), 0);
  const aguardandoCorrecao = Math.max(0, totalEntregas - totalCorrigidas);
  const taxaCorrecao = totalEntregas > 0 ? Math.round((totalCorrigidas / totalEntregas) * 100) : 100;

  // Filtro de Engajamento das Turmas
  const filteredEngagementActivities = items.filter(
    a => selectedClassFilter === 'TODAS' || a.turma === selectedClassFilter || a.turma === 'TODAS'
  );

  const activeEngagementActivity =
    filteredEngagementActivities.find(a => a.id === selectedActivityId) || filteredEngagementActivities[0];

  const entregasAtuais = activeEngagementActivity?.entregas || 0;
  const totalEsperadoAlunos = 18; // Estimativa padrão por turma
  const taxaEntregaPercent = Math.min(100, Math.round((entregasAtuais / totalEsperadoAlunos) * 100));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Cabeçalho do Professor (Imagem de Referência de Hoje) */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ClipboardList size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                {admin ? 'Atividades Escolares' : 'Minhas atividades'}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {admin
                  ? 'Elabore tarefas escolares, gerencie agendamentos e avalie as entregas dos seus estudantes.'
                  : 'Veja as propostas dos professores, responda e acompanhe seu feedback.'}
              </p>
            </div>
          </div>

          {admin && !creating && (
            <Button
              onClick={() => { setDraft(null); setCreating(true); }}
              className="hero-library-btn !w-auto !py-2.5 !px-5"
            >
              <span>📝 ELABORAR ATIVIDADE</span>
            </Button>
          )}
        </div>

        {/* KPIs do Professor (3 Cards da Imagem de Referência) */}
        {admin && (
          <div className="teacher-kpi-grid">
            <div className="teacher-kpi-card">
              <div className="teacher-kpi-content">
                <span>TOTAL ELABORADO</span>
                <strong>{totalElaborado}</strong>
                <p>Tarefas ativas e programadas</p>
              </div>
              <div className="teacher-kpi-icon-badge purple">
                <FileCheck size={24} />
              </div>
            </div>

            <div className="teacher-kpi-card">
              <div className="teacher-kpi-content">
                <span>AGUARDANDO CORREÇÃO</span>
                <strong>{aguardandoCorrecao}</strong>
                <p>Entregas prontas para nota e feedback</p>
              </div>
              <div className="teacher-kpi-icon-badge amber">
                <Clock size={24} />
              </div>
            </div>

            <div className="teacher-kpi-card">
              <div className="teacher-kpi-content">
                <span>TAXA DE CORREÇÃO</span>
                <strong>{taxaCorrecao}%</strong>
                <p>Aproveitamento das correções docentes</p>
              </div>
              <div className="teacher-kpi-icon-badge purple">
                <TrendingUp size={24} />
              </div>
            </div>
          </div>
        )}

        {/* Card Engajamento das Turmas (Imagem de Referência de Hoje) */}
        {admin && (
          <section className="engagement-card">
            <div className="engagement-header">
              <div className="engagement-icon-badge">
                <BarChart3 size={22} />
              </div>
              <div className="engagement-title">
                <h2>
                  📊 Engajamento das Turmas
                </h2>
                <p>Acompanhe o progresso de entregas em tempo real.</p>
              </div>
            </div>

            <div className="engagement-filters-grid">
              <div className="engagement-select-group">
                <label htmlFor="select-class-filter">Selecionar Turma</label>
                <select
                  id="select-class-filter"
                  className="native-select"
                  value={selectedClassFilter}
                  onChange={e => setSelectedClassFilter(e.target.value)}
                >
                  <option value="TODAS">Todas as Turmas</option>
                  <option value="7º ANO">7º ANO</option>
                  <option value="8º ANO">8º ANO</option>
                  <option value="9º ANO">9º ANO</option>
                  <option value="1º SÉRIE A">1º SÉRIE A</option>
                  <option value="1º SÉRIE B">1º SÉRIE B</option>
                  <option value="2º SÉRIE">2º SÉRIE</option>
                  <option value="3º SÉRIE A">3º SÉRIE A</option>
                  <option value="3º SÉRIE B">3º SÉRIE B</option>
                </select>
              </div>

              <div className="engagement-select-group">
                <label htmlFor="select-activity-filter">Selecionar Atividade</label>
                <select
                  id="select-activity-filter"
                  className="native-select"
                  value={activeEngagementActivity?.id || ''}
                  onChange={e => setSelectedActivityId(e.target.value)}
                  disabled={!filteredEngagementActivities.length}
                >
                  {!filteredEngagementActivities.length && <option value="">Nenhuma atividade para esta turma</option>}
                  {filteredEngagementActivities.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.titulo} ({a.turma})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {activeEngagementActivity ? (
              <div className="engagement-rate-box">
                <div className="engagement-rate-info">
                  <span className="engagement-rate-label">
                    <BookOpen size={16} className="text-primary" /> Taxa de Entrega:
                  </span>
                  <span className="engagement-rate-value">
                    {taxaEntregaPercent}% ({entregasAtuais} de {totalEsperadoAlunos})
                  </span>
                </div>
                <div className="engagement-progress-track">
                  <div
                    className="engagement-progress-fill"
                    style={{ width: `${taxaEntregaPercent}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma atividade selecionada para análise de engajamento.</p>
            )}
          </section>
        )}

        {/* Abas e Lista de Atividades */}
        {admin && (
          <div className="flex flex-wrap gap-2 mb-4" aria-label="Área de atividades">
            <Button
              variant={tab === 'published' ? 'default' : 'outline'}
              aria-pressed={tab === 'published'}
              onClick={() => { setTab('published'); setCreating(false); }}
            >
              Publicadas ({items.filter(a => !a.agendada).length})
            </Button>
            <Button
              variant={tab === 'scheduled' ? 'default' : 'outline'}
              aria-pressed={tab === 'scheduled'}
              onClick={() => { setTab('scheduled'); setCreating(false); }}
            >
              Agendadas ({items.filter(a => a.agendada).length})
            </Button>
            <Button
              variant={tab === 'models' ? 'default' : 'outline'}
              aria-pressed={tab === 'models'}
              onClick={() => { setTab('models'); setCreating(false); }}
            >
              Meus modelos
            </Button>
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
        ) : (
          <>
            {creating && (
              <ActivityForm
                draft={draft}
                onCancel={() => setCreating(false)}
                onSaved={saved => {
                  setCreating(false);
                  setTab(saved.publicar_em && new Date(saved.publicar_em) > new Date() ? 'scheduled' : 'published');
                  load();
                }}
              />
            )}

            {loading ? (
              <p role="status" className="empty-state">Carregando atividades…</p>
            ) : failed ? (
              <div role="alert" className="empty-state">
                Não foi possível carregar. <button className="underline" onClick={load}>Tentar novamente</button>
              </div>
            ) : !visibleItems.length ? (
              <EmptyCollection
                icon={ClipboardList}
                title={admin ? (tab === 'scheduled' ? 'Seu planejamento, no tempo certo.' : 'Sua próxima proposta começa aqui.') : 'Novas propostas estão a caminho.'}
                description={admin ? (tab === 'scheduled' ? 'Ao criar uma atividade, escolha Agendar publicação para definir quando os alunos poderão acessar.' : 'Prepare uma atividade, escolha a turma e acompanhe cada resposta.') : 'As atividades dos seus professores vão aparecer neste espaço.'}
                action={admin ? 'Criar primeira atividade' : undefined}
                onAction={() => { setDraft(null); setCreating(true); }}
              />
            ) : (
              <div className="activity-collection">
                {visibleItems.map(a => (
                  <article key={a.id} className="panel flex flex-col">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="activity-badge">{a.turma === 'TODAS' ? 'Todas as turmas' : a.turma}</span>
                      <StatusBadge state={activityState(a, admin)} label={admin && !a.agendada && a.encerrada ? 'Encerrada' : undefined} />
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="activity-score-badge">
                        <Award size={13} /> {a.minha_resposta?.nota != null ? `Nota: ${a.minha_resposta.nota.toFixed(1)}/${a.valor_nota || 10}` : `Valor: ${(a.valor_nota || 10).toFixed(1)} pts`}
                      </span>
                    </div>

                    <h2 className="text-lg font-semibold mb-2">{a.titulo}</h2>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{a.descricao || `${a.perguntas.length} pergunta(s) para responder.`}</p>

                    <div className="text-xs text-muted-foreground space-y-1.5 mt-auto pt-3 border-t">
                      <p>Prazo: {deadline(a.minha_resposta?.reenvio?.prazo || a.prazo)}</p>
                      {a.agendada && <p className="text-primary font-medium">Publicação: {publicationLabel(a.publicar_em)} (Brasília)</p>}
                      <p>{admin ? `${a.entregas} entrega(s) · ${a.corrigidas} corrigida(s)${a.devolvidas ? ` · ${a.devolvidas} devolvida(s)` : ''}` : `Professor: ${a.professor_nome}`}</p>
                    </div>

                    <Button asChild variant="outline" className="mt-4">
                      <Link to={`${admin ? '/admin/activities' : '/activities'}/${a.id}`}>
                        {admin ? 'Ver respostas e corrigir' : a.minha_resposta ? 'Ver minha resposta' : 'Abrir atividade'}
                        <ArrowRight size={15} />
                      </Link>
                    </Button>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
