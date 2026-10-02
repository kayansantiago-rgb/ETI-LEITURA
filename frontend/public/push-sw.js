/* Push e aplicativo instalável. Nada de páginas autenticadas, respostas, notas ou API fica em cache:
   só a página estática "sem internet", mostrada quando a navegação falha por falta de conexão. */
const OFFLINE_CACHE='eti-offline-v1';
const OFFLINE_FILES=['/offline.html','/icons/eti-192.png'];
function bindingStore(value, write=false) {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('eti-push',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('settings');
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const db=request.result,tx=db.transaction('settings',write?'readwrite':'readonly'),store=tx.objectStore('settings');
      const operation=write?store.put(value,'binding'):store.get('binding');
      let result;operation.onsuccess=()=>{result=operation.result;};
      tx.oncomplete=()=>{db.close();resolve(result);};tx.onerror=()=>{db.close();reject(tx.error);};
    };
  });
}
self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(OFFLINE_CACHE).then(cache=>cache.addAll(OFFLINE_FILES)).catch(()=>{}));
});
self.addEventListener('fetch',event=>{
  if(event.request.mode!=='navigate')return;
  event.respondWith(fetch(event.request).catch(async()=>(await caches.match('/offline.html'))||Response.error()));
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('eti-offline-')&&key!==OFFLINE_CACHE)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('message',event=>{
  if(event.data?.type!=='ETI_PUSH_BINDING')return;
  event.waitUntil((async()=>{
    await bindingStore(event.data.binding||null,true);
    if(!event.data.binding){for(const notification of await self.registration.getNotifications())notification.close();}
    event.ports[0]?.postMessage({ok:true});
  })());
});
self.addEventListener('push',event=>{
  event.waitUntil((async()=>{
    let payload;try{payload=event.data.json();}catch{return;}
    const binding=await bindingStore();
    if(!binding||binding!==payload.binding||payload.expires<Date.now())return;
    await self.registration.showNotification(payload.title||'ETI LEITURA',{
      body:payload.body,icon:'/icons/eti-192.png',badge:'/icons/eti-badge.png',
      tag:payload.tag,renotify:false,vibrate:[120,60,120],timestamp:Date.now(),data:{url:payload.url,binding},
    });
  })());
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    if(await bindingStore()!==event.notification.data?.binding)return;
    const target=new URL(event.notification.data?.url||'/notifications',self.location.origin);
    // Só abre páginas da própria plataforma; qualquer outro destino cai na central de avisos.
    const url=target.origin===self.location.origin&&/^\/[a-zA-Z0-9\/_-]*$/.test(target.pathname)?target.href:self.location.origin+'/notifications';
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){if(new URL(client.url).origin===self.location.origin){await client.navigate(url);await client.focus();return;}}
    await self.clients.openWindow(url);
  })());
});
