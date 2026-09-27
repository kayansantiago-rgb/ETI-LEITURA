// Browser workflow with explicit API fixtures; does not modify school records.
const {chromium}=require('../frontend/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  let models=[],published=[],writes=[];
  const activity={id:'a',titulo:'Interpretação de crônica',descricao:'Leia e justifique sua interpretação.',turma:'7º ANO',disciplina:'Português',status:'aberta',prazo:null,encerrada:false,professor_id:'t',professor_nome:'Professora',perguntas:[{id:'q',enunciado:'Qual é a ideia principal?',tipo:'texto',alternativas:[]}],anexos:[]};
  let response={id:'r',user_nome:'Aluno',user_turma:'7º ANO',updated_at:'2026-09-21T12:00:00Z',respostas:[{pergunta_id:'q',resposta:'Resposta original'}],nota:0,feedback:'Explique melhor.',tentativa:1,historico:[]};
  await page.addInitScript(()=>{sessionStorage.setItem('eti-splash-seen','1');localStorage.setItem('token','fixture');if(!localStorage.getItem('user'))localStorage.setItem('user',JSON.stringify({id:'t',role:'teacher',nome:'Professora',turmas:['7º ANO']}));});
  await page.route('**/api/**',async route=>{
   const req=route.request(),p=new URL(req.url()).pathname,method=req.method();let data=[];
   if(method!=='GET')writes.push(p);
   if(p==='/api/admin/activity-templates'){
    if(method==='POST'){const body=req.postDataJSON();data={...body,id:'model-'+models.length};models.push(data);}else data=models;
   }else if(p.startsWith('/api/admin/activity-templates/')){
    const id=p.split('/').pop();if(method==='DELETE'){models=models.filter(x=>x.id!==id);return route.fulfill({status:204});}
    if(method==='PUT'){data={...req.postDataJSON(),id};models=models.map(x=>x.id===id?data:x);}
   }else if(p==='/api/activities')data=[activity,...published];
   else if(p==='/api/admin/activities'&&method==='POST'){data={...req.postDataJSON(),id:'copy',entregas:0,corrigidas:0};published.push(data);}
   else if(p==='/api/activities/a')data={...activity,minha_resposta:response,pode_reenviar:!!response.reenvio};
   else if(p==='/api/admin/activities/a/responses')data=[response];
   else if(p.endsWith('/r/return')){response={...response,reenvio:{...req.postDataJSON(),devolvido_em:'2026-09-21T13:00:00Z'}};data=response;}
   else if(p==='/api/activities/a/response'){
    const {historico,...snapshot}=response;response={...response,...req.postDataJSON(),tentativa:2,nota:null,feedback:null,reenvio:null,historico:[...historico,snapshot],updated_at:'2026-09-21T14:00:00Z'};data=response;
   }else if(p==='/api/admin/ai/status')data={configured:false};
   return route.fulfill({json:data});
  });
  await page.goto('http://127.0.0.1:3000/admin/activities');
  await page.getByRole('button',{name:'Meus modelos',exact:true}).click();
  await page.getByRole('button',{name:'Criar modelo',exact:true}).click();
  await page.getByLabel('Título *',{exact:true}).fill('Modelo de interpretação');
  await page.getByLabel('Pergunta 1 *',{exact:true}).fill('Explique o tema central.');
  await page.getByRole('button',{name:'Salvar modelo',exact:true}).click();
  await page.getByRole('heading',{name:'Modelo de interpretação',exact:true}).waitFor();
  assert.equal(published.length,0,'Saving a template must not publish');
  await page.getByRole('button',{name:'Editar',exact:true}).click();
  await page.getByLabel('Título *',{exact:true}).fill('Modelo revisado');
  await page.getByRole('button',{name:'Salvar modelo',exact:true}).click();
  await page.getByRole('heading',{name:'Modelo revisado',exact:true}).waitFor();
  await page.getByLabel('Buscar modelos por título ou disciplina').fill('revisado');
  for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Template overflow '+width);}
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.local/activity-library-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'Usar modelo',exact:true}).click();
  assert.equal(await page.getByLabel('Título *',{exact:true}).inputValue(),'Modelo revisado');
  assert.equal(await page.getByLabel('Data limite (opcional)').inputValue(),'');
  assert.equal(published.length,0,'Using a template opens a draft');
  await page.getByRole('button',{name:'Publicar atividade',exact:true}).click();
  await page.getByRole('heading',{name:'Modelo revisado',exact:true}).waitFor();
  assert.equal(published.length,1);
  await page.goto('http://127.0.0.1:3000/admin/activities/a');
  await page.getByRole('button',{name:'Duplicar para outra turma'}).click();
  assert.equal(await page.getByLabel('Título *',{exact:true}).inputValue(),activity.titulo);
  await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  await page.getByRole('button',{name:'Salvar como modelo'}).click();
  await page.getByText('Atividade salva em Meus modelos.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Correção',exact:true}).click();
  await page.getByRole('button',{name:'Devolver para nova tentativa'}).click();
  await page.getByLabel('Orientações para refazer',{exact:true}).fill('Inclua exemplos do texto.');
  await page.getByLabel('Novo prazo (até 23h59, Brasília)').fill('2099-01-01');
  await page.getByRole('button',{name:'Liberar tentativa',exact:true}).click();
  await page.getByText('Devolvida para refazer',{exact:true}).waitFor();
  await page.evaluate(()=>localStorage.setItem('user',JSON.stringify({id:'s',role:'student',nome:'Aluno',turma:'7º ANO'})));
  await page.goto('http://127.0.0.1:3000/activities/a');
  await page.getByText('Refaça sua atividade',{exact:true}).waitFor();
  await page.getByLabel('1. Qual é a ideia principal?').fill('Resposta revisada com exemplos.');
  await page.getByRole('button',{name:'Revisar respostas',exact:true}).click();
  await page.getByRole('button',{name:'Enviar nova tentativa',exact:true}).click();
  await page.getByText('Tentativa 2 enviada',{exact:true}).waitFor();
  await page.getByText('Histórico de tentativas (1)',{exact:true}).click();
  await page.getByText('Resposta original',{exact:true}).waitFor();
  await page.getByText('Nota: 0.0',{exact:true}).waitFor();
  assert.equal(await page.getByLabel('Respostas da atividade').getByText('Resposta revisada com exemplos.',{exact:true}).count(),1);
  assert.equal(await page.getByRole('button',{name:'Enviar nova tentativa',exact:true}).count(),0);
  for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'History overflow '+width);}
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Ativar tema escuro'}).click();
  await page.screenshot({path:'.local/attempt-history-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS: create/edit/use template, independent publication, duplication, teacher return, student retry, original response and zero grade history, mobile widths and dark theme.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
