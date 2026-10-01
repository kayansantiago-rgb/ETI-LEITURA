import { useEffect, useRef, useState } from 'react';
import { Timer, Play, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

// Alternativas em blocos coloridos, usadas no quiz livre e no temporizado.
export function QuizOptions({ options, selected, disabled, onSelect }) {
  return (
    <div className="qz-options">
      {options.map((o, i) => (
        <button key={i} type="button" className={`qz-option tone-${i}`} disabled={disabled} aria-pressed={selected === i} onClick={() => onSelect(i)}>
          <b>{String.fromCharCode(65 + i)}</b>
          <span>{o}</span>
          {selected === i && <Check size={18} className="qz-option-check" />}
        </button>
      ))}
    </div>
  );
}

export default function TimedQuiz({ quiz, onComplete }) {
  const [session, setSession] = useState(null), [remaining, setRemaining] = useState(0), [selected, setSelected] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const lock = useRef(false);
  const accept = value => { if (value.concluido) onComplete(); else { setSession(value); setSelected(null); setRemaining(Math.max(0, Math.ceil((Date.parse(value.limite)-Date.now())/1000))); } };
  const start = async () => { setBusy(true); setError(''); try {accept((await api.post(`/quizzes/${quiz.id}/start`)).data);}catch {setError('Não foi possível iniciar ou retomar. Tente novamente.');}finally {setBusy(false);} };
  const send = async (answer) => {
    if (lock.current || !session) return;
    lock.current=true; setBusy(true); setError('');
    try {accept((await api.post(`/quizzes/${quiz.id}/step`,{indice:session.indice,resposta:answer})).data);}
    catch {setError('Não foi possível confirmar a resposta. Retome para consultar a pergunta atual.');}
    finally {lock.current=false;setBusy(false);}
  };
  useEffect(()=>{
    if(!session || error) return;
    const tick=()=>{const seconds=Math.max(0,Math.ceil((Date.parse(session.limite)-Date.now())/1000));setRemaining(seconds);if(!seconds)send(-1);};
    tick();const timer=setInterval(tick,500);return()=>clearInterval(timer);
    // A new server deadline restarts the countdown; the ref prevents duplicate sends.
  },[session,error]);
  if(error) return <div className="ws-empty" role="alert"><p>{error}</p><Button className="qz-btn-primary mt-4" disabled={busy} onClick={start}>Retomar quiz</Button></div>;
  if(!session) return <div className="qz-intro"><span className="qz-intro-icon"><Timer size={30}/></span><h2>Prepare-se para o desafio</h2><p>Você terá <b>{quiz.segundos} segundos</b> por pergunta. O tempo esgotado conta como erro e não é possível voltar às perguntas anteriores.</p><Button className="qz-btn-primary qz-btn-lg" disabled={busy} onClick={start}><Play size={18}/> Começar agora</Button></div>;
  const q=quiz.perguntas[session.indice];
  const ratio=Math.min(1,remaining/quiz.segundos);
  return <div className="qz-play">
    <div className="qz-play-progress">{quiz.perguntas.map((_,i)=><span key={i} className={i===session.indice?'is-current':i<session.indice?'is-done':''}/>)}</div>
    <div className="qz-timer-row"><p className="qz-play-count">Pergunta {session.indice+1} de {quiz.perguntas.length}</p><strong role="timer" className={`qz-timer ${remaining<=5?'is-urgent':''}`}><Timer size={16}/>{remaining}s</strong></div>
    <div className="qz-time-bar"><span style={{width:`${ratio*100}%`}}/></div>
    <h2 className="qz-prompt">{q.texto}</h2>
    <QuizOptions options={q.opcoes} selected={selected} disabled={busy||remaining===0} onSelect={setSelected}/>
    <div className="qz-play-actions"><span/><Button className="qz-btn-primary" disabled={busy||selected==null||remaining===0} onClick={()=>send(selected)}>{busy?'Confirmando…':'Confirmar resposta'} <Check size={16}/></Button></div>
  </div>;
}
