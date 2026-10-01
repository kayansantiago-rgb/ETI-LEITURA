import {useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import PageIntro from '@/components/PageIntro';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Label} from '@/components/ui/label';
import {TURMAS} from '@/constants/turmas';
import {getUser} from '@/lib/auth';
import api from '@/lib/api';
import {toast} from 'sonner';
const error=e=>typeof e.response?.data?.detail==='string'?e.response.data.detail:'Confira os campos e tente novamente.';

export function Rubrics(){
 const [items,setItems]=useState(null),[failed,setFailed]=useState(false),[form,setForm]=useState(null),[busy,setBusy]=useState(false);
 const load=()=>{setFailed(false);api.get('/admin/rubrics').then(r=>setItems(r.data)).catch(()=>setFailed(true));};useEffect(load,[]);
 const save=async e=>{e.preventDefault();setBusy(true);try{await(form.id?api.put('/admin/rubrics/'+form.id,form):api.post('/admin/rubrics',form));setForm(null);load();toast.success('Critérios salvos.');}catch(e){toast.error(error(e));}finally{setBusy(false);}};
 const total=form?.criterios.reduce((sum,c)=>sum+(Number(c.pontos)||0),0)||0;
 const remove=async item=>{if(!window.confirm('Excluir este modelo? As correções já salvas serão preservadas.'))return;setBusy(true);try{await api.delete('/admin/rubrics/'+item.id);load();}catch(e){toast.error(error(e));}finally{setBusy(false);}};
 return <DashboardLayout><PageIntro section="AVALIAÇÃO" title="Critérios de correção" description="Defina o que vale cada ponto e reutilize seus critérios nas próximas entregas."><Button onClick={()=>setForm({titulo:'',criterios:[{descricao:'Compreensão do conteúdo',pontos:4},{descricao:'Argumentação e exemplos',pontos:4},{descricao:'Clareza da escrita',pontos:2}]})}>Novo modelo</Button></PageIntro>{form&&<form onSubmit={save} className="panel mb-6"><fieldset disabled={busy} className="space-y-4"><h2>{form.id?'Editar modelo':'Novo modelo'}</h2><Label htmlFor="rubric-title">Nome do modelo</Label><Input id="rubric-title" required maxLength={120} value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})}/>{form.criterios.map((c,i)=><div key={i} className="grid sm:grid-cols-[1fr_100px_auto] gap-3 items-end"><div><Label htmlFor={`criterion-${i}`}>Critério {i+1}</Label><Input id={`criterion-${i}`} required maxLength={300} value={c.descricao} onChange={e=>setForm({...form,criterios:form.criterios.map((v,j)=>j===i?{...v,descricao:e.target.value}:v)})}/></div><div><Label htmlFor={`points-${i}`}>Pontos</Label><Input id={`points-${i}`} required type="number" min="0.1" max="10" step="0.1" value={c.pontos} onChange={e=>setForm({...form,criterios:form.criterios.map((v,j)=>j===i?{...v,pontos:e.target.value===''?'':Number(e.target.value)}:v)})}/></div><Button type="button" variant="ghost" disabled={form.criterios.length===1} onClick={()=>setForm({...form,criterios:form.criterios.filter((_,j)=>j!==i)})}>Remover</Button></div>)}<p aria-live="polite">Total: {total.toFixed(1)} de 10 pontos</p><div className="flex flex-wrap gap-3"><Button type="button" variant="outline" disabled={form.criterios.length>=10} onClick={()=>setForm({...form,criterios:[...form.criterios,{descricao:'',pontos:1}]})}>Adicionar critério</Button><Button type="submit" disabled={Math.abs(total-10)>0.001}>Salvar modelo</Button><Button type="button" variant="ghost" onClick={()=>setForm(null)}>Cancelar</Button></div></fieldset></form>}{failed?<p role="alert">Não foi possível carregar. <button onClick={load}>Tentar novamente</button></p>:!items?<p role="status">Carregando…</p>:<div className="space-y-5">{!items.length&&<p className="empty-state">Crie seu primeiro modelo. Os critérios estarão disponíveis nas telas de correção e na ajuda da IA.</p>}{items.map(r=><article className="panel space-y-4" key={r.id}><h2>{r.titulo}</h2><ul className="space-y-2">{r.criterios.map((c,i)=><li key={i} className="flex justify-between gap-4"><span>{c.descricao}</span><strong className="whitespace-nowrap">{c.pontos} pontos</strong></li>)}</ul><div className="flex gap-3"><Button variant="outline" disabled={busy} onClick={()=>setForm({...r,criterios:r.criterios.map(c=>({...c}))})}>Editar</Button><Button variant="ghost" disabled={busy} onClick={()=>remove(r)}>Excluir</Button></div></article>)}</div>}</DashboardLayout>;
}

