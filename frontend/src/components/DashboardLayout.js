import { reconcilePush } from '@/lib/push';
import Accessibility from '@/components/Accessibility';
import PushPrompt from '@/components/PushPrompt';
import api from '@/lib/api';
import ThemeToggle from '@/components/ThemeToggle';
import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Video,
  Sparkles,
  BookOpen,
  LayoutDashboard,
  FileText,
  LogOut,
  Menu,
  X,
  Plus,
  PenTool,
  Users,
  ImageIcon,
  CalendarDays,
  Library,
  GraduationCap,
  ClipboardList,
  Bell,
  ChartColumn,
  Trophy
} from 'lucide-react';
import { getAuth, clearAuth } from '@/lib/auth';
import Brand from '@/components/Brand';
import { Button } from '@/components/ui/button';

const learning = [
  [Sparkles, 'Quizzes', '/quizzes'],
  [LayoutDashboard, 'Visão geral', '/dashboard'],
  [ClipboardList, 'Minhas atividades', '/activities'],
  [Video, 'Vídeos e materiais', '/videos'],
  [BookOpen, 'Biblioteca', '/library'],
  [Trophy, 'Ranking de leitores', '/ranking'],
  [PenTool, 'Produção textual', '/text-productions'],
  [ClipboardList, 'Pendências', '/workspace'],
  [FileText, 'Meus resumos', '/summaries']
];

const management = [
  [Users, 'Minhas turmas', '/admin/classes'],
  [ClipboardList, 'Critérios de correção', '/admin/rubrics'],
  [Video, 'Vídeos e materiais', '/videos'],
  [ChartColumn, 'Relatórios', '/admin/reports'],
  [Trophy, 'Ranking de leitores', '/ranking'],
  [Users, 'Professores', '/admin/teachers'],
  [ClipboardList, 'Atividades', '/admin/activities'],
  [Library, 'Acervo de livros', '/admin/books'],
  [Plus, 'Adicionar livro', '/admin/add-book'],
  [FileText, 'Resumos dos alunos', '/admin/summaries'],
  [PenTool, 'Produções dos alunos', '/admin/text-productions'],
  [ImageIcon, 'Mural da escola', '/admin/mural'],
  [CalendarDays, 'Calendário', '/admin/calendar']
];

export default function DashboardLayout({ children, focusMode = false }) {
  const [open, setOpen] = useState(false);
  const { user } = getAuth();

  useEffect(() => {
    reconcilePush(user?.id).catch(() => {});
  }, [user?.id]);

  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = ['admin', 'teacher'].includes(user?.role);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    const refresh = () =>
      api
        .get('/notifications')
        .then(r => {
          if (alive) setUnread(r.data.filter(n => !n.lida).length);
        })
        .catch(() => {});
    refresh();
    const timer = setInterval(refresh, 60000);
    window.addEventListener('eti-notices', refresh);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener('eti-notices', refresh);
    };
  }, []);

  const teacher = [GraduationCap, 'Painel do professor', '/admin/professor'];
  const title =
    [...learning, ...management, teacher].find(item => item[2] === location.pathname)?.[1] ||
    (location.pathname === '/profile' ? 'Meu perfil' : 'Espaço de leitura');

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const drawer = document.getElementById('platform-sidebar');
    const focusable = () =>
      Array.from(
        drawer.querySelectorAll(
          'a[href],button:not([disabled]),input,select,textarea,[tabindex="0"]'
        )
      );
    let frame;
    const focusWhenVisible = () => {
      const target = focusable()[0];
      if (target && getComputedStyle(target).visibility === 'visible') target.focus({ preventScroll: true });
      if (!drawer.contains(document.activeElement)) frame = requestAnimationFrame(focusWhenVisible);
    };
    frame = requestAnimationFrame(focusWhenVisible);
    const close = event => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key === 'Tab') {
        const list = focusable(),
          first = list[0],
          last = list[list.length - 1];
        if (!drawer.contains(document.activeElement)) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', close);
    return () => {
      document.body.style.overflow = oldOverflow;
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', close);
      previous?.focus();
    };
  }, [open]);

  const links = items =>
    items.map(([Icon, label, path]) => (
      <NavLink
        key={path}
        to={path}
        onClick={() => setOpen(false)}
        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
      >
        <Icon size={18} strokeWidth={1.8} />
        <span>{label}</span>
      </NavLink>
    ));

  const staffLinks = [[LayoutDashboard, 'Início', '/dashboard'], [BookOpen, 'Biblioteca', '/library'], [Sparkles, 'Quizzes', '/quizzes'], teacher];
  const groups = isAdmin ? [['Navegação', staffLinks]] : [['Meu aprendizado', learning]];

  const mainLinks = isAdmin
    ? staffLinks
    : [[LayoutDashboard, 'Início', '/dashboard'], [ClipboardList, 'Atividades', '/activities'], [PenTool, 'Produção', '/text-productions'], [BookOpen, 'Biblioteca', '/library'], [ClipboardList, 'Pendências', '/workspace']];

  const mobileLinks = isAdmin
    ? staffLinks
    : [[LayoutDashboard, 'Início', '/dashboard'], [ClipboardList, 'Atividades', '/activities'], [PenTool, 'Produção', '/text-productions'], [BookOpen, 'Livros', '/library']];

  const otherArea = !mobileLinks.some(([, , path]) => location.pathname === path || location.pathname.startsWith(path + '/'));
  const railPaths = isAdmin
    ? ['/admin/professor', '/admin/classes', '/admin/activities', '/videos', '/library', '/admin/reports']
    : ['/dashboard', '/activities', '/quizzes', '/videos', '/library', '/ranking', '/text-productions', '/workspace'];

  const railItems = isAdmin ? staffLinks : railPaths.map(path => (isAdmin ? [teacher, ...management, [BookOpen, 'Biblioteca', '/library']] : learning).find(item => item[2] === path)).filter(Boolean);

  return (
    <div className={`platform-shell studio-shell atlas-shell ${isAdmin ? 'staff-shell' : ''} ${focusMode ? 'reading-focus' : ''}`}>
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo
      </a>
      <aside className="desktop-rail" aria-label="Navegação permanente">
        <Link className="rail-brand" to="/dashboard">
          <Brand />
        </Link>
        <div className="rail-caption">{isAdmin ? 'ESPAÇO DO PROFESSOR' : 'MEU APRENDIZADO'}</div>
        <nav aria-label="Acessos rápidos">{links(railItems)}</nav>
        {!isAdmin && <button className="rail-all" onClick={() => setOpen(true)}>
          <Menu size={18} />
          Todas as áreas
        </button>}
        <div className="rail-bottom">
          <span className="user-avatar">{user?.nome?.charAt(0)}</span>
          <div className="flex-1 min-w-0">
            <strong>{user?.nome?.split(' ')[0]}</strong>
            <small>{isAdmin ? 'Ensinar e acompanhar' : user?.turma || 'Seu espaço de estudo'}</small>
          </div>
          <button
            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Sair da conta"
            aria-label="Sair da conta"
            onClick={async () => {
              await clearAuth();
              navigate('/login');
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <header className="studio-header">
        <Link to="/dashboard" aria-label="ETI LEITURA — início">
          <Brand />
        </Link>
        <span className="studio-role">{isAdmin ? 'ESPAÇO DO EDUCADOR' : 'ESPAÇO DO ALUNO'}</span>
        <div className="studio-header-actions">
          <Link to="/notifications" aria-label={`Avisos: ${unread} não lidos`} className="studio-notices">
            <Bell size={19} />
            {unread > 0 && <span>{unread}</span>}
          </Link>
          <Accessibility />
          <ThemeToggle />
          <Link to="/profile" className="studio-profile">
            <span className="user-avatar">
              {user?.avatar_url ? <img src={user.avatar_url} alt="" /> : user?.nome?.charAt(0) || 'E'}
            </span>
            <span>{user?.nome?.split(' ')[0]}</span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 font-bold flex items-center gap-1.5 px-2.5"
            onClick={async () => {
              await clearAuth();
              navigate('/login');
            }}
            title="Sair da conta"
          >
            <LogOut size={17} />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>
      <nav className="studio-tabs" aria-label="Áreas principais">
        {links(mainLinks)}
        {!isAdmin && <button className="studio-all" onClick={() => setOpen(true)}>
          <Menu size={16} />
          Todas as áreas
        </button>}
      </nav>
      <nav className="mobile-dock" aria-label="Navegação do celular">
        {mobileLinks.map(([Icon, label, path]) => (
          <NavLink key={path} to={path} className={({ isActive }) => `mobile-dock-item ${isActive ? 'active' : ''}`}>
            <span className="mobile-dock-icon">
              <Icon size={21} strokeWidth={1.8} />
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className={`mobile-dock-item ${open || otherArea ? 'active' : ''}`}
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={open}
          aria-controls="platform-sidebar"
        >
          <span className="mobile-dock-icon">
            <Menu size={21} />
          </span>
          <span>Mais</span>
        </button>
      </nav>
      {open && <button className="sidebar-overlay" onClick={() => setOpen(false)} aria-label="Fechar menu" />}
      <aside
        role={open ? 'dialog' : undefined}
        aria-modal={open ? true : undefined}
        aria-label="Menu de navegação"
        id="platform-sidebar"
        className={`platform-sidebar studio-drawer ${open ? 'is-open' : ''}`}
        data-testid="sidebar"
      >
        <div className="sidebar-brand">
          <Brand />
          <button onClick={() => setOpen(false)} aria-label="Fechar menu">
            <X size={22} />
          </button>
        </div>
        <nav aria-label="Navegação principal" className="sidebar-nav">

          {groups
            .filter(([, items]) => items.length)
            .map(([name, items]) => (
              <section className="menu-group" key={name} aria-label={name}>
                <h2 className="nav-label">{name}</h2>
                {links(items)}
              </section>
            ))}
        </nav>
        <div className="sidebar-account">
          <Link to="/profile" className="account-link">
            <span className="user-avatar">{user?.nome?.charAt(0)}</span>
            <span>
              <strong>{user?.nome}</strong>
              <small className="block">{user?.role === 'admin' ? 'Administrador' : isAdmin ? 'Professor' : user?.turma}</small>
            </span>
          </Link>
          <button
            aria-label="Sair da conta"
            onClick={async () => {
              await clearAuth();
              navigate('/login');
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <div className="platform-body">
        <div className="studio-context">
          <span>PLATAFORMA DE LEITURA</span>
          <span>{title}</span>
        </div>
        <main
          id="main-content"
          className={`platform-main ${['/dashboard', '/admin/professor'].includes(location.pathname) ? '' : 'inner-workspace'}`}
          tabIndex={-1}
        >
          {children}
        </main>
        {!focusMode && <PushPrompt />}
        <footer className="platform-footer">
          <span>ETI LEITURA</span>
          <span>Aprendizagem em movimento.</span>
        </footer>
      </div>
    </div>
  );
}
