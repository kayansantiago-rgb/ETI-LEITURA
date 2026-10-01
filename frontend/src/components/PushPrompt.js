import { useEffect, useState } from 'react';
import { BellRing, X, Share } from 'lucide-react';
import { getUser } from '@/lib/auth';
import { pushSupported, savedDevice, subscribeDevice, isIOS, isStandalone } from '@/lib/push';
import api from '@/lib/api';
import { toast } from 'sonner';

const DISMISS_KEY = 'eti-push-prompt';
const WAIT_DAYS = 7;

function dismissedRecently() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at && Date.now() - at < WAIT_DAYS * 864e5;
  } catch {
    return false;
  }
}

// Convida o usuário a receber os avisos na barra de notificações do aparelho.
export default function PushPrompt() {
  const user = getUser();
  const [mode, setMode] = useState(null);
  const [config, setConfig] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    const device = savedDevice();
    const subscribed = device?.userId === user.id;
    const ios = isIOS();

    // iPhone/iPad só recebem notificações com a plataforma instalada na tela de início.
    if (ios && !isStandalone()) {
      if (!dismissedRecently()) setMode('install');
      return;
    }
    if (!pushSupported() || subscribed || Notification.permission === 'denied') return;

    api
      .get('/push/config')
      .then(async r => {
        if (!alive || !r.data.configured) return;
        setConfig(r.data);
        if (Notification.permission === 'granted') {
          // A permissão já foi dada antes (por exemplo, em outro login): reativa sem perguntar de novo.
          await subscribeDevice({ userId: user.id, publicKey: r.data.public_key, api }).catch(() => {});
          return;
        }
        if (!dismissedRecently()) setMode('ask');
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setMode(null);
  };

  const enable = async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Sem permissão, os avisos ficam só no sininho. Você pode ativar depois em Avisos.');
        dismiss();
        return;
      }
      await subscribeDevice({ userId: user.id, publicKey: config.public_key, api });
      toast.success('Pronto! Os avisos vão aparecer na barra de notificações deste aparelho.');
      setMode(null);
    } catch (e) {
      toast.error(typeof e.response?.data?.detail === 'string' ? e.response.data.detail : 'Não foi possível ativar agora. Tente novamente em Avisos.');
    } finally {
      setBusy(false);
    }
  };

  if (!mode) return null;

  return (
    <aside className="pp" role="dialog" aria-label="Ativar notificações">
      <button type="button" className="pp-close" onClick={dismiss} aria-label="Agora não">
        <X size={16} />
      </button>
      <span className="pp-icon">
        <BellRing size={22} />
      </span>
      <div className="pp-copy">
        <strong>Receba os avisos no seu aparelho</strong>
        {mode === 'install' ? (
          <p>
            No iPhone, toque em <Share size={13} className="inline -mt-0.5" /> <b>Compartilhar</b> → <b>Adicionar à Tela de Início</b>, abra a ETI LEITURA pelo ícone e ative os avisos.
          </p>
        ) : (
          <p>
            {['admin', 'teacher'].includes(user?.role)
              ? 'Saiba na hora quando chegar uma entrega para corrigir, mesmo com a plataforma fechada.'
              : 'Novas atividades, correções, quizzes e recados do mural na barra de notificações, mesmo com a plataforma fechada.'}
          </p>
        )}
        {mode === 'ask' && (
          <div className="pp-actions">
            <button type="button" className="pp-primary" disabled={busy} onClick={enable}>
              {busy ? 'Ativando…' : 'Ativar notificações'}
            </button>
            <button type="button" className="pp-ghost" onClick={dismiss}>
              Agora não
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
