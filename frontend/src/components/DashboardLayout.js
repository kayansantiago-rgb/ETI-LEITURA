import { reconcilePush } from '@/lib/push';
import Accessibility from '@/components/Accessibility';
import PushPrompt from '@/components/PushPrompt';
import TermsGate from '@/components/TermsGate';
import WelcomeTour from '@/components/WelcomeTour';
import OfflineBanner from '@/components/OfflineBanner';
import CelebrationWatcher from '@/components/Celebration';
import { frameClass } from '@/lib/rewards';
import api from '@/lib/api';
import ThemeToggle from '@/components/ThemeToggle';
import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X, Bell } from 'lucide-react';
import { getAuth, clearAuth } from '@/lib/auth';
import { navGroups, dockLinks } from '@/lib/navigation';
import { createPortal } from 'react-dom';
import Brand from '@/components/Brand';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({ children, focusMode = false }) {
  const [open, setOpen] = useState(false);
  const [, refresh] = useState(0);
  const { user } = getAuth();

  useEffect(() => {
    const update = () => refresh(v => v + 1);
    window.addEventListener('eti-user-updated', update);
    return () => window.removeEventListener('eti-user-updated', update);
  }, []);

  useEffect(() => {
    reconcilePush(user?.id).catch(() => {});
  }, [user?.id]);

  // O item da página atual fica sempre visível no menu lateral.
  useEffect(() => {
    document.querySelector('.rail-nav .nav-link.active')?.scrollIntoView({ block: 'nearest' });
  }, []);

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

  const groups = navGroups(user);
  const allItems = groups.flatMap(([, items]) => items);
  const title = allItems.find(item => item[2] === location.pathname)?.[1] || (location.pathname === '/profile' ? 'Meu perfil' : 'Espaço de leitura');

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

  const mobileLinks = dockLinks(user);
  const mainLinks = mobileLinks;
  const otherArea = !mobileLinks.some(([, , path]) => location.pathname === path || location.pathname.startsWith(path + '/'));
  const logout = async () => {
    await clearAuth();
    navigate('/login');
  };

  return (
    <div className={`platform-shell studio-shell atlas-shell ${isAdmin ? 'staff-shell' : ''} ${focusMode ? 'reading-focus' : ''}`}>
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo
      </a>
      <aside className="desktop-rail" aria-label="Navegação permanente">
        <Link className="rail-brand" to="/dashboard">
          <Brand />
        </Link>
        <nav aria-label="Navegação" className="rail-nav">
          {groups.map(([name, items]) => (
            <section key={name} className="rail-group" aria-label={name}>
              <h2 className="rail-caption">{name}</h2>
              {links(items)}
            </section>
          ))}
        </nav>
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
            <span className={`user-avatar ${frameClass(user)}`}>
              {user?.avatar_url ? <img src={user.avatar_url} alt="" /> : user?.nome?.charAt(0) || 'E'}
            </span>
            <span>{user?.nome?.split(' ')[0]}</span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 font-bold flex items-center gap-1.5 px-2.5"
            onClick={logout}
            title="Sair da conta"
          >
            <LogOut size={17} />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>
      <nav className="studio-tabs" aria-label="Áreas principais">
        {links(mainLinks)}
        <button className="studio-all" onClick={() => setOpen(true)}>
          <Menu size={16} />
          Todas as áreas
        </button>
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
      {open &&
        createPortal(
          <div className="ms-overlay" onMouseDown={e => e.target === e.currentTarget && setOpen(false)}>
            <section id="platform-sidebar" className="ms" role="dialog" aria-modal="true" aria-label="Todas as áreas" data-testid="sidebar">
              <header className="ms-head">
                <span className="ms-handle" aria-hidden="true" />
                <h2>Todas as áreas</h2>
                <button type="button" className="ws-icon-btn" onClick={() => setOpen(false)} aria-label="Fechar menu">
                  <X size={20} />
                </button>
              </header>
              <nav className="ms-body" aria-label="Navegação principal">
                {groups.map(([name, items]) => (
                  <section key={name} className="ms-group" aria-label={name}>
                    <h3>{name}</h3>
                    <div className="ms-grid">
                      {items.map(([Icon, label, path, tone]) => (
                        <NavLink key={path} to={path} onClick={() => setOpen(false)} className={({ isActive }) => `ms-tile tone-${tone} ${isActive ? 'is-active' : ''}`}>
                          <span className="ms-icon">
                            <Icon size={20} />
                          </span>
                          <span>{label}</span>
                        </NavLink>
                      ))}
                    </div>
                  </section>
                ))}
              </nav>
              <footer className="ms-foot">
                <Link to="/profile" className="ms-account" onClick={() => setOpen(false)}>
                  <span className={`user-avatar ${frameClass(user)}`}>{user?.avatar_url ? <img src={user.avatar_url} alt="" /> : user?.nome?.charAt(0)}</span>
                  <span>
                    <strong>{user?.nome}</strong>
                    <small>{user?.role === 'admin' ? 'Coordenação' : isAdmin ? 'Professor' : user?.turma}</small>
                  </span>
                </Link>
                <button type="button" className="ms-logout" onClick={logout}>
                  <LogOut size={16} /> Sair
                </button>
              </footer>
            </section>
          </div>,
          document.body
        )}
      <div className="platform-body">
        <div className="studio-context">
          <span>PLATAFORMA DE LEITURA</span>
          <span>{title}</span>
        </div>
        <span className="route-bar" key={location.key} aria-hidden="true" />
        <div className="print-head" aria-hidden="true">
          <strong>ETI LEITURA</strong>
          <span>
            {title} · {new Date().toLocaleDateString('pt-BR')} · {user?.nome}
          </span>
        </div>
        <main
          id="main-content"
          className={`platform-main ${['/dashboard', '/admin/professor'].includes(location.pathname) ? '' : 'inner-workspace'}`}
          tabIndex={-1}
        >
          {children}
        </main>
        {!focusMode && <PushPrompt />}
        <OfflineBanner />
        <TermsGate>
          {!focusMode && <WelcomeTour />}
          <CelebrationWatcher />
        </TermsGate>
        <footer className="platform-footer">
          <span>ETI LEITURA</span>
          <span>Aprendizagem em movimento.</span>
        </footer>
      </div>
    </div>
  );
}
