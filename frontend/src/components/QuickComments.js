import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import api from '@/lib/api';
import {toast} from 'sonner';
export default function QuickComments({onUse}){
 const [items,setItems]=useState([]),[text,setText]=useState(''),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
 const load=()=>{setFailed(false);api.get('/admin/feedback-templates').then(r=>setItems(r.data)).catch(()=>setFailed(true));};
 useEffect(()=>{load();},[]);
 const save=async()=>{setBusy(true);try{const r=await api.post('/admin/feedback-templates',{texto:text});setItems(list=>[r.data,...list]);setText('');toast.success('Comentário salvo para reutilizar.');}catch{toast.error('Não foi possível salvar o comentário.');}finally{setBusy(false);}};
 const remove=async item=>{setBusy(true);try{await api.delete('/admin/feedback-templates/'+item.id);setItems(list=>list.filter(x=>x.id!==item.id));}catch{toast.error('Não foi possível excluir.');}finally{setBusy(false);}};
 return <details className="quick-comments"><summary>Meus comentários reutilizáveis</summary><div className="space-y-3 mt-4">{failed?<p role="alert">Não foi possível carregar. <button className="underline" onClick={load}>Tentar novamente</button></p>:!items.length?<p className="text-xs text-muted-foreground">Salve orientações frequentes para usar em outras correções.</p>:items.map(item=><div className="quick-comment-item" key={item.id}><p>{item.texto}</p><div className="flex gap-2"><Button size="sm" variant="outline" type="button" onClick={()=>onUse(item.texto)}>Adicionar ao feedback</Button><Button size="sm" variant="ghost" type="button" disabled={busy} aria-label={`Excluir comentário ${item.texto.slice(0,30)}`} onClick={()=>remove(item)}>Excluir</Button></div></div>)}<Textarea aria-label="Novo comentário reutilizável" maxLength={2000} value={text} onChange={e=>setText(e.target.value)} placeholder="Ex.: Desenvolva sua justificativa com um exemplo do texto."/><Button variant="outline" type="button" disabled={busy||!text.trim()} onClick={save}>Salvar comentário</Button><p className="text-xs text-muted-foreground">Os comentários salvos são privados da sua conta. Adicioná-los não envia a correção.</p></div></details>;
}
