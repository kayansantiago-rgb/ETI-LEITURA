import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, HelpCircle } from 'lucide-react';

let open = null;

/**
 * Caixa de confirmação da plataforma, no lugar do window.confirm do navegador.
 * Uso: if (!(await confirmAction({ title: 'Excluir livro?', message: '…' }))) return;
 */
export function confirmAction({ title = 'Tem certeza?', message = '', confirmLabel = 'Excluir', cancelLabel = 'Cancelar', tone = 'danger' } = {}) {
  if (!open) return Promise.resolve(window.confirm([title, message].filter(Boolean).join('\n\n')));
  return new Promise(resolve => open({ title, message, confirmLabel, cancelLabel, tone, resolve }));
}

export default function ConfirmHost() {
  const [request, setRequest] = useState(null);
  const confirmRef = useRef(null);
  const previous = useRef(null);

  useEffect(() => {
    open = next => {
      previous.current = document.activeElement;
      setRequest(next);
    };
    return () => {
      open = null;
    };
  }, []);

  const close = answer => {
    request?.resolve(answer);
    setRequest(null);
    previous.current?.focus?.();
  };

  useEffect(() => {
    if (!request) return;
    confirmRef.current?.focus();
    const onKey = e => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  if (!request) return null;
  const danger = request.tone === 'danger';
  const Icon = danger ? AlertTriangle : HelpCircle;

  return createPortal(
    <div className="cf-overlay" onMouseDown={e => e.target === e.currentTarget && close(false)}>
      <section className={`cf ${danger ? 'is-danger' : ''}`} role="alertdialog" aria-modal="true" aria-labelledby="cf-title" aria-describedby="cf-message">
        <span className="cf-icon">
          <Icon size={26} />
        </span>
        <h2 id="cf-title">{request.title}</h2>
        {request.message && <p id="cf-message">{request.message}</p>}
        <div className="cf-actions">
          <button type="button" className="cf-cancel" onClick={() => close(false)}>
            {request.cancelLabel}
          </button>
          <button type="button" ref={confirmRef} className="cf-confirm" onClick={() => close(true)}>
            {request.confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}
