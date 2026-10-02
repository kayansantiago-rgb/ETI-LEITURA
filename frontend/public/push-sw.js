/* Push, aplicativo instalável e leitura sem internet.
   Guardamos apenas: a casca estática do site (HTML/JS/CSS públicos), a página "sem internet"
   e os PDFs dos livros que o aluno abriu neste aparelho (apagados ao sair da conta).
   Respostas, notas e demais chamadas da API nunca ficam em cache. */
const OFFLINE_CACHE='eti-offline-v1';
const SHELL_CACHE='eti-shell-v1';
const BOOKS_CACHE='eti-books-v1';
const MAX_BOOKS=15;
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
async function trimBooks(){
  const cache=await caches.open(BOOKS_CACHE),keys=await cache.keys();
  for(const request of keys.slice(0,Math.max(0,keys.length-MAX_BOOKS)))await cache.delete(request);
}
async function navigation(request){
  try{
    const response=await fetch(request);
    if(response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      const cache=await caches.open(SHELL_CACHE);await cache.put('/__shell',response.clone());
    }
    return response;
  }catch{
    return (await caches.match('/__shell'))||(await caches.match('/offline.html'))||Response.error();
  }
}
async function staticAsset(request){
  const cached=await caches.match(request);
  if(cached)return cached;
  const response=await fetch(request);
  if(response.ok){const cache=await caches.open(SHELL_CACHE);await cache.put(request,response.clone());}
  return response;
}
async function bookFile(request){
  const cache=await caches.open(BOOKS_CACHE);
  try{
    const response=await fetch(request);
    if(response.status===200){
      await cache.delete(request);await cache.put(request,response.clone());trimBooks();
    }
    return response;
  }catch(error){
    const cached=await cache.match(request);
    if(cached)return cached;
    throw error;
  }
}
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){event.respondWith(navigation(request));return;}
  if(url.pathname.startsWith('/static/')){event.respondWith(staticAsset(request));return;}
  if(url.pathname.startsWith('/api/uploads/')&&url.searchParams.get('inline')==='true'&&!request.headers.has('range')){event.respondWith(bookFile(request));}
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('eti-')&&![OFFLINE_CACHE,SHELL_CACHE,BOOKS_CACHE].includes(key))await caches.delete(key);
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
