import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageIntro from '@/components/PageIntro';
import { getUser } from '@/lib/auth';
import { TURMAS } from '@/constants/turmas';
import api from '@/lib/api';
import { toast } from 'sonner';
import '@/quizzes.css';

const question = () => ({ texto: '', opcoes: ['', '', '', ''], correta: 0 });
const message = e => typeof e.response?.data?.detail === 'string' ? e.response.data.detail : 'Não foi possível concluir. Confira os campos e tente novamente.';
export default function Quizzes() {
  const user = getUser(), staff = ['admin', 'teacher'].includes(user?.role);
  const [items, setItems] = useState(null), [failed, setFailed] = useState(false), [form, setForm] = useState(null), [quiz, setQuiz] = useState(null), [answers, setAnswers] = useState([]), [step, setStep] = useState(0), [busy, setBusy] = useState(false);
  const load = () => { setFailed(false); api.get('/quizzes').then(r=>setItems(r.data)).catch(()=>setFailed(true)); };
  useEffect(load, []);
  const open = async id => { setBusy(true); try { const r=await api.get(`/quizzes/${id}`); setQuiz(r.data); setStep(0); setAnswers([]); } catch(e){toast.error(message(e));} finally{setBusy(false);} };
  const create = async e => {e.preventDefault();setBusy(true);try {await api.post('/quizzes',form);setForm(null);load();toast.success('Quiz publicado para a turma.');}catch(e){toast.error(message(e));}finally{setBusy(false);}};
  const submit = async () => {setBusy(true);try {await api.post(`/quizzes/${quiz.id}/answers`,{respostas:answers});const r=await api.get(`/quizzes/${quiz.id}`);setQuiz(r.data);toast.success('Respostas enviadas!');}catch(e){toast.error(message(e));}finally{setBusy(false);}};
  const close = async () => {setBusy(true);try{await api.post(`/quizzes/${quiz.id}/close`);setQuiz({...quiz,aberto:false});load();}catch(e){toast.error(message(e));}finally{setBusy(false);}};
  const patch = (index, update) => setForm(v=>({...v,perguntas:v.perguntas.map((q,i)=>i===index?{...q,...update}:q)}));
  return <DashboardLayout><div className="quiz-space">
    <PageIntro section="APRENDER PARTICIPANDO" title="Quizzes interativos" description={staff?'Crie desafios para sua turma e acompanhe as respostas.':'Teste suas descobertas, uma pergunta de cada vez.'}/>
    {!quiz && !form && <>
      {staff && <button className="quiz-primary" onClick={()=>setForm({titulo:'',turma:'',perguntas:[question()]})}>Criar quiz</button>}
      {failed ? <p role="alert">Não foi possível carregar. <button onClick={load}>Tentar novamente</button></p> : !items ? <p role="status">Carregando quizzes…</p> : <div className="quiz-grid">{items.map(q=><article className="quiz-card" key={q.id}><span>{q.turma} · {q.aberto?'Aberto':'Encerrado'}</span><h2>{q.titulo}</h2><p>{q.total} perguntas · Uma tentativa por aluno</p><button disabled={busy} onClick={()=>open(q.id)}>{staff?'Acompanhar turma':'Abrir quiz'} →</button></article>)}</div>}
      {items?.length===0 && <p className="empty-state">{staff?'Crie o primeiro quiz para sua turma.':'Os quizzes publicados para sua turma aparecerão aqui.'}</p>}
    </>}
    {form && <form onSubmit={create} className="quiz-editor"><fieldset disabled={busy}>
      <label>Título do quiz<input required maxLength={160} value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})}/></label>
      <label>Turma<select required value={form.turma} onChange={e=>setForm({...form,turma:e.target.value})}><option value="">Selecione a turma</option>{TURMAS.filter(t=>user.role==='admin'||user.turmas?.includes(t.value)).map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
      {form.perguntas.map((q,i)=><section className="quiz-question-editor" key={i}><h2>Pergunta {i+1}</h2><label>Enunciado<textarea required maxLength={2000} value={q.texto} onChange={e=>patch(i,{texto:e.target.value})}/></label><p>Preencha as quatro alternativas e marque a correta.</p>{q.opcoes.map((o,j)=><div className="quiz-option-editor" key={j}><input type="radio" name={`correct-${i}`} aria-label={`Alternativa ${j+1} correta na pergunta ${i+1}`} checked={q.correta===j} onChange={()=>patch(i,{correta:j})}/><input aria-label={`Pergunta ${i+1}, alternativa ${j+1}`} required maxLength={500} value={o} onChange={e=>patch(i,{opcoes:q.opcoes.map((v,k)=>k===j?e.target.value:v)})}/></div>)}{form.perguntas.length>1&&<button type="button" onClick={()=>setForm({...form,perguntas:form.perguntas.filter((_,n)=>n!==i)})}>Remover pergunta</button>}</section>)}
      <div className="quiz-actions"><button type="button" disabled={form.perguntas.length>=20} onClick={()=>setForm({...form,perguntas:[...form.perguntas,question()]})}>+ Adicionar pergunta</button><button type="button" onClick={()=>setForm(null)}>Cancelar</button><button className="quiz-primary" type="submit">{busy?'Publicando…':'Publicar quiz'}</button></div>
    </fieldset></form>}
    {quiz && <><button disabled={busy} onClick={()=>{setQuiz(null);load();}}>← Todos os quizzes</button><section className="quiz-play"><span>{quiz.turma}</span><h2>{quiz.titulo}</h2>
      {staff ? <><p>{quiz.aberto?'Recebendo respostas':'Quiz encerrado'} · {quiz.resultados.length} participantes</p><div className="quiz-actions"><button disabled={busy} onClick={()=>open(quiz.id)}>Atualizar resultados</button>{quiz.aberto&&<button disabled={busy} onClick={close}>Encerrar quiz</button>}</div><div className="quiz-results">{quiz.resultados.map(r=><div key={r.user_id}><strong>{r.nome}</strong><span>{r.acertos} de {r.total} acertos</span></div>)}{!quiz.resultados.length&&<p>Aguardando as primeiras respostas.</p>}</div></> : quiz.resultado ? <><div className="quiz-score"><strong>{quiz.resultado.acertos}/{quiz.resultado.total}</strong><p>Desafio concluído! Confira suas respostas.</p></div>{quiz.perguntas.map((q,i)=><article className="quiz-review" key={i}><h3>{i+1}. {q.texto}</h3><p>{quiz.resultado.respostas[i]===q.correta?'Resposta correta':'Vale revisar'} · Você marcou: {q.opcoes[quiz.resultado.respostas[i]]}</p><strong>Resposta correta: {q.opcoes[q.correta]}</strong></article>)}</> : !quiz.aberto ? <p>Este quiz foi encerrado pelo professor.</p> : <>
        <div className="quiz-progress"><span style={{width:`${(step+1)/quiz.perguntas.length*100}%`}}/></div><p>Pergunta {step+1} de {quiz.perguntas.length}</p><h3 className="quiz-prompt">{quiz.perguntas[step].texto}</h3><div className="quiz-options">{quiz.perguntas[step].opcoes.map((o,i)=><button key={i} disabled={busy} aria-pressed={answers[step]===i} onClick={()=>setAnswers(v=>{const next=[...v];next[step]=i;return next;})}><b>{String.fromCharCode(65+i)}</b>{o}</button>)}</div>
        <div className="quiz-actions"><button disabled={busy||step===0} onClick={()=>setStep(v=>v-1)}>Anterior</button>{step<quiz.perguntas.length-1?<button className="quiz-primary" disabled={answers[step]==null} onClick={()=>setStep(v=>v+1)}>Próxima pergunta →</button>:<button className="quiz-primary" disabled={busy||quiz.perguntas.some((_,i)=>answers[i]==null)} onClick={submit}>{busy?'Enviando…':'Concluir quiz'}</button>}</div><p className="quiz-hint">Você pode revisar suas escolhas antes de concluir. A correção aparece ao enviar.</p>
      </>}
    </section></>}
  </div></DashboardLayout>;
}
