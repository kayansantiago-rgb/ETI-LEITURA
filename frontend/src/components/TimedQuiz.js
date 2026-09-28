import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';

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
  if(error) return <div role="alert"><p>{error}</p><button disabled={busy} onClick={start}>Retomar quiz</button></div>;
  if(!session) return <div className="quiz-timed-intro"><h3>Prepare-se para o desafio</h3><p>Você terá {quiz.segundos} segundos por pergunta. O tempo esgotado conta como erro. As respostas são confirmadas uma a uma, sem voltar às anteriores.</p><button className="quiz-primary" disabled={busy} onClick={start}>Iniciar ou retomar</button></div>;
  const q=quiz.perguntas[session.indice];
  return <><div className="quiz-timer-count"><span>Pergunta {session.indice+1} de {quiz.perguntas.length}</span><strong role="timer">{remaining}s</strong></div><h3 className="quiz-prompt">{q.texto}</h3><div className="quiz-options">{q.opcoes.map((o,i)=><button key={i} disabled={busy||remaining===0} aria-pressed={selected===i} onClick={()=>setSelected(i)}><b>{String.fromCharCode(65+i)}</b>{o}</button>)}</div><div className="quiz-actions"><button className="quiz-primary" disabled={busy||selected==null||remaining===0} onClick={()=>send(selected)}>{busy?'Confirmando…':'Confirmar resposta'}</button></div></>;
}
