import {RubricSelect,rubricText} from '@/components/RubricPicker';
import {useState} from 'react';
import {Sparkles} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import api from '@/lib/api';
import {toast} from 'sonner';
export default function AIReview({kind,id,onApply}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[criteria,setCriteria]=useState(''),[result,setResult]=useState(null);
 const generate=async()=>{setBusy(true);setResult(null);try{setResult((await api.post(`/admin/ai/review/${kind}/${id}`,{criterios:criteria},{timeout:65000})).data);}catch(e){toast.error(typeof e.response?.data?.detail==='string'?e.response.data.detail:'Não foi possível consultar a IA. Continue a correção manualmente.');}finally{setBusy(false);}};
 return <section className="ai-review"><Button type="button" variant="outline" onClick={()=>setOpen(!open)}><Sparkles size={16}/>Sugerir correção com IA</Button>{open&&<div className="space-y-3 mt-4"><p className="text-xs text-muted-foreground">O texto desta entrega será enviado ao serviço de IA. Confira a sugestão: ela não altera a nota do aluno até você salvar a correção.</p><RubricSelect onSelect={r=>setCriteria(rubricText(r))}/><Textarea aria-label="Critérios para a IA" maxLength={4000} placeholder="Informe os critérios, o gabarito ou a habilidade avaliada." value={criteria} onChange={e=>setCriteria(e.target.value)}/><Button type="button" disabled={busy} onClick={generate}>{busy?'Analisando entrega…':'Gerar sugestão'}</Button>{result&&<div className="panel space-y-3"><h3>Sugestão de nota: {result.nota.toFixed(1)}</h3><p className="whitespace-pre-wrap text-sm">{result.feedback}</p><details><summary className="cursor-pointer text-sm">Por que essa nota?</summary><p className="whitespace-pre-wrap text-sm mt-2">{result.justificativa}</p></details><Button type="button" variant="outline" onClick={()=>{onApply(result);toast.success('Sugestão preenchida. Revise e salve a correção quando estiver pronto.');}}>Usar nos campos de correção</Button></div>}</div>}</section>;
}
