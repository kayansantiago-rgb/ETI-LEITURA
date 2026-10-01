import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X, RefreshCw, Settings2, CalendarClock, Award } from 'lucide-react';
import CorrectionWorkspace from '@/components/CorrectionWorkspace';
import api from '@/lib/api';
import { deadline } from '@/pages/Activities';

// Correção em painel sobreposto: o professor corrige sem sair da lista de atividades.
export default function CorrectionDrawer({ activityId, onClose, onChanged }) {
  const [activity, setActivity] = useState(null);
  const [responses, setResponses] = useState(null);
  const [failed, setFailed] = useState(false);
  const panelRef = useRef(null);
  const changed = useRef(false);

  const load = async () => {
    setFailed(false);
    try {
      const [a, r] = await Promise.all([api.get(`/activities/${activityId}`), api.get(`/admin/activities/${activityId}/responses`)]);
      setActivity(a.data);
      setResponses(r.data);
    } catch {
      setFailed(true);
    }
  };

  useEffect(() => {
    load();
  }, [activityId]);

  const close = () => {
    if (changed.current) onChanged?.();
    onClose();
  };

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    const onKey = e => {
      if (e.key === 'Escape' && !e.target.closest('textarea,input')) close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, []);

  return createPortal(
    <div className="cx-overlay" onMouseDown={e => e.target === e.currentTarget && close()}>
      <div className="cx-drawer" role="dialog" aria-modal="true" aria-label="Correção de entregas" tabIndex={-1} ref={panelRef}>
        <header className="cx-drawer-head">
          <div className="min-w-0">
            <p className="cx-eyebrow">Correção de entregas</p>
            <h2>{activity?.titulo || 'Carregando atividade…'}</h2>
            {activity && (
              <div className="cx-meta">
                <span className="cx-chip">{activity.turma === 'TODAS' ? 'Todas as turmas' : activity.turma}</span>
                <span>
                  <Award size={13} /> Vale {(activity.valor_nota ?? 10).toLocaleString('pt-BR')} pts
                </span>
                <span>
                  <CalendarClock size={13} /> Prazo {deadline(activity.prazo)}
                </span>
              </div>
            )}
          </div>
          <div className="cx-head-actions">
            <button type="button" onClick={load} title="Atualizar entregas" aria-label="Atualizar entregas">
              <RefreshCw size={17} />
            </button>
            <Link to={`/admin/activities/${activityId}`} title="Gerenciar atividade" aria-label="Gerenciar atividade">
              <Settings2 size={17} />
            </Link>
            <button type="button" className="is-close" onClick={close} aria-label="Fechar correção">
              <X size={19} />
            </button>
          </div>
        </header>

        <div className="cx-drawer-body">
          {failed ? (
            <div className="cx-empty" role="alert">
              <h3>Não foi possível carregar as entregas</h3>
              <button type="button" className="underline" onClick={load}>
                Tentar novamente
              </button>
            </div>
          ) : !activity || !responses ? (
            <div className="cx-empty" role="status">
              <span className="cx-spinner" />
              <p>Carregando entregas…</p>
            </div>
          ) : (
            <CorrectionWorkspace
              activity={activity}
              responses={responses}
              onGraded={updated => {
                changed.current = true;
                setResponses(list => list.map(x => (x.id === updated.id ? updated : x)));
              }}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
