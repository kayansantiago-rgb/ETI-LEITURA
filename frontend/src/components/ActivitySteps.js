import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ArrowLeft, ArrowRight, Send, Pencil, Check, ListChecks } from 'lucide-react';

const words = text => (String(text || '').trim().match(/\S+/g) || []).length;

function ReadOnlyAnswers({ activity, answers }) {
  return (
    <section className="as-readonly" aria-label="Suas respostas">
      <h2>
        <ListChecks size={18} /> Suas respostas
      </h2>
      <ol>
        {activity.perguntas.map((q, i) => (
          <li key={q.id}>
            <span className="as-q-number">{i + 1}</span>
            <div>
              <p className="as-q-text">{q.enunciado}</p>
              <p className="as-answer-text">{answers[q.id] || 'Sem resposta'}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="as-note">{activity.minha_resposta ? 'Entrega registrada. Acompanhe a correção ou aguarde uma nova tentativa.' : 'Esta atividade não aceita respostas neste momento.'}</p>
    </section>
  );
}

export default function ActivitySteps({ activity, answers, setAnswers, canAnswer, busy, onSubmit, draftStatus }) {
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState('');
  const heading = useRef(null);
  const first = useRef(true);
  const questions = activity.perguntas;
  const complete = q => !!answers[q.id]?.trim() && (q.tipo !== 'alternativa' || q.alternativas.includes(answers[q.id]));
  const completed = questions.filter(complete).length;
  const review = step === questions.length;
  const current = questions[step];

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [step]);

  const go = target => {
    setStep(target);
    setMessage('');
  };
  const next = () => {
    if (!complete(current)) {
      setMessage('Responda esta pergunta para continuar.');
      return;
    }
    go(step + 1);
  };
  const submit = e => {
    e.preventDefault();
    if (!review) return;
    const missing = questions.findIndex(q => !complete(q));
    if (missing >= 0) {
      setStep(missing);
      setMessage('Falta responder esta pergunta antes de entregar.');
      return;
    }
    onSubmit(e);
  };

  if (!canAnswer) return <ReadOnlyAnswers activity={activity} answers={answers} />;

  return (
    <form onSubmit={submit} className="as" aria-label="Responder atividade">
      <div className="as-progress">
        <div className="as-progress-head">
          <span ref={heading} tabIndex={-1}>
            {review ? 'Revisão final' : `Pergunta ${step + 1} de ${questions.length}`}
          </span>
          <b>
            <CheckCircle2 size={14} /> {completed}/{questions.length} respondidas
          </b>
        </div>
        <div className="as-dots" role="group" aria-label="Navegar pelas perguntas">
          {questions.map((q, i) => (
            <button
              type="button"
              key={q.id}
              disabled={busy}
              className={`${i === step ? 'is-current' : ''} ${complete(q) ? 'is-done' : ''}`}
              aria-label={`Ir para pergunta ${i + 1}${complete(q) ? ' (respondida)' : ''}`}
              aria-current={i === step ? 'step' : undefined}
              onClick={() => go(i)}
            >
              {complete(q) && i !== step ? <Check size={13} /> : i + 1}
            </button>
          ))}
          <button type="button" disabled={busy} className={`as-dot-review ${review ? 'is-current' : ''}`} aria-current={review ? 'step' : undefined} onClick={() => go(questions.length)}>
            Revisar
          </button>
        </div>
      </div>

      <fieldset disabled={busy} className="as-card">
        {review ? (
          <div className="as-review">
            <h2>Confira antes de entregar</h2>
            <p>Toque em uma resposta para ajustar. Depois de enviada, só o professor pode liberar uma nova tentativa.</p>
            <ol>
              {questions.map((q, i) => (
                <li key={q.id} className={complete(q) ? '' : 'is-missing'}>
                  <button type="button" onClick={() => go(i)}>
                    <span className="as-q-number">{i + 1}</span>
                    <span className="min-w-0">
                      <span className="as-q-text">{q.enunciado}</span>
                      <span className="as-answer-text">{answers[q.id] || 'Falta responder'}</span>
                    </span>
                    <Pencil size={15} className="as-edit" />
                  </button>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="as-question" key={current.id}>
            <span className="as-badge">{current.tipo === 'alternativa' ? 'Múltipla escolha' : 'Resposta escrita'}</span>
            <label htmlFor={`answer-${current.id}`} className="as-prompt">
              {current.enunciado}
            </label>
            {current.tipo === 'alternativa' ? (
              <div className="as-options" role="radiogroup" aria-label={current.enunciado}>
                {current.alternativas.map((option, i) => {
                  const selected = answers[current.id] === option;
                  return (
                    <label key={option} className={`as-option ${selected ? 'is-selected' : ''}`}>
                      <input type="radio" name={current.id} value={option} checked={selected} onChange={() => setAnswers({ ...answers, [current.id]: option })} />
                      <b>{String.fromCharCode(65 + i)}</b>
                      <span>{option}</span>
                      {selected && <Check size={18} className="as-option-check" />}
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="as-write">
                <textarea
                  id={`answer-${current.id}`}
                  rows={9}
                  maxLength={10000}
                  value={answers[current.id] || ''}
                  onChange={e => setAnswers({ ...answers, [current.id]: e.target.value })}
                  placeholder="Escreva sua resposta com suas palavras…"
                />
                <span className="as-count">{words(answers[current.id])} palavras</span>
              </div>
            )}
          </div>
        )}
        {message && (
          <p role="alert" className="as-error">
            {message}
          </p>
        )}
      </fieldset>

      <div className="as-footer">
        <button type="button" className="as-btn-ghost" disabled={busy || step === 0} onClick={() => go(step - 1)}>
          <ArrowLeft size={16} /> Anterior
        </button>
        <span className="as-draft" role="status">
          {draftStatus}
        </span>
        {review ? (
          <button key="deliver" type="submit" className="as-btn-primary" disabled={busy || completed !== questions.length}>
            <Send size={16} /> {busy ? 'Enviando…' : activity.minha_resposta ? 'Enviar nova tentativa' : 'Enviar respostas'}
          </button>
        ) : (
          <button key="advance" type="button" className="as-btn-primary" disabled={busy} onClick={next}>
            {step === questions.length - 1 ? 'Revisar' : 'Próxima'} <ArrowRight size={16} />
          </button>
        )}
      </div>
    </form>
  );
}
