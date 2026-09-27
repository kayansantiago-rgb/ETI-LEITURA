import {useEffect,useState} from 'react';
import {Accessibility as Icon} from 'lucide-react';
import {Dialog,DialogTrigger,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
const defaults={size:100,motion:false};
function read(){try{const saved=JSON.parse(localStorage.getItem('eti-accessibility'));return {size:[100,115,130].includes(saved?.size)?saved.size:100,motion:!!saved?.motion};}catch{return defaults;}}
export default function Accessibility(){
 const [settings,setSettings]=useState(read);
 useEffect(()=>{document.documentElement.style.fontSize=settings.size+'%';document.documentElement.classList.toggle('reduce-motion',settings.motion);try{localStorage.setItem('eti-accessibility',JSON.stringify(settings));}catch{}},[settings]);
 return <Dialog><DialogTrigger asChild><button className="theme-toggle" aria-label="Opções de acessibilidade" title="Acessibilidade"><Icon size={19}/></button></DialogTrigger><DialogContent><DialogTitle>Acessibilidade</DialogTitle><DialogDescription>Ajuste a leitura neste aparelho. Suas preferências ficam salvas.</DialogDescription><fieldset className="space-y-4"><legend className="font-semibold mb-3">Tamanho das letras</legend><div className="flex flex-wrap gap-3">{[[100,'Padrão'],[115,'Maior'],[130,'Bem maior']].map(([size,label])=><Button type="button" key={size} variant={settings.size===size?'default':'outline'} aria-pressed={settings.size===size} onClick={()=>setSettings({...settings,size})}>{label}</Button>)}</div></fieldset><label className="flex items-center gap-3 py-4"><input type="checkbox" checked={settings.motion} onChange={e=>setSettings({...settings,motion:e.target.checked})}/>Reduzir animações</label><p className="text-sm text-muted-foreground">Use Tab para navegar, Enter para ativar botões e Escape para fechar janelas. No início da página, use “Pular para o conteúdo”. Nos vídeos, ative as legendas do YouTube quando disponíveis e consulte a transcrição fornecida pelo professor.</p><Button variant="outline" onClick={()=>setSettings(defaults)}>Restaurar preferências</Button></DialogContent></Dialog>;
}
