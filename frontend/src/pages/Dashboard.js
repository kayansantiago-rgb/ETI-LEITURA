import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  FileText,
  ArrowRight,
  ClipboardList,
  MessageSquare,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Award
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import StudentDiscovery from '@/components/StudentDiscovery';
import ReadingJourney from '@/components/ReadingJourney';
import InstallApp from '@/components/InstallApp';
import TeacherHome from '@/components/TeacherHome';
import HomeLoader from '@/components/HomeLoader';
import ClassRanking from '@/components/ClassRanking';
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

  if (staff)
    return (
      <DashboardLayout>
        <div data-testid="dashboard-page">
          <TeacherHome />
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <div className="student-home" data-testid="dashboard-page">
        {loading ? (
          <HomeLoader />
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

            <ReadingJourney />

            <InstallApp />

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

            <ClassRanking limit={5} compact />

          </>
        )}
      </div>
    </DashboardLayout>
  );
}
