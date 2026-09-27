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
