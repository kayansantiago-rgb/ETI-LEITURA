import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, BookOpen, FileText, ClipboardList, ImageIcon, Library, ArrowUpRight, Sparkles, Video, PenTool, ChartColumn, Clock, Calendar, Trophy, UserCog } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import PageIntro from '@/components/PageIntro';
import { Skeleton } from '@/components/Skeleton';
import BackupCard from '@/components/BackupCard';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';

// Todas as ferramentas do professor, organizadas pelo que ele quer fazer.
export default function TeacherPanel() {
  const user = getUser();
  const admin = user?.role === 'admin';
  const [stats, setStats] = useState(null);
  const [work, setWork] = useState(null);

  useEffect(() => {
    api
      .get('/admin/stats')
      .then(r => setStats(r.data))
      .catch(() => setStats({}));
    api
      .get('/workspace')
      .then(r => setWork(r.data))
      .catch(() => setWork({ atividades: [], correcoes: [] }));
  }, []);

  const pendingActivities = (work?.atividades || []).reduce((s, a) => s + (a.corrigir || 0), 0);
  const pendingTexts = Object.fromEntries((work?.correcoes || []).map(c => [c.link, c.quantidade]));
  const pendingTotal = pendingActivities + Object.values(pendingTexts).reduce((s, n) => s + n, 0);

  const groups = [
    [
      'Ensinar',
      'Prepare e publique conteúdo para as turmas.',
      [
        [ClipboardList, 'Atividades', 'Crie, agende e acompanhe tarefas.', '/admin/activities', 'violet', work ? `${(work.atividades || []).length} publicadas` : null],
        [Sparkles, 'Quizzes', 'Desafios de múltipla escolha com ranking.', '/quizzes', 'pink'],
        [Video, 'Vídeos e materiais', 'Videoaulas e PDFs de apoio.', '/videos', 'blue'],
        [Library, 'Livros', 'Envie PDFs e escolha quais turmas leem.', '/admin/books', 'teal', stats ? `${stats.total_books ?? 0} no acervo` : null]
      ]
    ],
    [
      'Acompanhar',
      'Corrija, veja o progresso e encontre quem precisa de ajuda.',
      [
        [Clock, 'Pendências de correção', 'Tudo o que aguarda nota, em um só lugar.', '/workspace', 'amber', work ? (pendingTotal ? `${pendingTotal} para corrigir` : 'Tudo corrigido') : null, pendingTotal > 0],
        [Users, 'Minhas turmas', 'Médias, participação e histórico dos alunos.', '/admin/classes', 'violet', stats ? `${stats.total_users ?? 0} alunos` : null],
        [FileText, 'Resumos', 'Resumos de livros enviados pelos alunos.', '/admin/summaries', 'blue', pendingTexts['/admin/summaries'] ? `${pendingTexts['/admin/summaries']} sem nota` : null, !!pendingTexts['/admin/summaries']],
        [PenTool, 'Produções textuais', 'Textos autorais para avaliar.', '/admin/text-productions', 'pink', pendingTexts['/admin/text-productions'] ? `${pendingTexts['/admin/text-productions']} sem nota` : null, !!pendingTexts['/admin/text-productions']],
        [ChartColumn, 'Relatórios', 'Evolução das médias e PDF da turma.', '/admin/reports', 'teal'],
        [Trophy, 'Ranking de leitores', 'Quem mais leu em cada turma.', '/ranking', 'amber']
      ]
    ],
    [
      'Escola',
      'Comunicação e organização da escola.',
      [
        [ImageIcon, 'Mural', 'Fotos e vídeos na página inicial.', '/admin/mural', 'pink'],
        [Calendar, 'Calendário', 'Eventos e prazos das atividades.', '/admin/calendar', 'blue'],
        ...(admin
          ? [
              [UserCog, 'Professores', 'Contas e turmas de cada professor.', '/admin/teachers', 'violet']
            ]
          : [])
      ]
    ]
  ];

  return (
    <DashboardLayout>
      <div data-testid="teacher-panel" className="pn">
        <PageIntro section="ESPAÇO DO PROFESSOR" title="Painel do professor" description="Todas as suas ferramentas, organizadas pelo que você quer fazer agora." />

        <section className="pn-stats" aria-label="Números da escola">
          {[
            [Users, 'Alunos', stats?.total_users],
            [BookOpen, 'Livros', stats?.total_books],
            [FileText, 'Resumos enviados', stats?.total_summaries],
            [Clock, 'Para corrigir', work ? pendingTotal : undefined]
          ].map(([Icon, label, value]) => (
            <div key={label}>
              <Icon size={17} />
              {value === undefined ? <Skeleton width={42} height={26} /> : <strong>{value ?? 0}</strong>}
              <span>{label}</span>
            </div>
          ))}
        </section>

        {admin && <BackupCard />}

        {groups.map(([title, text, tools]) => (
          <section key={title} className="pn-group">
            <header>
              <h2>{title}</h2>
              <p>{text}</p>
            </header>
            <div className="pn-grid">
              {tools.map(([Icon, name, desc, to, tone, badge, alert]) => (
                <Link key={to} to={to} className={`pn-card tone-${tone}`}>
                  <span className="pn-icon">
                    <Icon size={20} />
                  </span>
                  <span className="pn-copy">
                    <strong>{name}</strong>
                    <small>{desc}</small>
                    {badge && <em className={alert ? 'is-alert' : ''}>{badge}</em>}
                  </span>
                  <ArrowUpRight size={17} className="pn-go" />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </DashboardLayout>
  );
}
