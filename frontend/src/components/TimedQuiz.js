import { useEffect, useRef, useState } from 'react';
import { Timer, Play, Check, X, Flame, Star, ArrowRight, Zap, Trophy } from 'lucide-react';
import { Owl } from '@/components/LoginScene';
import api from '@/lib/api';

const runKey = id => `eti-quiz-run:${id}`;

// Alternativas (quiz livre e temporizado). Com `feedback`, mostra a certa em verde e a escolhida errada em vermelho.
export function QuizOptions({ options, selected, disabled, onSelect, feedback }) {
  return (
    <div className={`qz-options ${feedback ? 'has-feedback' : ''}`}>
      {options.map((o, i) => {
        const state = !feedback ? '' : i === feedback.correta ? 'is-right' : i === feedback.resposta ? 'is-wrong' : 'is-faded';
        return (
          <button key={i} type="button" className={`qz-option tone-${i} ${state}`} disabled={disabled} aria-pressed={selected === i} onClick={() => onSelect(i)} style={{ '--i': i }}>
            <b aria-hidden="true">{String.fromCharCode(65 + i)}</b>
            <span>{o}</span>
            {state === 'is-right' ? <Check size={22} className="qz-option-mark" /> : state === 'is-wrong' ? <X size={22} className="qz-option-mark" /> : selected === i && !feedback && <Check size={18} className="qz-option-check" />}
          </button>
        );
      })}
    </div>
  );
}

function Burst() {
  const pieces = useRef(Array.from({ length: 22 }, (_, i) => ({ angle: (i / 22) * 360, dist: 70 + Math.random() * 90, color: ['#22c55e', '#fde047', '#8b5cf6', '#ec4899', '#38bdf8'][i % 5] }))).current;
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

export default function TimedQuiz({ quiz, onComplete }) {
  const total = quiz.perguntas.length;
  const [session, setSession] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null); // { result, next, history }
  const [history, setHistory] = useState(() => Array(total).fill(null));
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const lock = useRef(false);

  const show = value => {
    setSession(value);
    setSelected(null);
    setRemaining(Math.max(0, Math.ceil((Date.parse(value.limite) - Date.now()) / 1000)));
  };
  // Guarda o desempenho desta partida para a tela de vitória (velocidade, sequência).
  const finish = list => {
    try {
      sessionStorage.setItem(runKey(quiz.id), JSON.stringify(list));
    } catch {}
    onComplete();
  };

  const request = async (path, body) => {
    setBusy(true);
    setError('');
    try {
      return (await api.post(`/quizzes/${quiz.id}/${path}`, body)).data;
    } catch {
      setError('Não foi possível falar com o servidor. Retome para continuar de onde parou.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    const data = await request('start');
    if (!data) return;
    if (data.concluido) onComplete();
    else if (!data.limite) {
      const opened = await request('continue');
      if (opened) show(opened);
    } else show(data);
  };

  const send = async answer => {
    if (lock.current || !session) return;
    lock.current = true;
    const used = Math.max(0, quiz.segundos - remaining);
    const data = await request('step', { indice: session.indice, resposta: answer });
    lock.current = false;
    if (!data) return;
    const result = data.resultado;
    if (!result) return data.concluido ? finish(history) : show(data);
    const updated = history.map((x, i) => (i === result.indice ? { ...result, tempo: used } : x));
    setHistory(updated);
    setScore(data.acertos ?? 0);
    setStreak(s => (result.acertou ? s + 1 : 0));
    setFeedback({ result, next: data, history: updated });
  };

  // A pergunta fica na tela com o resultado até o aluno tocar em "Próxima".
  const next = async () => {
    if (!feedback || busy) return;
    if (feedback.next.concluido) return finish(feedback.history);
    const opened = await request('continue');
    if (!opened) return;
    setFeedback(null);
    if (opened.concluido) finish(feedback.history);
    else show(opened);
  };

  useEffect(() => {
    if (!session || error || feedback) return;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((Date.parse(session.limite) - Date.now()) / 1000));
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
      <div className="tq-intro" role="alert">
        <p>{error}</p>
        <button type="button" className="tq-next" disabled={busy} onClick={start}>
          Retomar quiz
        </button>
      </div>
    );

  if (!session)
    return (
      <div className="tq-intro">
        <div className="tq-intro-art" aria-hidden="true">
          <span className="tq-finish-rays" />
          <Owl size={92} />
          <span className="tq-intro-clock">
            <Timer size={22} />
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
            <Flame size={16} /> Bônus por sequência
          </span>
          <span>
            <Trophy size={16} /> Até 3 estrelas
          </span>
        </div>
        <p>Responda rápido para ganhar mais XP. O tempo esgotado conta como erro e não dá para voltar às perguntas anteriores.</p>
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
            <Star size={14} fill="currentColor" /> {score} {score === 1 ? 'acerto' : 'acertos'}
          </span>
          {streak >= 2 && (
            <span className="tq-chip is-streak" key={streak}>
              <Flame size={14} fill="currentColor" /> {streak} seguidas!
            </span>
          )}
          {!result && <TimerRing remaining={remaining} total={quiz.segundos} />}
        </div>
      </div>

      <h2 className="tq-question" key={`q-${index}`}>
        {q.texto}
      </h2>

      <QuizOptions key={`o-${index}`} options={q.opcoes} selected={result ? result.resposta : selected} disabled={busy || !!result || remaining === 0} onSelect={setSelected} feedback={result} />

      {result ? (
        <div className={`tq-feedback ${result.acertou ? 'is-right' : 'is-wrong'}`} role="status">
          {result.acertou && <Burst />}
          <span className="tq-feedback-icon">{result.acertou ? <Check size={26} strokeWidth={3} /> : <X size={26} strokeWidth={3} />}</span>
          <div>
            <strong>{result.acertou ? (streak >= 3 ? `Imparável! ${streak} seguidas 🔥` : 'Acertou! +100 XP') : result.esgotado ? 'O tempo acabou!' : 'Quase lá!'}</strong>
            <span>{result.acertou ? 'Mandou bem, continue assim.' : `A resposta certa era ${String.fromCharCode(65 + result.correta)}: ${q.opcoes[result.correta]}`}</span>
          </div>
          <button type="button" className="tq-next" disabled={busy} onClick={next} autoFocus>
            {feedback.next.concluido ? 'Ver meu resultado' : 'Próxima'} <ArrowRight size={17} />
          </button>
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
