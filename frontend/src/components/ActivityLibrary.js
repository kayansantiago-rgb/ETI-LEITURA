import { confirmAction } from '@/components/ConfirmHost';
import SubjectBadge from '@/components/SubjectBadge';
import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import ActivityForm from '@/components/ActivityForm';
import {getUser} from '@/lib/auth';
import api from '@/lib/api';
import {toast} from 'sonner';

export function activityDraft(source){
 const user=getUser();
 return {...source,id:undefined,publicar_em:null,agendada:false,prazo:'',turma:user.role==='admin'?'TODAS':user.turmas?.[0]||''};
}

export default function ActivityLibrary({onUse}){
 const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false),[search,setSearch]=useState(''),[form,setForm]=useState(null),[busy,setBusy]=useState(false);
 const load=async()=>{setLoading(true);setFailed(false);try{setItems((await api.get('/admin/activity-templates')).data);}catch{setFailed(true);}finally{setLoading(false);}};
 useEffect(()=>{load();},[]);
 const remove=async item=>{if(!(await confirmAction({ title: 'Excluir modelo?', message: `Excluir o modelo “${item.titulo}”? As atividades já publicadas serão preservadas.`, confirmLabel: 'Excluir' })))return;setBusy(true);try{await api.delete('/admin/activity-templates/'+item.id);setItems(list=>list.filter(x=>x.id!==item.id));toast.success('Modelo excluído.');}catch{toast.error('Não foi possível excluir o modelo.');}finally{setBusy(false);}};
 const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const filtered=items.filter(x=>normalize(x.titulo+' '+(x.disciplina||'')).includes(normalize(search)));
 return <section aria-label="Biblioteca de atividades" className="space-y-5">
 <div className="flex flex-wrap items-center justify-between gap-3"><div><h2>Meus modelos</h2><p className="text-sm text-muted-foreground mt-2">Guarde suas propostas e reutilize em outras turmas. Modelos ficam visíveis somente para você.</p></div>{!form&&<Button onClick={()=>setForm({})}>Criar modelo</Button>}</div>
 {form&&<ActivityForm key={form.id||'new'} template initial={form.id?{...form,turma:'TODAS'}:undefined} onCancel={()=>setForm(null)} onSaved={()=>{setForm(null);load();}}/>}
 <Input aria-label="Buscar modelos por título ou disciplina" placeholder="Buscar por título ou disciplina…" value={search} onChange={e=>setSearch(e.target.value)}/>
 {loading?<p role="status">Carregando modelos…</p>:failed?<p role="alert">Não foi possível carregar. <button className="underline" onClick={load}>Tentar novamente</button></p>:!filtered.length?<div className="panel"><h3>{items.length?'Nenhum modelo encontrado':'Sua biblioteca começa com uma boa proposta.'}</h3><p className="text-sm text-muted-foreground mt-2">Crie um modelo ou use “Salvar como modelo” em uma atividade existente.</p></div>:<div className="activity-collection">{filtered.map(item=><article className="panel space-y-4" key={item.id}><SubjectBadge subject={item.disciplina}/><h3 className="font-semibold">{item.titulo}</h3><p className="text-sm text-muted-foreground line-clamp-3">{item.descricao}</p><p className="text-xs text-muted-foreground">{item.perguntas.length} pergunta(s) · {item.anexos?.length||0} anexo(s)</p><div className="flex flex-wrap gap-2"><Button onClick={()=>onUse(activityDraft(item))}>Usar modelo</Button><Button variant="outline" onClick={()=>setForm(item)}>Editar</Button><Button variant="ghost" disabled={busy} onClick={()=>remove(item)}>Excluir</Button></div></article>)}</div>}
 </section>;
}
