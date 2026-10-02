import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Smartphone, X, Share, SquarePlus, MoreVertical, Check, HardDrive, Bell, Zap } from 'lucide-react';
import { useInstall } from '@/lib/install';

const DISMISS_KEY = 'eti-install-card';
const WAIT_DAYS = 14;

const dismissed = () => {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at && Date.now() - at < WAIT_DAYS * 864e5;
  } catch {
    return false;
  }
};

function Steps({ mode, onClose }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const steps =
    mode === 'ios'
      ? [
          [Share, 'Toque em Compartilhar', 'O quadrado com a seta para cima, na barra do Safari.'],
          [SquarePlus, 'Escolha "Adicionar à Tela de Início"', 'Role a lista de opções para encontrar.'],
          [Check, 'Toque em "Adicionar"', 'O ícone da ETI LEITURA aparece junto dos seus apps.']
        ]
      : [
          [MoreVertical, 'Abra o menu do navegador', 'Os três pontinhos no canto da tela.'],
          [Download, 'Toque em "Instalar app" ou "Adicionar à tela inicial"', 'O nome muda um pouco de navegador para navegador.'],
          [Check, 'Confirme', 'O ícone da ETI LEITURA aparece junto dos seus apps.']
        ];
  return createPortal(
    <div className="ws-overlay is-center" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="vd-form ia-steps" role="dialog" aria-modal="true" aria-label="Como instalar a ETI LEITURA">
        <header>
          <div>
            <p className="ws-eyebrow">{mode === 'ios' ? 'iPhone e iPad (Safari)' : 'No seu navegador'}</p>
            <h2>Instalar a ETI LEITURA</h2>
          </div>
          <button type="button" className="ws-icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <div className="vd-form-body">
          <ol className="ia-list">
            {steps.map(([Icon, title, text], i) => (
              <li key={title}>
                <span className="ia-num">{i + 1}</span>
                <span className="ia-step-icon">
                  <Icon size={18} />
                </span>
                <div>
                  <strong>{title}</strong>
                  <small>{text}</small>
                </div>
              </li>
            ))}
          </ol>
          {mode === 'ios' && <p className="ia-note">No iPhone, a instalação só funciona pelo Safari. Depois de instalar, você também pode ativar os avisos no celular.</p>}
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

// Convite para instalar a plataforma como aplicativo. `variant="card"` (início, pode ser dispensado)
// ou `variant="row"` (perfil, sempre visível).
export default function InstallApp({ variant = 'card' }) {
  const { mode, install } = useInstall();
  const [hidden, setHidden] = useState(dismissed);
  const [help, setHelp] = useState(false);

  if (variant === 'card' && (hidden || mode === 'installed')) return null;

  const action = async () => {
    if (mode === 'prompt') await install();
    else setHelp(true);
  };
  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setHidden(true);
  };

  if (variant === 'row')
    return (
      <div className="ws-card pf-card ia-row">
        <span className="ia-row-icon">
          <Smartphone size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h3>Aplicativo no celular</h3>
          <p>{mode === 'installed' ? 'A ETI LEITURA já está instalada neste aparelho.' : 'Instale para abrir a plataforma direto da tela inicial, em tela cheia.'}</p>
        </div>
        {mode === 'installed' ? (
          <span className="ia-done">
            <Check size={15} /> Instalado
          </span>
        ) : (
          <button type="button" className="ia-btn" onClick={action}>
            <Download size={15} /> Instalar
          </button>
        )}
        {help && <Steps mode={mode} onClose={() => setHelp(false)} />}
      </div>
    );

  return (
    <section className="ia-card" aria-label="Instalar a ETI LEITURA">
      <button type="button" className="ia-close" onClick={dismiss} aria-label="Agora não">
        <X size={16} />
      </button>
      <div className="ia-phone" aria-hidden="true">
        <span className="ia-phone-screen">
          <img src="/icons/eti-192.png" alt="" />
        </span>
      </div>
      <div className="ia-copy">
        <p className="ia-kicker">Novo · Aplicativo</p>
        <h2>Leve a ETI LEITURA no bolso</h2>
        <ul>
          <li>
            <Zap size={14} /> Abre direto da tela inicial, em tela cheia
          </li>
          <li>
            <Bell size={14} /> Avisos de atividades no celular
          </li>
          <li>
            <HardDrive size={14} /> Quase não ocupa espaço no aparelho
          </li>
        </ul>
      </div>
      <button type="button" className="ia-cta" onClick={action}>
        <Download size={17} /> Instalar app
      </button>
      {help && <Steps mode={mode} onClose={() => setHelp(false)} />}
    </section>
  );
}
