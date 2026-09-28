import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  BookOpen,
  FileText,
  ArrowRight,
  ClipboardList,
  MessageSquare,
  Sparkles,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Award
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import StudentDiscovery from '@/components/StudentDiscovery';
import StatusBadge, { activityState } from '@/components/StatusBadge';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';
import { deadline } from '@/pages/Activities';
import '@/discovery.css';

// Componente do Widget de Calendário (Imagem de Referência 3)
function InteractiveCalendar({ pendingActivities = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const todayDateNum = new Date().getDate();
  const isCurrentMonth = new Date().getMonth() === month && new Date().getFullYear() === year;

  // Dias com prazo de entrega
  const deadlineDays = new Set(
    pendingActivities
      .filter(a => a.prazo)
      .map(a => {
        const d = new Date(a.prazo + 'T12:00:00');
        return d.getMonth() === month && d.getFullYear() === year ? d.getDate() : null;
      })
      .filter(Boolean)
  );

  const daysArray = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    daysArray.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    daysArray.push(day);
  }

  return (
    <div className="calendar-widget-card">
      <div className="calendar-header">
        <h2>
          <CalendarIcon size={18} className="text-primary" /> Agenda
        </h2>
        <div className="flex items-center gap-2">
          <button
            className="p-1 hover:bg-accent rounded-full text-muted-foreground"
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="calendar-month-name">{monthName}</span>
          <button
            className="p-1 hover:bg-accent rounded-full text-muted-foreground"
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="calendar-grid-days" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center', alignItems: 'center' }}>

        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dayStr, idx) => (
          <div key={idx} className="calendar-weekday-header">
            {dayStr}
          </div>
        ))}

        {daysArray.map((dayNum, idx) => {
          if (!dayNum) return <div key={idx} className="calendar-day-cell empty" />;
          const isToday = isCurrentMonth && dayNum === todayDateNum;
          const hasDeadline = deadlineDays.has(dayNum);

          return (
            <div
              key={idx}
              className={`calendar-day-cell ${isToday ? 'today' : ''} ${hasDeadline ? 'has-deadline' : ''}`}
              title={isToday ? 'Hoje' : hasDeadline ? 'Entrega de atividade' : undefined}
            >
              {dayNum}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const user = getUser();
  const staff = ['admin', 'teacher'].includes(user?.role);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const paths = {
      stats: '/stats',
      books: '/books',
      activities: '/activities',
      grades: '/gradebook',
      materials: '/materials',
      mural: '/mural'
    };
    const entries = Object.entries(paths);
    const results = await Promise.allSettled(entries.map(([, path]) => api.get(path)));
    const next = { failed: [] };
    results.forEach((r, i) => {
      const key = entries[i][0];
      if (r.status === 'fulfilled') next[key] = r.value.data;
      else next.failed.push(key);
    });
    setData(next);
    setLoading(false);
  };

  useEffect(() => {
    if (!staff) load();
  }, [staff]);

  if (staff) return <Navigate to="/admin/professor" replace />;

  const books = Array.isArray(data?.books) ? data.books : [];
  const activities = Array.isArray(data?.activities) ? data.activities : [];

  const progress = books.filter(b => b.progress > 0 && b.progress < 100);
  const currentBook = progress[0] || books[0];

  const pending = activities
    .filter(a => a.pode_reenviar || (!a.encerrada && !a.minha_resposta))
    .map(a => ({ ...a, prazo: a.minha_resposta?.reenvio?.prazo || a.prazo }))
    .sort((a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999'));

  const comments = (data?.grades?.notas || [])
    .filter(n => n.feedback?.trim())
    .sort((a, b) => (b.updated_at || b.data || '').localeCompare(a.updated_at || a.data || ''))
    .slice(0, 3);

  // Livros adicionados recentemente (últimos 3 cadastrados)
  const recentBooks = [...books].reverse().slice(0, 3);

  return (
    <DashboardLayout>
      <div className="student-home" data-testid="dashboard-page">
        {loading ? (
          <div className="panel p-12 text-center text-muted-foreground" role="status">
            <Sparkles className="animate-spin inline-block mb-3 text-primary" size={28} />
            <p className="font-semibold text-base">Preparando seu espaço de estudo com carinho…</p>
          </div>
        ) : (
          <>
            {!!data?.failed.length && (
              <div role="alert" className="panel mb-4 text-sm border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                Algumas informações não puderam ser carregadas.{' '}
                <button className="underline font-semibold" onClick={load}>
                  Tentar novamente
                </button>
              </div>
            )}

            {/* Topo: Saudação e Carrossel Timeline (Imagem de Referência 4) */}
            <StudentDiscovery
              books={books}
              posts={Array.isArray(data?.mural) ? data.mural : []}
              stats={data?.stats || {}}
            />

            {/* Seção Central: Continuar Leitura + Recentes & Calendário (Imagem de Referência 3) */}
            <div className="study-section-grid">
              {/* Card Esquerdo: Continuar Leitura & Lançamentos */}
              <section className="reading-shelf-card">
                {/* Continuar Leitura */}
                <div className="space-y-3">
                  <span className="shelf-section-title">
                    <span>📖</span> CONTINUAR LEITURA
                  </span>

                  {currentBook ? (
                    <Link to={`/reader/${currentBook.id}`} className="continue-reading-banner block group">
                      <img
                        src={currentBook.capa_url || '/placeholder-cover.png'}
                        alt={currentBook.titulo}
                        className="continue-reading-cover"
                      />
                      <div className="continue-reading-info">
                        <h3>{currentBook.titulo}</h3>
                        <p>{currentBook.autor || 'Autor não informado'}</p>
                        <div className="continue-progress-row">
                          <div className="continue-progress-bar">
                            <div
                              className="continue-progress-fill"
                              style={{ width: `${Math.round(currentBook.progress || 0)}%` }}
                            />
                          </div>
                          <span className="continue-progress-percent">
                            {Math.round(currentBook.progress || 0)}%
                          </span>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <p className="text-xs text-muted-foreground p-3">Nenhum livro em andamento no momento.</p>
                  )}
                </div>

                {/* Adicionados Recentemente */}
                <div className="space-y-3">
                  <span className="shelf-section-title">
                    <span>✨</span> ADICIONADOS RECENTEMENTE
                  </span>

                  <div className="recent-books-scroll">
                    {recentBooks.map(b => (
                      <Link to={`/book/${b.id}`} key={b.id} className="recent-book-item">
                        <img
                          src={b.capa_url || '/placeholder-cover.png'}
                          alt={b.titulo}
                          className="recent-book-cover"
                        />
                        <span className="recent-book-title">{b.titulo}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>

              {/* Card Direito: Widget de Calendário Interativo */}
              <section>
                <InteractiveCalendar pendingActivities={pending} />
              </section>
            </div>

            {/* Grid de Atividades & Comentários do Professor (SEM DISCIPLINA, COM VALOR DA NOTA) */}
            <div className="student-work-grid">
              {/* Atividades do Aluno */}
              <section className="space-y-3">
                <div className="section-heading-row">
                  <h2 className="text-lg font-bold">Minhas atividades</h2>
                  <Link to="/activities" className="text-xs text-primary font-semibold hover:underline">
                    Ver todas →
                  </Link>
                </div>

                {data?.failed.includes('activities') ? (
                  <p className="panel text-sm">Não foi possível consultar as atividades.</p>
                ) : activities.length ? (
                  <div className="student-activity-list">
                    {[...pending, ...activities.filter(a => !pending.some(p => p.id === a.id))]
                      .slice(0, 4)
                      .map(a => {
                        const scoreValue =
                          a.minha_resposta?.nota != null
                            ? `Nota: ${a.minha_resposta.nota}/10`
                            : 'Vale 10,0 pts';

                        return (
                          <Link className="student-activity-row" to={'/activities/' + a.id} key={a.id}>
                            <span className="activity-row-icon">
                              <ClipboardList size={20} />
                            </span>
                            <div className="activity-row-info">
                              <h3>{a.titulo}</h3>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="activity-score-badge">
                                  <Award size={12} /> {scoreValue}
                                </span>
                                <span className="text-xs text-muted-foreground">• {deadline(a.prazo)}</span>
                              </div>
                              <StatusBadge state={activityState(a)} />
                            </div>
                            <ArrowRight size={16} className="text-muted-foreground shrink-0" />
                          </Link>
                        );
                      })}
                  </div>
                ) : (
                  <p className="panel text-sm text-muted-foreground">
                    Suas atividades aparecerão aqui quando o professor publicar.
                  </p>
                )}
              </section>

              {/* Comentários do Professor */}
              <section className="space-y-3">
                <div className="section-heading-row">
                  <h2 className="text-lg font-bold">Comentários do professor</h2>
                  <MessageSquare size={18} className="text-primary" />
                </div>

                {data?.failed.includes('grades') ? (
                  <p className="panel text-sm">Não foi possível consultar os comentários.</p>
                ) : comments.length ? (
                  <div className="feedback-list">
                    {comments.map(n => (
                      <article className="feedback-card" key={n.id}>
                        <div className="feedback-card-header">
                          <h3>{n.titulo}</h3>
                          <span className="text-xs text-muted-foreground shrink-0">{deadline(n.data)}</span>
                        </div>
                        <p className="feedback-excerpt">"{n.feedback}"</p>
                        <Link
                          to={n.link || '/gradebook#grade-' + n.id}
                          className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                        >
                          Ver correção completa <ArrowRight size={12} />
                        </Link>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="panel text-sm text-muted-foreground">
                    Os comentários dos professores aparecerão assim que suas atividades forem corrigidas.
                  </p>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
