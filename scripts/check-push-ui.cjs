// Explicit fixtures: no provider registration and no notifications sent to students.
const {chromium}=require('../frontend/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},permissions:['notifications']});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  let device=null,configured=true,tests=0;
  const publicKey=Buffer.from([4,...Array(64).fill(1)]).toString('base64url');
  await page.addInitScript(()=>{
   sessionStorage.setItem('eti-splash-seen','1');localStorage.setItem('token','fixture');localStorage.setItem('user',JSON.stringify({id:'s',role:'student',nome:'Aluno',turma:'7º ANO'}));
   window.permissionRequests=0;
   Notification.requestPermission=async()=>{window.permissionRequests++;return 'granted';};
   const sub=()=>({endpoint:'https://fcm.googleapis.com/fcm/send/fixture',toJSON(){return {endpoint:this.endpoint,keys:{p256dh:'fixture',auth:'fixture'}};},async unsubscribe(){sessionStorage.removeItem('fixture-push');return true;}});
   PushManager.prototype.getSubscription=async()=>sessionStorage.getItem('fixture-push')?sub():null;
   PushManager.prototype.subscribe=async()=>{sessionStorage.setItem('fixture-push','1');return sub();};
  });
  await page.route('**/api/**',async route=>{
   const req=route.request(),path=new URL(req.url()).pathname;let data=[];
   if(path==='/api/push/config')data={configured,public_key:configured?publicKey:null};
   if(path==='/api/push/status')data={active:!!device,...device};
   if(path==='/api/push/subscription'){
    if(req.method()==='DELETE'){device=null;return route.fulfill({status:204});}
    device=req.postDataJSON();data={active:true};
   }
   if(path==='/api/push/test'){tests++;data={message:'Teste enviado ao serviço de notificações. Confira seu aparelho.'};}
   return route.fulfill({json:data});
  });
  await page.goto('http://127.0.0.1:3000/notifications');
  await page.getByRole('button',{name:'Ativar neste aparelho',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.permissionRequests),0,'Permission must not be requested on page load');
  await page.getByRole('button',{name:'Ativar neste aparelho',exact:true}).click();
  await page.getByText('Ativadas neste aparelho.',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.permissionRequests),1);
  assert(device.binding&&device.new_activities&&device.deadlines);
  await page.getByLabel('Novas atividades da minha turma',{exact:true}).uncheck();
  await page.getByText('Preferências salvas.',{exact:true}).waitFor();assert.equal(device.new_activities,false);
  await page.getByRole('button',{name:'Testar notificação',exact:true}).click();
  await page.getByText('Teste enviado ao serviço de notificações. Confira seu aparelho.',{exact:true}).waitFor();assert.equal(tests,1);
  for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Overflow '+width);}
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Ativar tema escuro'}).click();
  await page.screenshot({path:'.local/push-settings-mobile.png',fullPage:true});
  const binding=await page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('eti-push',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,q=db.transaction('settings').objectStore('settings').get('binding');q.onsuccess=()=>{resolve(q.result);db.close();};};}));
  assert.equal(binding,device.binding,'Service worker persists the device binding');
  await page.getByRole('button',{name:'Desativar neste aparelho',exact:true}).click();
  await page.getByRole('button',{name:'Ativar neste aparelho',exact:true}).waitFor();assert.equal(device,null);
  assert.equal(await page.evaluate(()=>localStorage.getItem('eti-push-device')),null);
  await page.getByRole('button',{name:'Ativar neste aparelho',exact:true}).click();
  await page.getByText('Ativadas neste aparelho.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Abrir menu',exact:true}).click();
  await page.getByRole('button',{name:'Sair da conta',exact:true}).click();
  await page.waitForURL('**/login');assert.equal(device,null,'Logout removes the device');
  configured=false;
  await page.goto('http://127.0.0.1:3000/notifications');
  await page.getByText(/A escola ainda está preparando/).waitFor();
  assert(await page.getByRole('button',{name:'Ativar neste aparelho',exact:true}).isDisabled());
  const manifest=await (await page.request.get('http://127.0.0.1:3000/manifest.webmanifest')).json();assert.equal(manifest.display,'standalone');
  for(const icon of manifest.icons)assert((await page.request.get('http://127.0.0.1:3000'+icon.src)).ok());
  assert.deepEqual(errors,[]);
  console.log('PASS: opt-in only, real service worker binding, preferences, test, device disable, logout cleanup, unconfigured state, PWA assets, responsive mobile and dark theme. Push provider mocked.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
