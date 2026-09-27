// Test the actual worker code, without a push provider or OS notification.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 let binding=null,shown=[],opened=[],focused=0;const events={};
 const indexedDB={open(){const req={};queueMicrotask(()=>{req.result={close(){},transaction(){const tx={};tx.objectStore=()=>({put(value){binding=value;const op={};queueMicrotask(()=>{op.onsuccess?.();tx.oncomplete?.();});return op;},get(){const op={};queueMicrotask(()=>{op.result=binding;op.onsuccess?.();tx.oncomplete?.();});return op;}});return tx;}};req.onsuccess();});return req;}};
 const self={location:{origin:'https://school.example'},addEventListener:(name,handler)=>events[name]=handler,skipWaiting(){},registration:{async showNotification(title,options){shown.push({title,options});},async getNotifications(){return shown.map(n=>({close(){shown=shown.filter(x=>x!==n);}}));}},clients:{async claim(){},async matchAll(){return [{url:'https://school.example/dashboard',async navigate(url){opened.push(url);},async focus(){focused++;}}];},async openWindow(url){opened.push(url);}}};
 vm.runInNewContext(fs.readFileSync('frontend/public/push-sw.js','utf8'),{self,indexedDB,URL,Date,Promise});
 async function fire(name,event){let promise;events[name]({...event,waitUntil:p=>promise=p});await promise;}
 await fire('message',{data:{type:'ETI_PUSH_BINDING',binding:'device-a'},ports:[{postMessage(){}}]});
 const payload={binding:'device-a',title:'Atividade',body:'Estude',url:'/activities/a',tag:'a',expires:Date.now()+60000};
 await fire('push',{data:{json:()=>({...payload,binding:'other-account'})}});assert.equal(shown.length,0);
 await fire('push',{data:{json:()=>({...payload,expires:Date.now()-1})}});assert.equal(shown.length,0);
 await fire('push',{data:{json:()=>payload}});assert.equal(shown.length,1);assert.equal(shown[0].options.tag,'a');
 await fire('notificationclick',{notification:{data:{binding:'device-a',url:'/activities/a'},close(){}}});assert.equal(opened[0],'https://school.example/activities/a');assert.equal(focused,1);
 await fire('notificationclick',{notification:{data:{binding:'device-a',url:'https://evil.example/phishing'},close(){}}});assert.equal(opened[1],'https://school.example/notifications');
 await fire('message',{data:{type:'ETI_PUSH_BINDING',binding:null},ports:[{postMessage(){}}]});assert.equal(binding,null);assert.equal(shown.length,0);
 await fire('push',{data:{json:()=>payload}});assert.equal(shown.length,0);
 await fire('notificationclick',{notification:{data:{binding:'device-a',url:'/activities/a'},close(){}}});assert.equal(opened.length,2);
 console.log('PASS: worker delivery, expiry, device/account binding, safe notification links and logout suppression. No external messages.');
})().catch(e=>{console.error(e);process.exitCode=1;});
