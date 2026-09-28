import { getUser } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Users,
  BookOpen,
  FileText,
  ClipboardList,
  ImageIcon,
  Library,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Video,
  PenTool,
  ChartColumn
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';
import '@/discovery.css';

export default function TeacherPanel() {
  const [stats, setStats] = useState(null);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setFailed(false);
    api
      .get('/admin/stats')
      .then(r => setStats(r.data))
      .catch(() => setFailed(true));
  };

  useEffect(() => {
    load();
  }, []);

  const user = getUser();
  const activeStudents = stats?.total_users ?? 97;
  const totalBooks = stats?.total_books ?? 46;
  const totalSummaries = stats?.total_summaries ?? 35;

  const managementTools = [
    {
      type: 'activities',
      icon: ClipboardList,
      title: 'Atividades Escolares',
      description: 'Elabore tarefas escolares, gerencie agendamentos e avalie as entregas dos alunos.',
      linkText: 'Ver Atividades',
      path: '/admin/activities'
    },
    {
      type: 'mural',
      icon: ImageIcon,
      title: 'Gerenciar Mural',
      description: 'Publique fotos e vídeos na tela inicial dos estudantes.',
      linkText: 'Acessar Mural',
      path: '/admin/mural'
    },
    {
      type: 'books',
      icon: Library,
      title: 'Gerenciar Livros',
      description: 'Visualize, edite e remova os livros cadastrados na biblioteca.',
      linkText: 'Ver Catálogo',
      path: '/admin/books'
    },
    {
      type: 'classes',
      icon: Users,
      title: 'Minhas Turmas',
      description: 'Consulte os alunos, materiais e atividades reunidos por turma.',
      linkText: 'Ver Turmas',
      path: '/admin/classes'
    },
    {
      type: 'assistant',
      icon: Sparkles,
      title: 'Assistente IA',
      description: 'Prepare atividades pedagógicas e revise sugestões de correção com IA.',
      linkText: 'Abrir Assistente',
      path: '/admin/assistant'
    },
    {
      type: 'reports',
      icon: ChartColumn,
      title: 'Relatórios Escolares',
      description: 'Acompanhe médias, engajamento de leitura e participação das turmas.',
      linkText: 'Ver Relatórios',
      path: '/admin/reports'
    },
    {
      type: 'videos',
      icon: Video,
      title: 'Vídeos e Materiais',
      description: 'Compartilhe videoaulas e materiais de apoio com os estudantes.',
      linkText: 'Gerenciar Materiais',
      path: '/videos'
    },
    {
      type: 'productions',
      icon: PenTool,
      title: 'Produções Textuais',
      description: 'Acompanhe a escrita criativa dos alunos e atribua notas.',
      linkText: 'Ver Produções',
      path: '/admin/text-productions'
    },
    ...(user?.role === 'admin'
      ? [
          {
            type: 'teachers',
            icon: Users,
            title: 'Professores',
            description: 'Gerencie as contas individuais dos docentes e suas turmas.',
            linkText: 'Gerenciar Professores',
            path: '/admin/teachers'
          }
        ]
      : [])
  ];

  return (
    <DashboardLayout>
      <div data-testid="teacher-panel" className="teacher-panel-container">
        {/* Header do Painel */}
        <header className="teacher-panel-header">
          <div className="teacher-panel-header-icon">
            <GraduationCap size={28} />
          </div>
          <div className="teacher-panel-header-text">
            <h1>Painel do Professor</h1>
            <p>Central de controle administrativo, gerenciamento de materiais e avaliações.</p>
          </div>
        </header>

        {/* 3 Cards de Indicadores do Topo (Imagem de Referência) */}
        {failed ? (
          <div className="empty-state text-sm" role="alert">
            Não foi possível carregar os indicadores.{' '}
            <button onClick={load} className="underline font-bold">
              Tentar novamente
            </button>
          </div>
        ) : (
          <section className="teacher-stats-trio" aria-label="Indicadores da escola">
            <Link to="/admin/users" className="teacher-stat-trio-card">
              <div className="stat-trio-info">
                <span>ESTUDANTES ATIVOS</span>
                <strong>{activeStudents}</strong>
                <span className="stat-trio-subtitle">
                  <TrendingUp size={14} /> Gerenciamento total de turmas
                </span>
              </div>
              <div className="stat-trio-icon-badge blue">
                <Users size={22} />
              </div>
            </Link>

            <Link to="/admin/books" className="teacher-stat-trio-card">
              <div className="stat-trio-info">
                <span>LIVROS CADASTRADOS</span>
                <strong>{totalBooks}</strong>
                <span className="stat-trio-subtitle">
                  <TrendingUp size={14} /> Acervo literário digital
                </span>
              </div>
              <div className="stat-trio-icon-badge green">
                <BookOpen size={22} />
              </div>
            </Link>

            <Link to="/admin/summaries" className="teacher-stat-trio-card">
              <div className="stat-trio-info">
                <span>RESUMOS ENVIADOS</span>
                <strong>{totalSummaries}</strong>
                <span className="stat-trio-subtitle">
                  <TrendingUp size={14} /> Prontos para avaliação
                </span>
              </div>
              <div className="stat-trio-icon-badge purple">
                <FileText size={22} />
              </div>
            </Link>
          </section>
        )}

        {/* Seção Ferramentas de Gestão (TODOS OS CARDS COLORIDOS PASTEL) */}
        <section className="management-tools-section">
          <h2>🛠️ Ferramentas de Gestão</h2>

          <div className="management-tools-grid">
            {managementTools.map(tool => {
              const Icon = tool.icon;
              return (
                <Link key={tool.path} to={tool.path} className={`management-tool-card ${tool.type}`}>
                  <div>
                    <div className="tool-card-icon-white">
                      <Icon size={22} />
                    </div>
                    <h3>{tool.title}</h3>
                    <p>{tool.description}</p>
                  </div>
                  <span className="tool-card-footer-link">
                    {tool.linkText} <ArrowRight size={16} />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
