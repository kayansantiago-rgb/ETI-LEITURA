import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BellRing, BellOff, Flame, X, Lock, Settings2, RefreshCw, Smartphone, Share, SquarePlus, Server, Globe } from 'lucide-react';
import { getUser } from '@/lib/auth';
import { pushSupported, savedDevice, detachPush, subscribeDevice, isIOS, isStandalone } from '@/lib/push';
import api from '@/lib/api';
import { toast } from 'sonner';

// Explica, passo a passo, por que o interruptor não liga e como resolver.
const HELP = {
  denied: {
    title: 'As notificações estão bloqueadas',
    text: 'Este navegador recebeu um "Bloquear" para as notificações da ETI LEITURA. Libere assim:',
    steps: [
      [Lock, 'Toque no cadeado (ou no ícone de ajustes) ao lado do endereço do site, lá em cima.'],
      [Settings2, 'Abra "Configurações do site" ou "Permissões" e mude Notificações para "Permitir".'],
      [RefreshCw, 'Recarregue a página e toque no interruptor de novo.']
    ]
  },
  ios: {
    title: 'No iPhone, instale a plataforma primeiro',
    text: 'A Apple só libera notificações para sites instalados na tela de início:',
    steps: [
      [Share, 'No Safari, toque em Compartilhar (o quadrado com a seta para cima).'],
      [SquarePlus, 'Escolha "Adicionar à Tela de Início" e confirme.'],
      [Smartphone, 'Abra a ETI LEITURA pelo novo ícone e ligue as notificações.']
    ]
  },
  unsupported: {
    title: 'Este navegador não aceita notificações',
    text: 'Abra a plataforma em um navegador atualizado:',
    steps: [[Globe, 'Use o Google Chrome, o Microsoft Edge ou o Firefox. No iPhone, use o Safari com a plataforma instalada.']]
  },
  config: {
    title: 'A escola ainda não ativou as notificações',
    text: 'O servidor da plataforma ainda não tem as chaves de notificação configuradas.',
    steps: [[Server, 'Avise a coordenação da escola. Assim que for ativado, o interruptor passa a funcionar.']],
    admin: [
      [Server, 'No Railway, abra o serviço da ETI LEITURA → Variables → Raw Editor.'],
      [SquarePlus, 'Cole o conteúdo do arquivo .local/notificacoes-railway.env (as variáveis VAPID) e salve.'],
      [RefreshCw, 'Aguarde o serviço reiniciar (1 a 2 minutos) e recarregue esta página.']
    ]
  },
  failed: {
    title: 'Não deu para verificar agora',
    text: 'A plataforma não conseguiu falar com o servidor.',
    steps: [[RefreshCw, 'Confira a internet e recarregue a página. Se o servidor estava "dormindo", a segunda tentativa costuma funcionar.']]
  }
};

function PushHelp({ kind, admin, onClose }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const info = HELP[kind];
  const steps = admin && info.admin ? info.admin : info.steps;
  return createPortal(
    <div className="ws-overlay is-center" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="vd-form ia-steps" role="dialog" aria-modal="true" aria-label={info.title}>
        <header>
          <div>
            <p className="ws-eyebrow">Notificações no aparelho</p>
            <h2>{info.title}</h2>
          </div>
          <button type="button" className="ws-icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <div className="vd-form-body">
          <p className="ia-note" style={{ marginTop: 0, marginBottom: 12 }}>{info.text}</p>
          <ol className="ia-list">
            {steps.map(([Icon, text], i) => (
              <li key={i}>
                <span className="ia-num">{i + 1}</span>
                <span className="ia-step-icon">
                  <Icon size={18} />
                </span>
                <div>
                  <strong>{text}</strong>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <footer className="bqe-footer">
          <span className="flex-1" />
          <button type="button" className="a11y-done" onClick={onClose}>
            Entendi
          </button>
        </footer>
      </section>
    </div>,
    document.body
  );
}

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
  const kind = iosNeedsInstall ? 'ios' : !supported ? 'unsupported' : permission === 'denied' ? 'denied' : config && !config.configured ? (config.failed ? 'failed' : 'config') : null;
  const [help, setHelp] = useState(null);
  // O interruptor nunca fica travado: se algo impede, ele explica como resolver.
  const disabled = busy || (!active && !config);
  const press = () => (!active && kind ? setHelp(kind) : toggle());

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
        <small>{reason ? <button type="button" className="ps-why" onClick={() => setHelp(kind)}>{reason} <b>Como resolver?</b></button> : (active ? 'Ligadas: os avisos chegam na barra do celular ou computador.' : 'Desligadas: os avisos ficam só aqui no sininho.')}</small>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label="Receber notificações neste aparelho"
        className="qz-switch ps-switch"
        disabled={disabled}
        onClick={press}
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
    </div>
    {help && <PushHelp kind={help} admin={user.role === 'admin'} onClose={() => setHelp(null)} />}
    </div>
  );
}
