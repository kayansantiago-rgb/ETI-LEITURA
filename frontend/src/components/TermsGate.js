import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, BookOpen, Eye, Trash2, Download, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Owl } from '@/components/LoginScene';
import { getUser, updateUser, clearAuth } from '@/lib/auth';
import { TERMS_VERSION } from '@/lib/terms';
import api from '@/lib/api';
import { toast } from 'sonner';

// Pede o aceite dos termos de uso e da política de privacidade (LGPD) uma vez por versão.
// Enquanto não houver aceite, o conteúdo de `children` (ex.: o tour) não aparece.
export default function TermsGate({ children }) {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(() => getUser()?.termos_versao === TERMS_VERSION);
  const [checked, setChecked] = useState(accepted);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (accepted) return;
    let alive = true;
    // A conta pode ter aceitado em outro aparelho: confere no servidor antes de perguntar.
    api
      .get('/auth/me')
      .then(r => {
        if (!alive) return;
        updateUser({ termos_versao: r.data.termos_versao, moldura: r.data.moldura, titulo: r.data.titulo, titulo_nome: r.data.titulo_nome });
        if (r.data.termos_versao === TERMS_VERSION) setAccepted(true);
      })
      .catch(() => {})
      .finally(() => alive && setChecked(true));
    return () => {
      alive = false;
    };
  }, [accepted]);

  if (accepted) return children || null;
  if (!checked) return null;

  const accept = async () => {
    setBusy(true);
    try {
      await api.post('/auth/me/accept-terms');
      updateUser({ termos_versao: TERMS_VERSION });
      setAccepted(true);
    } catch {
      toast.error('Não foi possível registrar o aceite. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };
  const leave = async () => {
    await clearAuth();
    navigate('/login');
  };

  return createPortal(
    <div className="ws-overlay is-center tg-overlay">
      <section className="vd-form tg" role="dialog" aria-modal="true" aria-labelledby="tg-title">
        <div className="vd-form-body">
          <div className="tg-hero">
            <span className="tg-owl" aria-hidden="true">
              <Owl size={64} />
            </span>
            <p className="ws-eyebrow">Termos de uso e privacidade</p>
            <h2 id="tg-title">Seus dados, cuidados com carinho</h2>
            <p>Antes de continuar, veja como a ETI LEITURA usa as suas informações.</p>
          </div>
          <ul className="tg-list">
            <li>
              <BookOpen size={17} />
              <span>
                <strong>O que guardamos</strong> Nome, e-mail, turma, leituras, atividades, notas e certificados — só o necessário para as aulas.
              </span>
            </li>
            <li>
              <Eye size={17} />
              <span>
                <strong>Quem vê</strong> Você, seus professores e a coordenação da escola. Nada é vendido nem usado para propaganda.
              </span>
            </li>
            <li>
              <Download size={17} />
              <span>
                <strong>Seus direitos</strong> No Perfil você pode baixar uma cópia dos seus dados a qualquer momento.
              </span>
            </li>
            <li>
              <Trash2 size={17} />
              <span>
                <strong>Exclusão</strong> Você pode pedir a exclusão da conta; a coordenação confirma e apaga os dados.
              </span>
            </li>
          </ul>
          <a className="tg-link" href="/privacidade" target="_blank" rel="noreferrer">
            <ShieldCheck size={15} /> Ler os termos e a política de privacidade completos
          </a>
        </div>
        <footer className="bqe-footer">
          <button type="button" className="tg-leave" onClick={leave}>
            <LogOut size={15} /> Sair
          </button>
          <span className="flex-1" />
          <button type="button" className="a11y-done" onClick={accept} disabled={busy}>
            {busy ? 'Registrando…' : 'Li e aceito'}
          </button>
        </footer>
      </section>
    </div>,
    document.body
  );
}
