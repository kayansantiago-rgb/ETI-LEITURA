import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GraduationCap, X } from 'lucide-react';
import { TURMAS } from '@/constants/turmas';
import api from '@/lib/api';
import { toast } from 'sonner';

let scriptPromise = null;
const loadGoogle = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise)
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = resolve;
      s.onerror = () => {
        scriptPromise = null;
        reject(new Error('google'));
      };
      document.head.appendChild(s);
    });
  return scriptPromise;
};
const errorText = (e, fallback) => (typeof e.response?.data?.detail === 'string' ? e.response.data.detail : fallback);

// Primeiro acesso com Google: falta escolher a turma e aceitar os termos.
function FinishSignup({ signup, onClose, onDone }) {
  const [turma, setTurma] = useState('');
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post('/auth/google/register', { cadastro_token: signup.cadastro_token, turma, aceite_termos: terms });
      onDone(r.data, true);
    } catch (err) {
      toast.error(errorText(err, 'Não foi possível criar a conta.'));
    } finally {
      setBusy(false);
    }
  };
  return createPortal(
    <div className="ws-overlay is-center" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <form className="vd-form gs-finish" onSubmit={submit} role="dialog" aria-modal="true" aria-label="Concluir cadastro">
        <header>
          <div>
            <p className="ws-eyebrow">Falta pouco, {signup.nome.split(' ')[0]}!</p>
            <h2>Concluir cadastro</h2>
          </div>
          <button type="button" className="ws-icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <div className="vd-form-body">
          <fieldset disabled={busy} className="vd-form-fields">
            <p className="gs-who">
              Conta Google: <b>{signup.email}</b>
            </p>
            <label className="qz-field">
              <span>Sua turma</span>
              <span className="gs-select">
                <GraduationCap size={16} />
                <select required value={turma} onChange={e => setTurma(e.target.value)}>
                  <option value="" disabled>
                    Selecione sua turma
                  </option>
                  {TURMAS.map(t => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <label className="lg-terms">
              <input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} required />
              <span>
                Li e aceito os{' '}
                <a href="/privacidade" target="_blank" rel="noreferrer">
                  termos de uso e a política de privacidade
                </a>
                .
              </span>
            </label>
          </fieldset>
        </div>
        <footer className="bqe-footer">
          <span className="flex-1" />
          <button type="submit" className="a11y-done" disabled={busy || !turma || !terms}>
            {busy ? 'Criando…' : 'Criar minha conta'}
          </button>
        </footer>
      </form>
    </div>,
    document.body
  );
}

// Botão oficial "Continuar com o Google". Só aparece quando a escola configurou GOOGLE_CLIENT_ID.
export default function GoogleSignIn({ onDone }) {
  const box = useRef(null);
  const [clientId, setClientId] = useState(null);
  const [signup, setSignup] = useState(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    api
      .get('/auth/google/config')
      .then(r => setClientId(r.data.client_id || null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!clientId) return;
    let alive = true;
    loadGoogle()
      .then(() => {
        if (!alive || !box.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          ux_mode: 'popup',
          callback: async ({ credential }) => {
            try {
              const r = await api.post('/auth/google', { credential });
              if (r.data.novo) setSignup(r.data);
              else onDoneRef.current(r.data, false);
            } catch (err) {
              toast.error(errorText(err, 'Não foi possível entrar com o Google.'));
            }
          }
        });
        window.google.accounts.id.renderButton(box.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          locale: 'pt-BR',
          width: Math.min(400, box.current.offsetWidth || 320)
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [clientId]);

  if (!clientId) return null;
  return (
    <div className="gs">
      <span className="gs-or">
        <i />
        ou
        <i />
      </span>
      <div ref={box} className="gs-button" />
      {signup && <FinishSignup signup={signup} onClose={() => setSignup(null)} onDone={(data, created) => onDoneRef.current(data, created)} />}
    </div>
  );
}
