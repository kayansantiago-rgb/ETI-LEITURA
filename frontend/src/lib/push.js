const API=(process.env.REACT_APP_BACKEND_URL||'').replace(/\/$/,'')+'/api';
const STORAGE='eti-push-device';
export const pushSupported=()=>window.isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
export const savedDevice=()=>{try{return JSON.parse(localStorage.getItem(STORAGE));}catch{return null;}};
export const saveDevice=value=>localStorage.setItem(STORAGE,JSON.stringify(value));
export async function registration(){
 await navigator.serviceWorker.register('/push-sw.js',{scope:'/'});
 return navigator.serviceWorker.ready;
}
export async function bindWorker(reg,binding){
 const worker=reg.active||reg.waiting;
 if(!worker)throw Error('O serviço de notificações ainda está iniciando. Tente novamente.');
 await new Promise((resolve,reject)=>{
  const channel=new MessageChannel(),timer=setTimeout(()=>reject(Error('Não foi possível preparar as notificações.')),5000);
  channel.port1.onmessage=()=>{clearTimeout(timer);channel.port1.close();resolve();};
  worker.postMessage({type:'ETI_PUSH_BINDING',binding},[channel.port2]);
 });
}
export function publicKeyBytes(value){return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4)),c=>c.charCodeAt(0));}

// Called before credentials are cleared. Invalidate this browser even if offline.
export async function detachPush(){
 const device=savedDevice(),token=localStorage.getItem('token');
 localStorage.removeItem(STORAGE);
 if(device?.endpoint&&token){
  fetch(API+'/push/subscription',{method:'DELETE',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({endpoint:device.endpoint}),keepalive:true}).catch(()=>{});
 }
 if(!('serviceWorker' in navigator))return;
 const reg=await navigator.serviceWorker.getRegistration('/');
 if(!reg)return;
 await bindWorker(reg,null);
 const subscription=await reg.pushManager?.getSubscription();
 if(subscription)await subscription.unsubscribe();
}

export async function reconcilePush(userId){
 const device=savedDevice();
 if(device&&device.userId!==userId){await detachPush();return;}
 if(!device&&'serviceWorker' in navigator){
  const reg=await navigator.serviceWorker.getRegistration('/');
  if(reg?.active)await bindWorker(reg,null);
 }
}

// Inscreve este aparelho para receber avisos na barra de notificações do sistema.
export async function subscribeDevice({userId,publicKey,prefs={new_activities:true,deadlines:true},api}){
 let reg;
 try{
  reg=await registration();
  let sub=await reg.pushManager.getSubscription();
  if(sub){await sub.unsubscribe();sub=null;}
  sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:publicKeyBytes(publicKey)});
  const binding=crypto.randomUUID();
  await bindWorker(reg,binding);
  await api.put('/push/subscription',{...sub.toJSON(),binding,...prefs});
  saveDevice({userId,endpoint:sub.endpoint,binding});
 }catch(e){
  if(reg){await bindWorker(reg,null).catch(()=>{});const sub=await reg.pushManager.getSubscription().catch(()=>null);await sub?.unsubscribe().catch(()=>{});}
  throw e;
 }
}
export const isIOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
export const isStandalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
