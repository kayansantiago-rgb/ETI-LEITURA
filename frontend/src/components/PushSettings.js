import {useEffect,useState} from 'react';
import {BellRing,Monitor,Smartphone} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {getUser} from '@/lib/auth';
import {pushSupported,savedDevice,registration,detachPush,subscribeDevice} from '@/lib/push';
import api from '@/lib/api';
import {toast} from 'sonner';

export default function PushSettings(){
 const user=getUser(), staff=['admin','teacher'].includes(user?.role);
 const [config,setConfig]=useState(null),[failed,setFailed]=useState(false),[active,setActive]=useState(false),[busy,setBusy]=useState(false),[permission,setPermission]=useState(window.Notification?.permission),[prefs,setPrefs]=useState({new_activities:true,deadlines:true});
 const supported=pushSupported(),ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
 const load=async()=>{setFailed(false);try{
  setConfig((await api.get('/push/config')).data);
  const device=savedDevice();
  if(device?.userId===user.id&&supported&&Notification.permission==='granted'){
   const reg=await navigator.serviceWorker.getRegistration('/'),sub=await reg?.pushManager.getSubscription();
   if(sub){const status=(await api.post('/push/status',{endpoint:sub.endpoint})).data;setActive(status.active);setPrefs({new_activities:status.new_activities,deadlines:status.deadlines});}
  }
 }catch{setFailed(true);}};
 useEffect(()=>{load();},[]);
 const enable=async()=>{
  setBusy(true);
  try{
   // Permission must follow the student's tap, particularly on iOS.
   const granted=await Notification.requestPermission();setPermission(granted);
   if(granted!=='granted'){toast.error('Para receber avisos, permita as notificações nas configurações do navegador.');return;}
   await subscribeDevice({userId:user.id,publicKey:config.public_key,prefs,api});
   setActive(true);toast.success('Notificações ativadas neste aparelho.');
  }catch(e){
   toast.error(typeof e.response?.data?.detail==='string'?e.response.data.detail:'Não foi possível ativar. Confira a conexão e tente novamente.');
  }finally{setBusy(false);}
 };
 const disable=async()=>{setBusy(true);try{await detachPush();setActive(false);toast.success('Notificações desativadas neste aparelho.');}catch{setActive(false);toast.error('Confira a permissão de notificações do navegador para concluir a desativação.');}finally{setBusy(false);}};
 const change=async(name,value)=>{
  const next={...prefs,[name]:value};
  if(!active){setPrefs(next);return;}
  const previous=prefs;setPrefs(next);setBusy(true);try{const reg=await registration(),sub=await reg.pushManager.getSubscription(),device=savedDevice();if(!sub||!device)throw Error();await api.put('/push/subscription',{...sub.toJSON(),binding:device.binding,...next});toast.success('Preferências salvas.');}catch{setPrefs(previous);toast.error('Não foi possível salvar as preferências.');}finally{setBusy(false);}
 };
 const test=async()=>{setBusy(true);try{const r=await api.post('/push/test',{endpoint:savedDevice()?.endpoint});toast.success(r.data.message);}catch(e){toast.error(typeof e.response?.data?.detail==='string'?e.response.data.detail:'Não foi possível enviar o teste.');}finally{setBusy(false);}};
 return <section className="push-preferences space-y-4" aria-label="Notificações neste aparelho"><div className="flex gap-3 items-start"><span className="push-icon"><BellRing size={24}/></span><div><h2 className="font-semibold">Leve os avisos com você</h2><p className="text-sm text-muted-foreground mt-2">{staff?'Receba avisos de novas entregas para corrigir no computador ou celular.':'Receba os avisos na barra de notificações do celular e do computador, mesmo com a plataforma fechada.'}</p></div></div>
 <div className="push-devices"><span><Monitor size={15}/> Computador</span><span><Smartphone size={15}/> Celular</span><b>{active?'Ativas neste aparelho':'Ativação opcional'}</b></div>
 {failed?<p role="alert" className="text-sm">Não foi possível consultar as notificações. <button className="underline" onClick={load}>Tentar novamente</button></p>:!config?<p role="status">Consultando disponibilidade…</p>:!config.configured?<p className="text-sm text-muted-foreground">A escola ainda está preparando o envio de notificações. Os avisos continuam disponíveis aqui no sininho.</p>:null}
 {ios&&!standalone?<p className="text-sm">No iPhone ou iPad (iOS 16.4 ou mais recente), abra no Safari, toque em Compartilhar → Adicionar à Tela de Início. Abra pelo ícone e ative os avisos aqui.</p>:!supported?<p className="text-sm">Abra o endereço seguro (HTTPS) da escola em um navegador que aceite notificações.</p>:permission==='denied'?<p className="text-sm">As notificações estão bloqueadas. Permita-as nas configurações do navegador e atualize esta página.</p>:null}
 <fieldset disabled={busy||!config?.configured} className="space-y-3"><legend className="sr-only">Quais avisos receber</legend><label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={prefs.new_activities} onChange={e=>change('new_activities',e.target.checked)}/><span>{staff?'Novas entregas para corrigir':'Avisos da plataforma: atividades, correções, quizzes e mural'}</span></label>{!staff&&<label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={prefs.deadlines} onChange={e=>change('deadlines',e.target.checked)}/><span>Lembretes na véspera e no dia do prazo<small className="block text-muted-foreground mt-1">Somente entregas pendentes, entre 8h e 20h (Brasília).</small></span></label>}</fieldset>
 <div className="flex flex-wrap gap-2">{active?<><Button variant="outline" disabled={busy} onClick={disable}>Desativar neste aparelho</Button><Button disabled={busy||!config?.configured} onClick={test}><BellRing size={16}/>Testar notificação</Button></>:<Button disabled={busy||failed||!config?.configured||!supported||(ios&&!standalone)||permission==='denied'} onClick={enable}>{busy?'Ativando…':'Ativar neste aparelho'}</Button>}</div>
 {active&&<p role="status" className="text-sm text-primary">Ativadas neste aparelho.</p>}<p className="text-xs text-muted-foreground">A permissão é opcional e vale para este aparelho. Ao sair da conta, os avisos deste aparelho são desligados. A entrega também depende da conexão e das configurações de bateria e notificações do aparelho.</p>
 </section>;
}
