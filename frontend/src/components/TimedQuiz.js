import { useEffect, useRef, useState } from 'react';
import { Timer, Play, Check, X, Flame, Star, ArrowRight, Trophy, Zap } from 'lucide-react';
import { Owl } from '@/components/LoginScene';
import api from '@/lib/api';

const SHAPES = ['▲', '◆', '●', '■'];
const FEEDBACK_MS = 2300;

// Alternativas em blocos coloridos (quiz livre e temporizado). Com `feedback`, mostra a certa e a errada.
export function QuizOptions({ options, selected, disabled, onSelect, feedback }) {
  return (
    <div className={`qz-options ${feedback ? 'has-feedback' : ''}`}>
      {options.map((o, i) => {
        const state = !feedback ? '' : i === feedback.correta ? 'is-right' : i === feedback.resposta ? 'is-wrong' : 'is-faded';
        return (
          <button key={i} type="button" className={`qz-option tone-${i} ${state}`} disabled={disabled} aria-pressed={selected === i} onClick={() => onSelect(i)} style={{ '--i': i }}>
            <b aria-hidden="true">{SHAPES[i] || String.fromCharCode(65 + i)}</b>
            <span>
              <small>{String.fromCharCode(65 + i)}</small>
              {o}
            </span>
            {state === 'is-right' ? <Check size={22} className="qz-option-mark" /> : state === 'is-wrong' ? <X size={22} className="qz-option-mark" /> : selected === i && !feedback && <Check size={18} className="qz-option-check" />}
          </button>
        );
      })}
    </div>
  );
}

function Burst({ good }) {
  const pieces = useRef(Array.from({ length: good ? 22 : 0 }, (_, i) => ({ angle: (i / 22) * 360, dist: 70 + Math.random() * 90, color: ['#22c55e', '#fde047', '#8b5cf6', '#ec4899', '#38bdf8'][i % 5] }))).current;
  return (
    <span className="tq-burst" aria-hidden="true">
      {pieces.map((p, i) => (
        <i key={i} style={{ '--a': `${p.angle}deg`, '--d': `${p.dist}px`, background: p.color }} />
      ))}
    </span>
  );
}

function TimerRing({ remaining, total }) {
  const ratio = Math.max(0, Math.min(1, remaining / total));
  const r = 26;
  const c = 2 * Math.PI * r;
  const tone = ratio > 0.5 ? 'is-ok' : ratio > 0.25 ? 'is-mid' : 'is-low';
  return (
    <div className={`tq-ring ${tone} ${remaining <= 5 ? 'is-urgent' : ''}`} role="timer" aria-label={`${remaining} segundos restantes`}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r={r} className="tq-ring-track" />
        <circle cx="32" cy="32" r={r} className="tq-ring-fill" strokeDasharray={c} strokeDashoffset={c * (1 - ratio)} />
      </svg>
      <strong>{remaining}</strong>
    </div>
  );
}

function Finish({ hits, total, history, onDone }) {
  const pct = total ? Math.round((hits / total) * 100) : 0;
  const [title, text] =
    pct === 100 ? ['Gabaritou! 🏆', 'Todas certas. Você é fera!'] : pct >= 70 ? ['Mandou muito bem! 🎉', 'Ótimo desempenho neste desafio.'] : pct >= 40 ? ['Bom trabalho! 💪', 'Revise as que errou e tente o próximo.'] : ['Não desista! 📚', 'Cada desafio é um treino. Releia o conteúdo e volte mais forte.'];
  return (
    <div className="tq-finish">
      {pct >= 70 && <Burst good />}
      <div className="tq-finish-art" aria-hidden="true">
        <span className="tq-finish-rays" />
        <Owl size={96} />
      </div>
      <div className="tq-score" style={{ '--p': pct }}>
        <span>
          <strong>
            {hits}
            <small>/{total}</small>
          </strong>
          <em>acertos</em>
        </span>
      </div>
      <h2>{title}</h2>
      <p>{text}</p>
      {history.some(Boolean) && (
        <div className="tq-dots" aria-label="Resultado de cada pergunta">
          {history.map((h, i) => (
            <span key={i} className={h ? (h.acertou ? 'is-right' : 'is-wrong') : ''} title={`Pergunta ${i + 1}`}>
              {h ? h.acertou ? <Check size={13} /> : <X size={13} /> : i + 1}
            </span>
          ))}
        </div>
      )}
      <button type="button" className="tq-next" onClick={onDone}>
        <Trophy size={18} /> Ver ranking da turma
      </button>
    </div>
  );
}

export default function TimedQuiz({ quiz, onComplete }) {
  const total = quiz.perguntas.length;
  const [session, setSession] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null); // { resultado, next, acertos }
  const [history, setHistory] = useState(() => Array(total).fill(null));
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [finished, setFinished] = useState(false);
  const lock = useRef(false);
  const advance = useRef(null);

  const show = value => {
    setSession(value);
    setSelected(null);
    setRemaining(Math.min(quiz.segundos, Math.max(0, Math.ceil((Date.parse(value.limite) - Date.now()) / 1000))));
  };
  const goOn = next => {
    clearTimeout(advance.current);
    setFeedback(null);
    if (next.concluido) setFinished(true);
    else show(next);
  };

  const start = async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(`/quizzes/${quiz.id}/start`);
      if (data.concluido) onComplete();
      else show(data);
    } catch {
      setError('Não foi possível iniciar ou retomar. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  const send = async answer => {
    if (lock.current || !session) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(`/quizzes/${quiz.id}/step`, { indice: session.indice, resposta: answer });
      const result = data.resultado;
      if (!result) return goOn(data);
      setHistory(h => h.map((x, i) => (i === result.indice ? result : x)));
      setScore(data.acertos ?? 0);
      setStreak(s => (result.acertou ? s + 1 : 0));
      setFeedback({ result, next: data });
      advance.current = setTimeout(() => goOn(data), FEEDBACK_MS);
    } catch {
      setError('Não foi possível confirmar a resposta. Retome para consultar a pergunta atual.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  useEffect(() => () => clearTimeout(advance.current), []);

  useEffect(() => {
    if (!session || error || feedback) return;
    const tick = () => {
      const seconds = Math.min(quiz.segundos, Math.max(0, Math.ceil((Date.parse(session.limite) - Date.now()) / 1000)));
      setRemaining(seconds);
      if (!seconds) send(-1);
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
    // Um novo prazo do servidor reinicia a contagem; o lock evita envios duplicados.
  }, [session, error, feedback]);

  if (error)
    return (
      <div className="tq-card tq-center" role="alert">
        <p>{error}</p>
        <button type="button" className="tq-next" disabled={busy} onClick={start}>
          Retomar quiz
        </button>
      </div>
    );

  if (finished) return <Finish hits={score} total={total} history={history} onDone={onComplete} />;

  if (!session)
    return (
      <div className="tq-intro">
        <div className="tq-intro-art" aria-hidden="true">
          <span className="tq-finish-rays" />
          <Owl size={100} />
          <span className="tq-intro-clock">
            <Timer size={24} />
          </span>
        </div>
        <h2>Prepare-se para o desafio!</h2>
        <div className="tq-rules">
          <span>
            <Zap size={16} /> <b>{total}</b> perguntas
          </span>
          <span>
            <Timer size={16} /> <b>{quiz.segundos}s</b> cada
          </span>
          <span>
            <Flame size={16} /> Acerte em sequência!
          </span>
        </div>
        <p>O tempo esgotado conta como erro e não dá para voltar às perguntas anteriores. Depois de cada resposta você vê se acertou.</p>
        <button type="button" className="tq-start" disabled={busy} onClick={start}>
          <Play size={20} fill="currentColor" /> Começar agora
        </button>
      </div>
    );

  const index = feedback ? feedback.result.indice : session.indice;
  const q = quiz.perguntas[index];
  const result = feedback?.result;

  return (
    <div className={`tq ${result ? (result.acertou ? 'is-right' : 'is-wrong') : ''}`}>
      <div className="tq-top">
        <div className="tq-steps" aria-label={`Pergunta ${index + 1} de ${total}`}>
          {history.map((h, i) => (
            <span key={i} className={h ? (h.acertou ? 'is-right' : 'is-wrong') : i === index ? 'is-current' : ''} />
          ))}
        </div>
        <div className="tq-meta">
          <span className="tq-chip">
            Pergunta <b>{index + 1}</b>/{total}
          </span>
          <span className="tq-chip is-score">
            <Star size={14} fill="currentColor" /> {score}
          </span>
          {streak >= 2 && (
            <span className="tq-chip is-streak" key={streak}>
              <Flame size={14} fill="currentColor" /> {streak} seguidas!
            </span>
          )}
          {!result && <TimerRing remaining={remaining} total={quiz.segundos} />}
        </div>
      </div>

      <h2 className="tq-question" key={index}>
        {q.texto}
      </h2>

      <QuizOptions key={index} options={q.opcoes} selected={result ? result.resposta : selected} disabled={busy || !!result || remaining === 0} onSelect={setSelected} feedback={result} />

      {result ? (
        <div className={`tq-feedback ${result.acertou ? 'is-right' : 'is-wrong'}`} role="status">
          {result.acertou && <Burst good />}
          <span className="tq-feedback-icon">{result.acertou ? <Check size={28} strokeWidth={3} /> : <X size={28} strokeWidth={3} />}</span>
          <div>
            <strong>{result.acertou ? (streak >= 3 ? `Imparável! ${streak} seguidas 🔥` : 'Acertou! +1 ponto') : result.esgotado ? 'O tempo acabou!' : 'Quase lá!'}</strong>
            <span>{result.acertou ? 'Mandou bem, continue assim.' : `A resposta certa era ${String.fromCharCode(65 + result.correta)}: ${q.opcoes[result.correta]}`}</span>
          </div>
          <button type="button" className="tq-next" onClick={() => goOn(feedback.next)}>
            {feedback.next.concluido ? 'Ver resultado' : 'Próxima'} <ArrowRight size={17} />
          </button>
          <i className="tq-feedback-bar" style={{ animationDuration: `${FEEDBACK_MS}ms` }} />
        </div>
      ) : (
        <div className="tq-actions">
          <button type="button" className="tq-confirm" disabled={busy || selected == null || remaining === 0} onClick={() => send(selected)}>
            {busy ? 'Confirmando…' : 'Confirmar resposta'} <Check size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
