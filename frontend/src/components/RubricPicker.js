import {useEffect,useState,useId} from 'react';
import {Link} from 'react-router-dom';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import api from '@/lib/api';
export function RubricSelect({onSelect}){
 const [items,setItems]=useState([]),[failed,setFailed]=useState(false);
 useEffect(()=>{api.get('/admin/rubrics').then(r=>setItems(r.data)).catch(()=>setFailed(true));},[]);
 return <div className="space-y-2"><select aria-label="Modelo de critérios" className="native-select" defaultValue="" onChange={e=>onSelect(items.find(x=>x.id===e.target.value)||null)}><option value="">Selecione um modelo de critérios</option>{items.map(x=><option key={x.id} value={x.id}>{x.titulo}</option>)}</select>{failed?<p role="alert" className="text-sm">Não foi possível carregar os critérios. Continue manualmente.</p>:!items.length&&<p className="text-sm text-muted-foreground">Nenhum modelo salvo. <Link to="/admin/rubrics" className="underline">Criar critérios</Link></p>}</div>;
}
export const rubricText=r=>r?`${r.titulo}\n${r.criterios.map(c=>`${c.descricao}: até ${c.pontos} pontos`).join('\n')}`:'';
export default function RubricPicker({onApply,inline=false}){
 const [rubric,setRubric]=useState(null),[scores,setScores]=useState([]),uid=useId();
 const valid=rubric&&scores.length===rubric.criterios.length&&scores.every((v,i)=>v!==''&&Number.isFinite(Number(v))&&Number(v)>=0&&Number(v)<=rubric.criterios[i].pontos);
 return <details className="ai-review" open={inline||undefined}><summary className="cursor-pointer font-medium">Corrigir por critérios</summary><div className="space-y-4 mt-4"><RubricSelect onSelect={r=>{setRubric(r);setScores(r?r.criterios.map(()=>''):[]);}}/>{rubric&&<><p className="text-xs text-muted-foreground">Atribua os pontos em cada critério. O total será usado como sugestão de nota.</p>{rubric.criterios.map((c,i)=><div key={i}><label htmlFor={`${uid}-${i}`} className="block text-sm mb-2">{c.descricao} · até {c.pontos} pontos</label><Input id={`${uid}-${i}`} type="number" min={0} max={c.pontos} step="0.1" value={scores[i]??''} onChange={e=>setScores(scores.map((s,j)=>j===i?e.target.value:s))}/></div>)}<p aria-live="polite">Total: {scores.reduce((a,b)=>a+(Number(b)||0),0).toFixed(1)} / 10</p><Button type="button" disabled={!valid} onClick={()=>onApply({nota:Number(scores.reduce((a,b)=>a+Number(b),0).toFixed(2)),feedback:`Critérios: ${rubric.titulo}\n${rubric.criterios.map((c,i)=>`${c.descricao}: ${scores[i]} / ${c.pontos}`).join('\n')}`})}>Preencher nota e feedback</Button><p className="text-xs text-muted-foreground">Substitui os campos de nota e feedback. Revise e salve a correção para enviar ao aluno.</p></>}</div></details>;
}
