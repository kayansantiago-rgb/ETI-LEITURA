import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, ImageIcon, X, Loader2 } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { toast } from 'sonner';

function FilePicker({ label, file, accept, onSelect, disabled, image = false }) {
 const ref = useRef();
 return <div className="upload-zone" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!disabled)onSelect(e.dataTransfer.files[0]);}}>
  <input ref={ref} type="file" accept={accept} aria-label={label} disabled={disabled} className="sr-only" onChange={e=>{onSelect(e.target.files[0]);e.target.value='';}}/>
  <button type="button" disabled={disabled} onClick={()=>ref.current.click()} className="w-full flex flex-col items-center gap-3 p-6"><span className="metric-icon">{image?<ImageIcon/>:<UploadCloud/>}</span><strong className="text-sm">{file ? file.name : label}</strong><span className="text-xs text-muted-foreground">{file ? `${(file.size/1024/1024).toFixed(1)} MB · Clique para trocar` : `Arraste aqui ou clique para escolher · ${image?'JPG, PNG ou WebP até 5 MB':'PDF até 50 MB'}`}</span></button>
  {file&&<button type="button" disabled={disabled} aria-label={`Remover ${label}`} className="text-xs text-destructive flex gap-1 items-center mx-auto mb-4" onClick={()=>onSelect(null)}><X size={14}/>Remover arquivo</button>}
 </div>;
}
export default function AdminAddBook() {
 const navigate=useNavigate();
 const [form,setForm]=useState({titulo:'',autor:'',descricao:'',nivel_ensino:'AMBOS',arquivo_url:'',capa_url:''});
 const [pdf,setPdf]=useState(null),[cover,setCover]=useState(null),[preview,setPreview]=useState('');
 const [uploaded,setUploaded]=useState({}),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
 useEffect(()=>{if(!cover){setPreview('');return;}const url=URL.createObjectURL(cover);setPreview(url);return()=>URL.revokeObjectURL(url);},[cover]);
 const choose=(file,kind)=>{
  if(file){const valid=kind==='pdf'?file.type==='application/pdf':['image/jpeg','image/png','image/webp'].includes(file.type);if(!valid||file.size>(kind==='pdf'?50:5)*1024*1024){toast.error(kind==='pdf'?'Escolha um PDF de até 50 MB.':'Escolha uma imagem JPG, PNG ou WebP de até 5 MB.');return;}}
  setUploaded(v=>({...v,[kind]:null}));
  if(kind==='pdf'){setPdf(file);if(file)setForm(v=>({...v,titulo:v.titulo||file.name.replace(/\.pdf$/i,'').replace(/[_-]+/g,' ')}));}else setCover(file);
 };
 const upload=async(file,kind)=>{if(uploaded[kind])return uploaded[kind];setStatus(kind==='pdf'?'Enviando PDF…':'Enviando capa…');const data=new FormData();data.append('file',file);const r=await api.post(`/admin/books/upload-${kind}`,data,{onUploadProgress:e=>{if(e.total)setStatus(`Enviando ${kind==='pdf'?'PDF':'capa'}: ${Math.round(e.loaded/e.total*100)}%`);}});setUploaded(v=>({...v,[kind]:r.data.url}));return r.data.url;};
 const submit=async e=>{e.preventDefault();if(!form.titulo.trim())return;setBusy(true);try{const arquivo_url=pdf?await upload(pdf,'pdf'):form.arquivo_url;const capa_url=cover?await upload(cover,'cover'):form.capa_url||'/book-placeholder.svg';setStatus('Publicando livro…');await api.post('/admin/books',{...form,titulo:form.titulo.trim(),autor:form.autor.trim()||'Autor não informado',descricao:form.descricao.trim(),arquivo_url:arquivo_url||null,capa_url});toast.success('Livro disponível na biblioteca!');navigate('/admin/books');}catch(e){toast.error(typeof e.response?.data?.detail==='string'?e.response.data.detail:'Não foi possível publicar. Tente novamente.');}finally{setBusy(false);setStatus('');}};
 const field=(key,value)=>setForm(v=>({...v,[key]:value}));
 return <DashboardLayout><div className="max-w-4xl mx-auto" data-testid="admin-add-book-page"><p className="eyebrow">BIBLIOTECA DA ESCOLA</p><h1>Adicionar um livro ficou mais fácil.</h1><p className="text-muted-foreground mt-3 mb-7">Envie o PDF, confira o título e publique. A capa e os demais detalhes são opcionais.</p><form onSubmit={submit} className="space-y-6"><fieldset disabled={busy} className="grid md:grid-cols-2 gap-5"><FilePicker label="Selecionar PDF" file={pdf} accept="application/pdf" onSelect={f=>choose(f,'pdf')} disabled={busy}/><FilePicker label="Selecionar capa" image file={cover} accept="image/jpeg,image/png,image/webp" onSelect={f=>choose(f,'cover')} disabled={busy}/></fieldset><fieldset disabled={busy} className="panel space-y-5"><div className="flex gap-5 items-start">{preview&&<img src={preview} alt="Prévia da capa" className="w-20 h-28 rounded-lg object-cover"/>}<div className="flex-1 space-y-4"><div><Label htmlFor="titulo">Título do livro *</Label><Input id="titulo" required maxLength={200} value={form.titulo} onChange={e=>field('titulo',e.target.value)}/></div><div><Label htmlFor="autor">Autor (opcional)</Label><Input id="autor" value={form.autor} onChange={e=>field('autor',e.target.value)}/></div></div></div><div><Label htmlFor="nivel">Disponível para</Label><select id="nivel" className="native-select mt-1" value={form.nivel_ensino} onChange={e=>field('nivel_ensino',e.target.value)}><option value="AMBOS">Todos os alunos</option><option value="FUNDAMENTAL">Ensino Fundamental</option><option value="MÉDIO">Ensino Médio</option></select></div><div><Label htmlFor="descricao">Sobre o livro (opcional)</Label><Textarea id="descricao" rows={3} value={form.descricao} onChange={e=>field('descricao',e.target.value)}/></div><details><summary className="text-sm text-primary cursor-pointer">Já tenho links do PDF ou da capa</summary><div className="grid sm:grid-cols-2 gap-4 mt-4"><div><Label htmlFor="pdf-link">Link do PDF</Label><Input id="pdf-link" type="url" disabled={!!pdf||busy} value={form.arquivo_url} onChange={e=>field('arquivo_url',e.target.value)} placeholder="https://…"/></div><div><Label htmlFor="cover-link">Link da capa</Label><Input id="cover-link" type="url" disabled={!!cover||busy} value={form.capa_url} onChange={e=>field('capa_url',e.target.value)} placeholder="https://…"/></div></div></details></fieldset><div className="flex items-center gap-3 flex-wrap"><Button type="submit" disabled={busy}>{busy?<Loader2 className="animate-spin"/>:<FileText/>}{busy?status:'Publicar na biblioteca'}</Button><Button type="button" variant="outline" disabled={busy} onClick={()=>navigate('/admin/books')}>Cancelar</Button><span role="status" className="text-xs text-muted-foreground">{!busy&&!pdf&&!form.arquivo_url?'Sem PDF, o livro será cadastrado apenas com suas informações.':''}</span></div></form></div></DashboardLayout>;
}
