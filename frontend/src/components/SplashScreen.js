import { useCallback, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Owl } from '@/components/LoginScene';

const seenKey = 'eti-splash-seen';
function unseen() {
  try {
    return sessionStorage.getItem(seenKey) !== '1';
  } catch {
    return true;
  }
}
function reducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches || !!JSON.parse(localStorage.getItem('eti-accessibility'))?.motion;
  } catch {
    return false;
  }
}

const TAGLINES = {
  welcome: 'Ler, imaginar, transformar.',
  login: 'Abrindo a sua estante…',
  logout: 'Até a próxima leitura!'
};

export default function SplashScreen({ children }) {
  const [visible, setVisible] = useState(unseen);
  const [quiet, setQuiet] = useState(reducedMotion);
  const [kind, setKind] = useState('welcome');

  useEffect(() => {
    const show = e => {
      if (!['login', 'logout'].includes(e.detail)) return;
      try {
        sessionStorage.removeItem(seenKey);
      } catch {}
      setKind(e.detail);
      setQuiet(reducedMotion());
      setVisible(true);
    };
    window.addEventListener('eti-auth-transition', show);
    return () => window.removeEventListener('eti-auth-transition', show);
  }, []);

  const finish = useCallback(() => {
    try {
      sessionStorage.setItem(seenKey, '1');
    } catch {}
    setVisible(false);
  }, []);

  const duration = quiet ? 500 : 2200;

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(finish, duration);
    const skip = e => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', skip);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', skip);
    };
  }, [visible, duration, finish]);

  if (!visible) return children;

  return (
    <main className={`sl ${quiet ? 'is-quiet' : ''}`} aria-label="Abertura da ETI LEITURA" data-transition={kind} style={{ '--sl-duration': `${duration}ms` }}>
      <span className="sl-orb is-a" aria-hidden="true" />
      <span className="sl-orb is-b" aria-hidden="true" />
      <div className="sl-sparkles" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <i key={i} style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, animationDelay: `${(i % 7) * 0.3}s` }} />
        ))}
      </div>

      <div className="sl-center">
        <div className="sl-stage" aria-hidden="true">
          <div className="sl-glow" />
          <div className="sl-owl">
            <Owl size={150} />
          </div>
          <div className="sl-book">
            <div className="sl-cover" />
            <div className="sl-page is-left" />
            <div className="sl-page is-right" />
            <div className="sl-flip is-1" />
            <div className="sl-flip is-2" />
            <div className="sl-flip is-3" />
          </div>
          <span className="sl-letter is-a">A</span>
          <span className="sl-letter is-b">?</span>
          <span className="sl-letter is-c">✦</span>
        </div>

        <h1 className="sl-title">
          <strong>ETI</strong> <span>LEITURA</span>
        </h1>
        <p className="sl-tagline">{TAGLINES[kind] || TAGLINES.welcome}</p>
        <div className="sl-progress" aria-hidden="true">
          <span />
        </div>
      </div>

      <button autoFocus type="button" className="sl-skip" onClick={finish}>
        {kind === 'logout' ? 'Voltar ao login' : 'Entrar na plataforma'} <ArrowRight size={16} />
      </button>
    </main>
  );
}
