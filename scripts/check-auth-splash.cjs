// Authentication responses are fixtures; no accounts or real sessions are changed.
const {chromium}=require('../frontend/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>sessionStorage.setItem('eti-splash-seen','1'));
  let accepted=false;
  await page.route('**/api/**',route=>{
   const path=new URL(route.request().url()).pathname;
   if(path==='/api/auth/login')return route.fulfill(accepted?{json:{access_token:'fixture',user:{id:'t',nome:'Professor',role:'teacher',turmas:['7º ANO']}}}:{status:401,json:{detail:'Dados inválidos'}});
   return route.fulfill({json:path==='/api/admin/stats'?{total_books:0,total_users:0,total_summaries:0,total_productions:0}:[]});
  });
  await page.goto('http://127.0.0.1:3000/login');
  const login=async()=>{await page.getByTestId('input-email').fill('teste@example.com');await page.getByTestId('input-password').fill('SenhaTeste2026!');await page.getByTestId('submit-button').click();};
  await login();await page.getByText('Dados inválidos',{exact:true}).waitFor();assert.equal(await page.locator('.eti-splash').count(),0);
  accepted=true;
  for(let cycle=0;cycle<2;cycle++){
   await login();await page.locator('.eti-splash[data-transition="login"]').waitFor();await page.getByRole('button',{name:'Entrar na plataforma',exact:true}).click();
   await page.getByRole('heading',{name:'Painel do professor',exact:true}).waitFor();
   await page.getByRole('navigation',{name:'Áreas principais'}).getByRole('link',{name:'Biblioteca',exact:true}).click();await page.getByRole('heading',{name:'Biblioteca',exact:true}).waitFor();assert.equal(await page.locator('.eti-splash').count(),0);
   await page.reload();await page.getByRole('heading',{name:'Biblioteca',exact:true}).waitFor();assert.equal(await page.locator('.eti-splash').count(),0);
   await page.getByRole('button',{name:'Todas as áreas',exact:true}).click();await page.getByRole('button',{name:'Sair da conta',exact:true}).click();
   await page.locator('.eti-splash[data-transition="logout"]').waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('token')),null);
   await page.getByRole('button',{name:'Voltar ao login',exact:true}).click();await page.getByTestId('submit-button').waitFor();await page.waitForURL('**/login');
  }
  assert.deepEqual(errors,[]);console.log('PASS: splash after each successful login and logout, failed login has no splash, navigation/reload has no repeat, logout clears session, two complete cycles.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
