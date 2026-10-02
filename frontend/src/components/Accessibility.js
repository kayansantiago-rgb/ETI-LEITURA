import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Accessibility as Icon, X, Type, Contrast, Link2, Ruler, Wind, RotateCcw, Rows3, Glasses, Keyboard } from 'lucide-react';

const STORAGE = 'eti-accessibility';
const SIZES = [
  [100, 'A', 'Padrão'],
  [115, 'A', 'Maior'],
  [130, 'A', 'Grande'],
  [145, 'A', 'Muito grande']
];
const defaults = { size: 100, motion: false, legible: false, spacing: false, contrast: false, links: false, ruler: false };

function read() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE)) || {};
    return { ...defaults, ...saved, size: SIZES.some(([s]) => s === saved.size) ? saved.size : 100 };
  } catch {
    return defaults;
  }
}

// Faixa que acompanha o ponteiro para ajudar a manter a linha de leitura.
function ReadingRuler() {
  const [y, setY] = useState(-200);
  useEffect(() => {
    const move = e => setY((e.touches ? e.touches[0].clientY : e.clientY) - 22);
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move, { passive: true });
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('touchmove', move);
    };
  }, []);
  return createPortal(<div className="a11y-ruler" style={{ transform: `translateY(${y}px)` }} aria-hidden="true" />, document.body);
}

function Toggle({ icon: IconComponent, title, text, checked, onChange }) {
  return (
    <label className={`a11y-toggle ${checked ? 'is-on' : ''}`}>
      <span className="a11y-toggle-icon">
        <IconComponent size={18} />
      </span>
      <span className="a11y-toggle-copy">
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="qz-switch a11y-switch" aria-hidden="true" data-on={checked}>
        <span />
      </span>
    </label>
  );
}

export function useApplyAccessibility(settings) {
  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = settings.size + '%';
    root.classList.toggle('reduce-motion', settings.motion);
    root.classList.toggle('a11y-legible', settings.legible);
    root.classList.toggle('a11y-spacing', settings.spacing);
    root.classList.toggle('a11y-contrast', settings.contrast);
    root.classList.toggle('a11y-links', settings.links);
    try {
      localStorage.setItem(STORAGE, JSON.stringify(settings));
    } catch {}
  }, [settings]);
}

export default function Accessibility() {
  const [settings, setSettings] = useState(read);
  const [open, setOpen] = useState(false);
  const panel = useRef(null);
  const trigger = useRef(null);
  useApplyAccessibility(settings);
  const set = (key, value) => setSettings(s => ({ ...s, [key]: value }));
  const active = Object.keys(defaults).filter(k => settings[k] !== defaults[k]).length;

  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const onKey = e => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
      trigger.current?.focus();
    };
  }, [open]);

  return (
    <>
      <button ref={trigger} type="button" className="theme-toggle a11y-trigger" aria-label="Opções de acessibilidade" title="Acessibilidade" onClick={() => setOpen(true)}>
        <Icon size={19} />
        {active > 0 && <span className="a11y-dot" aria-hidden="true" />}
      </button>
      {settings.ruler && <ReadingRuler />}
      {open &&
        createPortal(
          <div className="ws-overlay a11y-overlay" onMouseDown={e => e.target === e.currentTarget && setOpen(false)}>
            <section className="a11y-panel" role="dialog" aria-modal="true" aria-labelledby="a11y-title" tabIndex={-1} ref={panel}>
              <header className="a11y-head">
                <span className="a11y-head-icon">
                  <Icon size={22} />
                </span>
                <div>
                  <h2 id="a11y-title">Acessibilidade</h2>
                  <p>Deixe a leitura do seu jeito. As preferências ficam salvas neste aparelho.</p>
                </div>
                <button type="button" className="ws-icon-btn" onClick={() => setOpen(false)} aria-label="Fechar">
                  <X size={19} />
                </button>
              </header>

              <div className="a11y-body">
                <div className="a11y-preview" aria-hidden="true">
                  <small>Prévia</small>
                  <p>
                    “Foi o tempo que dedicaste à tua rosa que fez tua rosa tão importante.” <a href="#a11y-title">Saiba mais</a>
                  </p>
                </div>

                <fieldset className="a11y-group">
                  <legend>
                    <Type size={15} /> Tamanho do texto
                  </legend>
                  <div className="a11y-sizes">
                    {SIZES.map(([size, letter, label], i) => (
                      <button key={size} type="button" aria-pressed={settings.size === size} onClick={() => set('size', size)}>
                        <b style={{ fontSize: `${14 + i * 4}px` }}>{letter}</b>
                        <small>{label}</small>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="a11y-group">
                  <p className="a11y-legend">
                    <Glasses size={15} /> Leitura
                  </p>
                  <Toggle icon={Type} title="Fonte mais legível" text="Letras mais fáceis de distinguir (Atkinson Hyperlegible)" checked={settings.legible} onChange={v => set('legible', v)} />
                  <Toggle icon={Rows3} title="Mais espaço entre linhas" text="Afasta linhas e letras para ler com calma" checked={settings.spacing} onChange={v => set('spacing', v)} />
                  <Toggle icon={Ruler} title="Guia de leitura" text="Uma faixa acompanha o mouse ou o dedo" checked={settings.ruler} onChange={v => set('ruler', v)} />
                </div>

                <div className="a11y-group">
                  <p className="a11y-legend">
                    <Contrast size={15} /> Visual
                  </p>
                  <Toggle icon={Contrast} title="Alto contraste" text="Textos mais escuros e bordas mais fortes" checked={settings.contrast} onChange={v => set('contrast', v)} />
                  <Toggle icon={Link2} title="Destacar links" text="Sublinha todos os links da página" checked={settings.links} onChange={v => set('links', v)} />
                  <Toggle icon={Wind} title="Reduzir animações" text="Desliga movimentos e transições" checked={settings.motion} onChange={v => set('motion', v)} />
                </div>

                <div className="a11y-tips">
                  <Keyboard size={16} />
                  <p>
                    <b>Teclado:</b> Tab navega, Enter ativa e Esc fecha janelas. No leitor de livros, use as setas ← → para virar as páginas.
                  </p>
                </div>
              </div>

              <footer className="a11y-foot">
                <button type="button" className="a11y-reset" disabled={!active} onClick={() => setSettings(defaults)}>
                  <RotateCcw size={15} /> Restaurar padrão
                </button>
                <button type="button" className="a11y-done" onClick={() => setOpen(false)}>
                  Pronto
                </button>
              </footer>
            </section>
          </div>,
          document.body
        )}
    </>
  );
}
