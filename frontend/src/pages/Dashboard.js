import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { BookOpen, FileText, ArrowRight, CheckCircle2, ClipboardList, MessageSquare, Video, Calendar, Sparkles } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import BookCard from '@/components/BookCard';
import StudentDiscovery from '@/components/StudentDiscovery';
import StatusBadge, { activityState } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';
import { deadline } from '@/pages/Activities';

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
  const materials = Array.isArray(data?.materials) ? data.materials : [];

  const progress = books.filter(b => b.progress > 0 && b.progress < 100);
  const pending = activities
    .filter(a => a.pode_reenviar || (!a.encerrada && !a.minha_resposta))
    .map(a => ({ ...a, prazo: a.minha_resposta?.reenvio?.prazo || a.prazo }))
    .sort((a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999'));

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const due = pending.filter(
    a => a.prazo && a.prazo >= today && (new Date(a.prazo + 'T12:00:00') - new Date(today + 'T12:00:00')) / 86400000 <= 7
  );

  const comments = (data?.grades?.notas || [])
    .filter(n => n.feedback?.trim())
    .sort((a, b) => (b.updated_at || b.data || '').localeCompare(a.updated_at || a.data || ''))
    .slice(0, 3);

  const next = pending[0]
    ? {
        title: pending[0].titulo,
        detail: `Atividade · ${deadline(pending[0].prazo)}`,
        path: '/activities/' + pending[0].id,
        action: 'Abrir atividade',
        Icon: ClipboardList
      }
    : progress[0]
    ? {
        title: progress[0].titulo,
        detail: 'Continue a leitura de onde parou.',
        path: '/book/' + progress[0].id,
        action: 'Continuar leitura',
        Icon: BookOpen
      }
    : materials[0]
    ? {
        title: materials[0].titulo,
        detail: materials[0].disciplina,
        path: '/videos#material-' + materials[0].id,
        action: 'Abrir material',
        Icon: Video
      }
    : {
        title: 'Encontre sua próxima leitura',
        detail: 'Explore os livros disponíveis para você.',
        path: '/library',
        action: 'Explorar biblioteca',
        Icon: BookOpen
      };

  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(new Date());

  return (
    <DashboardLayout>
      <div className="student-home" data-testid="dashboard-page">
        {/* Header de Boas-Vindas */}
        <header className="student-heading">
          <div className="student-heading-info">
            <span className="student-date-badge">
              <Calendar size={12} />
              {formattedDate}
            </span>
            <h1>
              Olá, {user?.nome?.split(' ')[0] || 'Leitor'}
              <span className="title-dot" aria-hidden="true">
                .
              </span>
            </h1>
            <p className="student-welcome">Qual história vai fazer parte do seu dia hoje?</p>
          </div>
          <Link to="/workspace" className="student-pending-link">
            <span>Ver minhas pendências</span>
            <ArrowRight size={16} />
          </Link>
        </header>

        {loading ? (
          <div className="panel p-8 text-center text-muted-foreground" role="status">
            <Sparkles className="animate-spin inline-block mb-2" size={24} />
            <p>Preparando seu espaço de estudo com carinho…</p>
          </div>
        ) : (
          <>
            {!!data?.failed.length && (
              <div role="alert" className="panel mb-5 text-sm border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                Algumas informações não puderam ser carregadas.{' '}
                <button className="underline font-semibold" onClick={load}>
                  Tentar novamente
                </button>
              </div>
            )}

            {/* Destaque / Descoberta */}
            <StudentDiscovery
              books={books}
              posts={Array.isArray(data?.mural) ? data.mural : []}
              progress={progress}
            />

            {/* Grid de Prioridade: O Que Estudar Agora & Prazos Próximos */}
            <div className="student-priority-grid">
              <section className="next-study">
                <span className="next-study-eyebrow">O QUE ESTUDAR AGORA</span>
                <div className="next-study-content">
                  <span className="next-study-icon">
                    <next.Icon size={28} />
                  </span>
                  <div className="next-study-text">
                    <h2>{next.title}</h2>
                    <p>{next.detail}</p>
                  </div>
                </div>
                <Button asChild className="w-full sm:w-auto">
                  <Link to={next.path}>
                    {next.action}
                    <ArrowRight size={16} />
                  </Link>
                </Button>
              </section>

              <section className="student-deadlines">
                <div className="section-heading-row">
                  <h2>Prazos próximos</h2>
                  <span className="deadline-badge-pill">Próximos 7 dias</span>
                </div>
                {data?.failed.includes('activities') ? (
                  <p className="text-sm text-muted-foreground">Prazos indisponíveis no momento.</p>
                ) : due.length ? (
                  <div className="compact-rows">
                    {due.slice(0, 3).map(a => (
                      <Link to={'/activities/' + a.id} key={a.id} className="deadline-item-row">
                        <div className="min-w-0 flex-1">
                          <span className="deadline-item-title">{a.titulo}</span>
                          <span className={a.prazo === today ? 'deadline-tag-today' : 'deadline-tag-soon'}>
                            {a.prazo === today ? 'Entrega hoje!' : deadline(a.prazo)}
                          </span>
                        </div>
                        <ArrowRight size={16} className="text-muted-foreground shrink-0" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground p-2 text-center">
                    Tudo em dia! Nenhuma entrega pendente nos próximos 7 dias. 🎉
                  </p>
                )}
              </section>
            </div>

            {/* Grid de Trabalho: Atividades & Comentários do Professor */}
            <div className="student-work-grid">
              <section className="space-y-4">
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
                      .map(a => (
                        <Link className="student-activity-row" to={'/activities/' + a.id} key={a.id}>
                          <span className="activity-row-icon">
                            <ClipboardList size={20} />
                          </span>
                          <div className="activity-row-info">
                            <h3>{a.titulo}</h3>
                            <p>
                              {a.disciplina || 'Atividade de leitura'} · {deadline(a.prazo)}
                            </p>
                            <StatusBadge state={activityState(a)} />
                          </div>
                          <ArrowRight size={16} className="text-muted-foreground shrink-0" />
                        </Link>
                      ))}
                  </div>
                ) : (
                  <p className="panel text-sm text-muted-foreground">
                    Suas atividades aparecerão aqui quando o professor publicar.
                  </p>
                )}
              </section>

              <section className="space-y-4">
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
                        <Link to={n.link || '/gradebook#grade-' + n.id} className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
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

            {/* Biblioteca / Continue de Onde Parou */}
            <section className="student-reading">
              <div className="section-heading">
                <h2 className="text-xl font-bold">
                  {progress.length ? 'Continue de onde parou' : 'Biblioteca para explorar'}
                </h2>
                <Link to="/library" className="text-sm font-semibold text-primary hover:underline">
                  Ver biblioteca completa →
                </Link>
              </div>
              {books.length ? (
                <div className="student-book-grid">
                  {(progress.length ? progress : books).slice(0, 3).map(book => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </div>
              ) : (
                <p className="panel text-sm text-muted-foreground">
                  {data?.failed.includes('books')
                    ? 'Acervo indisponível no momento.'
                    : 'Os livros publicados pela escola aparecerão aqui.'}
                </p>
              )}
            </section>

            {/* Resumo de Leituras / Stats */}
            <section className="student-summary" aria-label="Minha leitura">
              {[
                [BookOpen, 'Livros disponíveis', data?.stats?.total_books ?? '—', '/library'],
                [FileText, 'Resumos escritos', data?.stats?.my_summaries ?? '—', '/summaries'],
                [
                  CheckCircle2,
                  'Leituras concluídas',
                  data?.failed.includes('books')
                    ? '—'
                    : books.filter(b => b.progress === 100).length,
                  '/library'
                ]
              ].map(([Icon, label, value, path]) => (
                <Link to={path} key={label}>
                  <div className="summary-stat-icon">
                    <Icon size={22} />
                  </div>
                  <div className="summary-stat-text">
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                </Link>
              ))}
            </section>

            {/* Mural da Escola */}
            {!!data?.mural?.length && (
              <details className="student-mural group">
                <summary className="cursor-pointer text-sm font-bold text-muted-foreground hover:text-foreground py-2 flex items-center gap-2">
                  <span>Mural da escola</span>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{data.mural.length}</span>
                </summary>
                <div className="grid sm:grid-cols-3 gap-4 mt-4">
                  {data.mural.slice(0, 3).map(post => (
                    <article key={post.id} className="panel hover:border-primary/40 transition-colors">
                      {post.tipo === 'foto' ? (
                        <img
                          src={post.url_media}
                          alt={post.titulo}
                          className="w-full aspect-video object-cover rounded-lg mb-3"
                          loading="lazy"
                        />
                      ) : (
                        <a
                          href={post.url_media}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary text-sm font-semibold flex items-center gap-1 mb-2"
                        >
                          Assistir ao vídeo ↗
                        </a>
                      )}
                      <h3 className="font-bold text-sm mb-1">{post.titulo}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{post.descricao}</p>
                    </article>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
