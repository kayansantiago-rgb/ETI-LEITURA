import { useEffect, useState } from 'react';
import { BellRing, BellOff, Flame } from 'lucide-react';
import { getUser } from '@/lib/auth';
import { pushSupported, savedDevice, detachPush, subscribeDevice, isIOS, isStandalone } from '@/lib/push';
import api from '@/lib/api';
import { toast } from 'sonner';

// Uma única opção: receber ou não as notificações neste aparelho.
export default function PushSettings() {
  const user = getUser();
  const [config, setConfig] = useState(null);
  const [revision, setRevision] = useState(0);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const student = user?.role === 'student';
  const [reminder, setReminder] = useState(null);
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
        setActive(false);
        setPermission(window.Notification?.permission || 'default');
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
    const test = async () => {
    setBusy(true);
    try {
      const endpoint = savedDevice()?.endpoint;
      if (!endpoint) throw Error();
      const {data} = await api.post('/push/test', {endpoint});
      toast.success(data.message);
    } catch (e) {
      toast.error(typeof e.response?.data?.detail === 'string' ? e.response.data.detail : 'Não foi possível enviar o teste. Atualize o estado e tente novamente.');
    } finally { setBusy(false); }
  };

  return () => {
      alive = false;
    };
  }, [revision, user.id, supported]);

  useEffect(() => {
    if (!student) return;
    api
      .get('/reading/stats')
      .then(r => setReminder(r.data.lembrete_leitura !== false))
      .catch(() => {});
  }, [student]);

  const toggleReminder = async () => {
    const next = !reminder;
    setReminder(next);
    try {
      await api.put('/reading/reminder', { ativo: next });
      toast.success(next ? 'Lembrete de leitura ligado.' : 'Lembrete de leitura desligado.');
    } catch {
      setReminder(!next);
      toast.error('Não foi possível alterar agora.');
    }
  };

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
  const disabled = busy || (!active && (!config || !!reason));

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

  const test = async () => {
    setBusy(true);
    try {
      const endpoint = savedDevice()?.endpoint;
      if (!endpoint) throw Error();
      const {data} = await api.post('/push/test', {endpoint});
      toast.success(data.message);
    } catch (e) {
      toast.error(typeof e.response?.data?.detail === 'string' ? e.response.data.detail : 'Não foi possível enviar o teste. Atualize o estado e tente novamente.');
    } finally { setBusy(false); }
  };

  return (
    <div><section className="ps" aria-label="Notificações neste aparelho">
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
      {student && reminder !== null && (
        <div className="ps-extra">
          <span className={`ps-icon is-small ${reminder ? 'is-streak' : ''}`}>
            <Flame size={15} />
          </span>
          <div className="ps-copy">
            <strong>Lembrete para não perder a sequência</strong>
            <small>{active ? 'Às 19h, se você ainda não tiver lido no dia.' : 'Chega às 19h quando as notificações estiverem ligadas.'}</small>
          </div>
          <button type="button" role="switch" aria-checked={reminder} aria-label="Lembrete de leitura às 19h" className="qz-switch ps-switch" onClick={toggleReminder}>
            <span />
          </button>
        </div>
      )}
    </section>
    <div className="push-help" style={{padding:'12px 0',display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
      <button type="button" className="ws-btn" disabled={busy} onClick={()=>setRevision(v=>v+1)}>Verificar novamente</button>
      {active && <button type="button" className="ws-btn" disabled={busy||!config?.configured} onClick={test}>{busy?'Aguarde…':'Enviar notificação de teste'}</button>}
      {user.role==='admin' && config?.missing?.length>0 && <p role="status" style={{width:'100%',fontSize:13}}>Configuração pendente no Railway: {config.missing.join(', ')}. Após salvar e publicar as variáveis, clique em Verificar novamente.</p>}
      <small style={{width:'100%'}}>Ative separadamente em cada computador ou celular. No iPhone, abra a plataforma pelo ícone adicionado à Tela de Início. Os avisos anteriores à ativação continuam disponíveis no sininho.</small>
    </div></div>
  );
}
