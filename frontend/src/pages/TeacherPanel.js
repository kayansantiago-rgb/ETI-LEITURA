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

  const secondaryTools = [
    { icon: Users, title: 'Minhas turmas', description: 'Alunos, atividades e materiais por turma.', path: '/admin/classes' },
    { icon: Sparkles, title: 'Assistente IA', description: 'Prepare atividades e revise sugestões com IA.', path: '/admin/assistant' },
    { icon: ChartColumn, title: 'Relatórios', description: 'Métricas de leitura e participação dos alunos.', path: '/admin/reports' },
    { icon: Video, title: 'Vídeos e materiais', description: 'Aulas e materiais de apoio da escola.', path: '/videos' },
    { icon: PenTool, title: 'Produções textuais', description: 'Acompanhe a escrita e faça as correções.', path: '/admin/text-productions' },
    ...(user?.role === 'admin'
      ? [{ icon: Users, title: 'Professores', description: 'Gerenciar contas e permissões docentes.', path: '/admin/teachers' }]
      : [])
  ];

  return (
    <DashboardLayout>
      <div data-testid="teacher-panel" className="teacher-panel-container">
        {/* Header do Painel (Imagem de Referência de Hoje) */}
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

        {/* Seção Ferramentas de Gestão (3 Cards Coloridos Pastel) */}
        <section className="management-tools-section">
          <h2>🛠️ Ferramentas de Gestão</h2>

          <div className="management-tools-grid">
            {/* Card 1: Atividades Escolares (Creme / Amarelo Pastel) */}
            <Link to="/admin/activities" className="management-tool-card activities">
              <div>
                <div className="tool-card-icon-white">
                  <ClipboardList size={22} />
                </div>
                <h3>Atividades Escolares</h3>
                <p>Elabore tarefas escolares, gerencie agendamentos e avalie as entregas dos alunos.</p>
              </div>
              <span className="tool-card-footer-link">
                Ver Atividades <ArrowRight size={16} />
              </span>
            </Link>

            {/* Card 2: Gerenciar Mural (Azul / Lavanda Soft) */}
            <Link to="/admin/mural" className="management-tool-card mural">
              <div>
                <div className="tool-card-icon-white">
                  <ImageIcon size={22} />
                </div>
                <h3>Gerenciar Mural</h3>
                <p>Publique fotos e vídeos na tela inicial dos estudantes.</p>
              </div>
              <span className="tool-card-footer-link">
                Acessar Mural <ArrowRight size={16} />
              </span>
            </Link>

            {/* Card 3: Gerenciar Livros (Menta / Verde Água Soft) */}
            <Link to="/admin/books" className="management-tool-card books">
              <div>
                <div className="tool-card-icon-white">
                  <Library size={22} />
                </div>
                <h3>Gerenciar Livros</h3>
                <p>Visualize, edite e remova os livros cadastrados na biblioteca.</p>
              </div>
              <span className="tool-card-footer-link">
                Ver Catálogo <ArrowRight size={16} />
              </span>
            </Link>
          </div>
        </section>

        {/* Demais Ferramentas Auxiliares */}
        <section className="space-y-3 pt-2">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
            Outras Áreas de Gestão
          </h2>

          <div className="other-tools-grid">
            {secondaryTools.map(({ icon: Icon, title, description, path }) => (
              <Link key={path} to={path} className="other-tool-row">
                <div className="other-tool-icon">
                  <Icon size={18} />
                </div>
                <div className="other-tool-info">
                  <h4>{title}</h4>
                  <p>{description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
