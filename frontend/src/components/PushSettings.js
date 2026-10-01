import { useEffect, useState } from 'react';
import { BellRing, BellOff } from 'lucide-react';
import { getUser } from '@/lib/auth';
import { pushSupported, savedDevice, detachPush, subscribeDevice, isIOS, isStandalone } from '@/lib/push';
import api from '@/lib/api';
import { toast } from 'sonner';

// Uma única opção: receber ou não as notificações neste aparelho.
export default function PushSettings() {
  const user = getUser();
  const [config, setConfig] = useState(null);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState(() => (typeof Notification === 'undefined' ? 'default' : Notification.permission));
  const supported = pushSupported();
  const iosNeedsInstall = isIOS() && !isStandalone();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cfg = (await api.get('/push/config')).data;
        if (!alive) return;
        setConfig(cfg);
        const device = savedDevice();
        if (device?.userId === user.id && supported && Notification.permission === 'granted') {
          const reg = await navigator.serviceWorker.getRegistration('/');
          const sub = await reg?.pushManager.getSubscription();
          if (sub && alive) setActive((await api.post('/push/status', { endpoint: sub.endpoint })).data.active);
        }
      } catch {
        if (alive) setConfig({ configured: false, failed: true });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const reason = iosNeedsInstall
    ? 'No iPhone: Compartilhar → Adicionar à Tela de Início e abra pelo ícone.'
    : !supported
      ? 'Este navegador não aceita notificações.'
      : permission === 'denied'
        ? 'Bloqueadas no navegador. Libere nas configurações do site.'
        : config && !config.configured
          ? config.failed
            ? 'Não foi possível verificar agora.'
            : 'A escola ainda não ativou o envio de notificações.'
          : '';
  const disabled = busy || !config || !!reason;

  const toggle = async () => {
    setBusy(true);
    try {
      if (active) {
        await detachPush();
        setActive(false);
        toast.success('Notificações desligadas neste aparelho.');
        return;
      }
      const granted = await Notification.requestPermission();
      setPermission(granted);
      if (granted !== 'granted') {
        toast.error('Permissão negada. Os avisos continuam no sininho.');
        return;
      }
      await subscribeDevice({ userId: user.id, publicKey: config.public_key, api });
      setActive(true);
      toast.success('Notificações ligadas neste aparelho.');
    } catch (e) {
      toast.error(typeof e.response?.data?.detail === 'string' ? e.response.data.detail : 'Não foi possível alterar agora. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="ps" aria-label="Notificações neste aparelho">
      <span className={`ps-icon ${active ? 'is-on' : ''}`}>{active ? <BellRing size={18} /> : <BellOff size={18} />}</span>
      <div className="ps-copy">
        <strong>Notificações no aparelho</strong>
        <small>{reason || (active ? 'Ligadas: os avisos chegam na barra do celular ou computador.' : 'Desligadas: os avisos ficam só aqui no sininho.')}</small>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label="Receber notificações neste aparelho"
        className="qz-switch ps-switch"
        disabled={disabled}
        onClick={toggle}
      >
        <span />
      </button>
    </section>
  );
}
