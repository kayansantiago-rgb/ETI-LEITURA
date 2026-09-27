import {publicationLabel} from '@/lib/publication';
import SubjectBadge from '@/components/SubjectBadge';
import ActivityLibrary from '@/components/ActivityLibrary';
import StatusBadge,{activityState} from '@/components/StatusBadge';
import EmptyCollection from '@/components/EmptyCollection';
import ActivityForm from '@/components/ActivityForm';
import { useEffect, useState } from 'react';
import { Link,useSearchParams } from 'react-router-dom';
import { Plus, ClipboardList, ArrowRight } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';
export const deadline=value=>value?new Date(value+'T12:00:00').toLocaleDateString('pt-BR'):'Sem prazo';
export const activityError=(e,fallback)=>typeof e.response?.data?.detail==='string'?e.response.data.detail:fallback;
export default function Activities(){
 const admin=['admin','teacher'].includes(getUser()?.role);const [params]=useSearchParams();
 const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false),[creating,setCreating]=useState(()=>admin&&params.get('nova')==='1');
 const [tab,setTab]=useState('published'),[draft,setDraft]=useState(()=>params.get('turma')?{titulo:'',descricao:'',turma:params.get('turma'),perguntas:[{enunciado:'',tipo:'texto',alternativas:['','']}]}:null);
 const load=async()=>{setFailed(false);setLoading(true);try{setItems((await api.get('/activities')).data);}catch{setFailed(true);}finally{setLoading(false);}};
 useEffect(()=>{load();},[]);
 const visibleItems=items.filter(a=>!admin||(tab==='scheduled'?a.agendada:!a.agendada));

 return <DashboardLayout><div><div className="teacher-heading"><div><p className="eyebrow">{admin?'PLANEJAMENTO E APRENDIZAGEM':'SEU ESPAÇO DE APRENDIZAGEM'}</p><h1>{admin?'Atividades da escola':'Minhas atividades'}</h1><p className="text-muted-foreground mt-3">{admin?'Prepare perguntas, publique para uma turma e acompanhe as respostas.':'Veja as propostas dos professores, responda e acompanhe seu feedback.'}</p></div>{admin&&!creating&&tab!=='models'&&<Button onClick={()=>{setDraft(null);setCreating(true);}}><Plus/>Criar atividade</Button>}</div>
 {admin&&<div className="flex flex-wrap gap-2 mb-6" aria-label="Área de atividades"><Button variant={tab==='published'?'default':'outline'} aria-pressed={tab==='published'} onClick={()=>{setTab('published');setCreating(false);}}>Publicadas</Button><Button variant={tab==='scheduled'?'default':'outline'} aria-pressed={tab==='scheduled'} onClick={()=>{setTab('scheduled');setCreating(false);}}>Agendadas ({items.filter(a=>a.agendada).length})</Button><Button variant={tab==='models'?'default':'outline'} aria-pressed={tab==='models'} onClick={()=>{setTab('models');setCreating(false);}}>Meus modelos</Button></div>}
 {tab==='models'?<ActivityLibrary onUse={source=>{setDraft(source);setTab('published');setCreating(true);}}/>:<>
 {creating&&<ActivityForm draft={draft} onCancel={()=>setCreating(false)} onSaved={saved=>{setCreating(false);setTab(saved.publicar_em&&new Date(saved.publicar_em)>new Date()?'scheduled':'published');load();}}/>}
 {loading?<p role="status" className="empty-state">Carregando atividades…</p>:failed?<div role="alert" className="empty-state">Não foi possível carregar. <button className="underline" onClick={load}>Tentar novamente</button></div>:!visibleItems.length?<EmptyCollection icon={ClipboardList} title={admin?(tab==='scheduled'?'Seu planejamento, no tempo certo.':'Sua próxima proposta começa aqui.'):'Novas propostas estão a caminho.'} description={admin?(tab==='scheduled'?'Ao criar uma atividade, escolha Agendar publicação para definir quando os alunos poderão acessar.':'Prepare uma atividade, escolha a turma e acompanhe cada resposta.'):'As atividades dos seus professores vão aparecer neste espaço.'} action={admin?'Criar primeira atividade':undefined} onAction={()=>{setDraft(null);setCreating(true);}}/>:<div className="activity-collection">{visibleItems.map(a=><article key={a.id} className="panel flex flex-col"><div className="flex items-center justify-between gap-2 mb-4"><span className="activity-badge">{a.turma==='TODAS'?'Todas as turmas':a.turma}</span><StatusBadge state={activityState(a,admin)} label={admin&&!a.agendada&&a.encerrada?'Encerrada':undefined}/></div><div className="mb-3"><SubjectBadge subject={a.disciplina}/></div><h2 className="text-lg font-semibold mb-3">{a.titulo}</h2><p className="text-sm text-muted-foreground line-clamp-3 mb-4">{a.descricao||`${a.perguntas.length} pergunta(s) para responder.`}</p><div className="text-xs text-muted-foreground space-y-2 mt-auto"><p>Prazo: {deadline(a.minha_resposta?.reenvio?.prazo||a.prazo)}</p>{a.agendada&&<p className="text-primary font-medium">Publicação: {publicationLabel(a.publicar_em)} (Brasília)</p>}<p>{admin?`${a.entregas} entrega(s) · ${a.corrigidas} corrigida(s)${a.devolvidas?` · ${a.devolvidas} devolvida(s)`:""}`:`Professor: ${a.professor_nome}`}</p>{a.minha_resposta?.nota!=null&&<p className="text-primary font-semibold">Nota: {a.minha_resposta.nota.toFixed(1)}</p>}</div><Button asChild variant="outline" className="mt-5"><Link to={`${admin?'/admin/activities':'/activities'}/${a.id}`}>{admin?'Ver atividade e respostas':a.minha_resposta?'Ver minha resposta':'Abrir atividade'}<ArrowRight size={15}/></Link></Button></article>)}</div>}
 </>} </div></DashboardLayout>;
}
