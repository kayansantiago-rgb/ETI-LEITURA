const {chromium}=require('../frontend/node_modules/playwright');
const fs=require('fs');
const fixture=JSON.parse(fs.readFileSync('.local/qa-school.json','utf8'));
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const base='http://127.0.0.1:8000';const errors=[];
 const login=async(auth,width=1440)=>{const context=await browser.newContext({viewport:{width,height:1000}});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/login');await page.evaluate(a=>{localStorage.setItem('token',a.access_token);localStorage.setItem('user',JSON.stringify(a.user));},auth);return page;};
 try{
  const teacher=await login(fixture.teacher);await teacher.goto(base+'/admin/professor');await teacher.getByRole('heading',{name:'Painel do professor',exact:true}).waitFor();
  if(await teacher.getByRole('link',{name:'Contas dos professores',exact:true}).count())throw Error('Teacher sees account administration');
  await teacher.screenshot({path:'docs/painel-professor-completo.png',fullPage:true});
  await teacher.goto(base+'/admin/reports');await teacher.getByRole('cell',{name:fixture.student.user.nome,exact:true}).waitFor();await teacher.screenshot({path:'docs/relatorios-turma.png',fullPage:true});
  const download=teacher.waitForEvent('download');await teacher.getByRole('button',{name:'Exportar planilha (CSV)'}).click();if((await download).suggestedFilename()!=='eti-relatorio.csv')throw Error('CSV unavailable');
  await teacher.goto(base+'/workspace');await teacher.getByRole('heading',{name:fixture.activity.titulo,exact:true}).waitFor();await teacher.getByText('Entregaram (1)',{exact:true}).click();await teacher.locator('article').filter({has:teacher.getByRole('heading',{name:fixture.activity.titulo,exact:true})}).getByText(fixture.student.user.nome,{exact:true}).waitFor();
  const student=await login(fixture.student,390);await student.goto(base+'/activities/'+fixture.activity.id);await student.getByRole('radio',{name:'Leitura',exact:true}).waitFor();await student.context().setOffline(true);await student.getByLabel('2. Compartilhe sua reflexão').fill('Rascunho escrito sem internet.');await student.getByRole('radio',{name:'Escrita',exact:true}).check();
  await student.context().setOffline(false);await student.reload();if(await student.getByLabel('2. Compartilhe sua reflexão').inputValue()!=='Rascunho escrito sem internet.')throw Error('Offline activity draft lost');if(!await student.getByRole('radio',{name:'Escrita',exact:true}).isChecked())throw Error('Choice draft lost');
  await student.goto(base+'/editor/'+fixture.book.id);await student.getByTestId('summary-textarea').fill('Meu resumo guardado automaticamente.');await student.reload();if(await student.getByTestId('summary-textarea').inputValue()!=='Meu resumo guardado automaticamente.')throw Error('Summary draft lost');
  await student.goto(base+'/text-productions');await student.getByTestId('new-production-button').click();await student.getByLabel('Título',{exact:true}).fill('Minha produção em rascunho');await student.getByLabel('Texto',{exact:true}).fill('Texto preservado ao fechar.');await student.getByRole('button',{name:'Cancelar',exact:true}).click();await student.getByTestId('new-production-button').click();if(await student.getByLabel('Texto',{exact:true}).inputValue()!=='Texto preservado ao fechar.')throw Error('Production draft lost');
  await student.goto(base+'/reader/'+fixture.book.id);await student.locator('.react-pdf__Page__canvas').waitFor({timeout:30000});await student.getByRole('button',{name:'Próxima',exact:true}).click();await student.getByText('Página salva na sua conta.',{exact:true}).waitFor();await student.reload();await student.locator('.react-pdf__Page__canvas').waitFor();if(await student.getByLabel('Página atual',{exact:true}).inputValue()!=='2')throw Error('PDF position not restored');
  if(await student.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Reader mobile overflow');await student.screenshot({path:'docs/leitor-pdf-mobile.png',fullPage:true});
  await student.goto(base+'/notifications');await student.getByRole('heading',{name:'Avisos',exact:true}).waitFor();if(await student.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Notifications mobile overflow');
  await teacher.evaluate(()=>localStorage.setItem('eti-theme','dark'));await teacher.reload();await teacher.getByRole('heading',{name:fixture.activity.titulo,exact:true}).waitFor();await teacher.waitForTimeout(250);await teacher.screenshot({path:'docs/pendencias-tema-escuro.png',fullPage:true});
  const admin=await login(fixture.admin);await admin.goto(base+'/admin/teachers');await admin.getByRole('heading',{name:'Contas dos professores',exact:true}).waitFor();await admin.getByRole('heading',{name:fixture.teacher.user.nome,exact:true}).waitFor();await admin.screenshot({path:'docs/contas-professores.png',fullPage:true});
  await admin.goto(base+'/forgot-password');await admin.getByRole('heading',{name:'Recuperar acesso',exact:true}).waitFor();
  if(errors.length)throw Error(errors.join('\n'));
  console.log('PASS browser: teacher tools, reports/CSV, pending names, offline choice/text drafts, summary/production drafts, real PDF render/page restore, mobile, dark theme and recovery form.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
