import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Headphones, Play, Pause, Square, Gauge } from 'lucide-react';
import { toast } from 'sonner';

const SPEEDS = [0.75, 1, 1.25, 1.5];
const MAX_CHUNK = 220;
const supported = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

const savedSpeed = () => {
  try {
    const v = Number(localStorage.getItem('eti-read-aloud-speed'));
    return SPEEDS.includes(v) ? v : 1;
  } catch {
    return 1;
  }
};

// Texto da página do PDF, juntando hifenizações e quebrando em trechos curtos
// (o Chrome interrompe falas muito longas).
async function pageChunks(pdf, number) {
  const page = await pdf.getPage(number);
  const content = await page.getTextContent();
  const text = content.items
    .map(item => item.str + (item.hasEOL ? '\n' : ' '))
    .join('')
    .replace(/-\n(\p{L})/gu, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return [];
  const sentences = text.match(/[^.!?…;:]+[.!?…;:]*["”»)]*\s*/g) || [text];
  const chunks = [];
  let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length <= MAX_CHUNK) {
      current += sentence;
      continue;
    }
    if (current) chunks.push(current.trim());
    current = '';
    if (sentence.length <= MAX_CHUNK) current = sentence;
    else {
      // Frase muito longa: divide por vírgulas e, se preciso, por palavras.
      for (const part of sentence.split(/(?<=,)\s+|\s+/)) {
        if ((current + ' ' + part).length > MAX_CHUNK && current) {
          chunks.push(current.trim());
          current = '';
        }
        current += (current ? ' ' : '') + part;
      }
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find(v => /^pt[-_]BR/i.test(v.lang) && /natural|online|google/i.test(v.name)) ||
    voices.find(v => /^pt[-_]BR/i.test(v.lang)) ||
    voices.find(v => /^pt/i.test(v.lang)) ||
    null
  );
}

// Leitura em voz alta da página atual do PDF, com a voz do próprio aparelho.
// Ao terminar a página, avança sozinho e continua lendo.
export default function ReadAloud({ pdf, page, count, onNext }) {
  const [state, setState] = useState('off'); // off | loading | playing | paused
  const [speed, setSpeed] = useState(savedSpeed);
  const [progress, setProgress] = useState([0, 0]);
  const chunks = useRef([]);
  const index = useRef(0);
  const token = useRef(0);
  const loadedPage = useRef(null);
  const speedRef = useRef(speed);
  const active = state !== 'off';

  const silence = () => {
    token.current += 1;
    window.speechSynthesis.cancel();
  };

  const speakFrom = useCallback(
    (i, mine) => {
      if (mine !== token.current) return;
      if (i >= chunks.current.length) {
        if (page < count) onNext();
        else {
          setState('off');
          toast.success('Fim do livro! 🎉');
        }
        return;
      }
      index.current = i;
      setProgress([i + 1, chunks.current.length]);
      const utterance = new SpeechSynthesisUtterance(chunks.current[i]);
      const voice = pickVoice();
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang || 'pt-BR';
      utterance.rate = speedRef.current;
      utterance.onend = () => speakFrom(i + 1, mine);
      utterance.onerror = e => {
        if (mine !== token.current || ['interrupted', 'canceled'].includes(e.error)) return;
        speakFrom(i + 1, mine);
      };
      window.speechSynthesis.speak(utterance);
    },
    [page, count, onNext]
  );

  // Carrega e lê a página sempre que ela muda enquanto a leitura está ligada.
  useEffect(() => {
    if (!active || !pdf || loadedPage.current === page) return;
    silence();
    const mine = token.current;
    loadedPage.current = page;
    setState('loading');
    pageChunks(pdf, page)
      .then(list => {
        if (mine !== token.current) return;
        chunks.current = list;
        if (!list.length) {
          toast.info(`A página ${page} é uma imagem, sem texto para ler.`, { id: 'read-aloud-empty' });
          if (page < count) onNext();
          else setState('off');
          return;
        }
        setState('playing');
        speakFrom(0, mine);
      })
      .catch(() => {
        if (mine !== token.current) return;
        setState('off');
        toast.error('Não foi possível ler esta página em voz alta.');
      });
  }, [active, pdf, page]);

  useEffect(() => () => supported() && window.speechSynthesis.cancel(), []);

  if (!supported()) return null;

  const start = () => {
    loadedPage.current = null;
    setState('loading');
  };
  const stop = () => {
    silence();
    loadedPage.current = null;
    setState('off');
  };
  const pause = () => {
    silence();
    setState('paused');
  };
  const resume = () => {
    silence();
    setState('playing');
    speakFrom(index.current, token.current);
  };
  const changeSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    speedRef.current = next;
    try {
      localStorage.setItem('eti-read-aloud-speed', String(next));
    } catch {}
    if (state === 'playing') {
      silence();
      speakFrom(index.current, token.current);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`rd-icon rd-listen ${active ? 'is-active' : ''}`}
        onClick={active ? stop : start}
        disabled={!pdf}
        aria-pressed={active}
        aria-label={active ? 'Parar leitura em voz alta' : 'Ouvir esta página'}
        title={active ? 'Parar leitura em voz alta' : 'Ouvir o livro'}
      >
        <Headphones size={18} />
      </button>
      {active &&
        createPortal(
          <div className={`ra is-${state}`} role="region" aria-label="Leitura em voz alta">
            <span className="ra-wave" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            <span className="ra-label">
              <strong>{state === 'loading' ? 'Preparando…' : state === 'paused' ? 'Pausado' : 'Ouvindo'}</strong>
              <small>
                Página {page}
                {progress[1] > 1 && state !== 'loading' ? ` · trecho ${progress[0]} de ${progress[1]}` : ''}
              </small>
            </span>
            <button type="button" className="ra-speed" onClick={changeSpeed} aria-label={`Velocidade ${speed}x. Trocar velocidade`} title="Velocidade">
              <Gauge size={14} /> {String(speed).replace('.', ',')}x
            </button>
            <button
              type="button"
              className="ra-main"
              onClick={state === 'playing' ? pause : resume}
              disabled={state === 'loading'}
              aria-label={state === 'playing' ? 'Pausar' : 'Continuar'}
            >
              {state === 'playing' ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            </button>
            <button type="button" className="ra-stop" onClick={stop} aria-label="Parar">
              <Square size={14} fill="currentColor" />
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
