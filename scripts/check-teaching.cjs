// Explicit browser fixtures: no AI charges or writes to the school database.
const {chromium}=require('../frontend/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const teacher={id:'teacher',nome:'Professor de teste',role:'teacher',turmas:['7º ANO']};
 let configured=false,materials=[],published=0,corrections=0;
 const activity={id:'a',titulo:'Atividade de teste',turma:'7º ANO',descricao:'Interprete o texto',professor_nome:'Professor',professor_id:'teacher',status:'aberta',perguntas:[{id:'q',enunciado:'Explique a ideia principal.',tipo:'texto'}],anexos:[]};
 await page.route('**/api/**',async route=>{
  const p=new URL(route.request().url()).pathname,method=route.request().method();let data=[];
  if(p==='/api/admin/ai/status')data={configured,remaining:20,limit:20};
  else if(p==='/api/admin/ai/generate')data={titulo:'Rascunho de teste',descricao:'Leia com atenção',turma:'7º ANO',perguntas:[{enunciado:'Qual é a ideia principal?'}]};
  else if(p==='/api/admin/ai/review/activity/r')data={nota:8,feedback:'Desenvolva seu argumento.',justificativa:'A resposta identifica o tema.'};
  else if(p==='/api/admin/activities'&&method==='POST'){published++;data={id:'new'};}
  else if(p==='/api/activities/a')data=activity;
  else if(p==='/api/admin/activities/a/responses')data=[{id:'r',user_nome:'Aluno de teste',user_turma:'7º ANO',updated_at:new Date().toISOString(),respostas:[{pergunta_id:'q',resposta:'É sobre amizade.'}]}];
  else if(p.endsWith('/correction')&&method==='PUT'){corrections++;data={id:'r',...route.request().postDataJSON()};}
  else if(p==='/api/materials')data=materials;
  else if(p==='/api/admin/materials'&&method==='POST'){data={...route.request().postDataJSON(),id:'m',professor_id:'teacher',professor_nome:'Professor',video_id:'abcdefghijk'};materials=[data];}
  else if(p==='/api/admin/materials/m'&&method==='DELETE'){materials=[];return route.fulfill({status:204});}
  await route.fulfill({json:data});
 });
 await page.goto('http://127.0.0.1:3000/login');
 await page.evaluate(u=>{localStorage.setItem('token','fixture');localStorage.setItem('user',JSON.stringify(u));},teacher);
 await page.goto('http://127.0.0.1:3000/admin/assistant');
 await page.getByText(/Ativação pendente/).waitFor();assert(await page.getByRole('button',{name:'Gerar rascunho de atividade'}).isDisabled());
 configured=true;await page.reload();
 await page.getByLabel('O que a turma vai estudar?').fill('Interpretação');await page.getByLabel('Disciplina',{exact:true}).fill('Português');
 await page.getByRole('button',{name:'Gerar rascunho de atividade'}).click();
 await page.getByLabel('Título *',{exact:true}).waitFor();assert.equal(published,0);
 assert.equal(await page.getByLabel('Título *',{exact:true}).inputValue(),'Rascunho de teste');
 await page.getByLabel('Título *',{exact:true}).fill('Atividade revisada');await page.getByRole('button',{name:'Publicar atividade',exact:true}).click();await page.waitForURL('**/admin/activities');assert.equal(published,1);
 await page.goto('http://127.0.0.1:3000/admin/activities/a');await page.getByRole('button',{name:'Sugerir correção com IA'}).click();await page.getByRole('button',{name:'Gerar sugestão',exact:true}).click();await page.getByText('Sugestão de nota: 8.0').waitFor();assert.equal(corrections,0);
 await page.getByRole('button',{name:'Usar nos campos de correção'}).click();assert.equal(await page.getByLabel('Nota (0 a 10)').inputValue(),'8');assert.equal(corrections,0);
 await page.goto('http://127.0.0.1:3000/videos');await page.getByRole('button',{name:'Adicionar material'}).click();
 await page.getByLabel('Título',{exact:true}).fill('Aula sobre crônicas');await page.getByLabel('Disciplina',{exact:true}).fill('Português');await page.getByLabel('Link do vídeo no YouTube').fill('https://youtu.be/abcdefghijk');await page.getByLabel('Orientações de estudo').fill('Assista e anote suas dúvidas.');await page.getByRole('button',{name:'Publicar material'}).click();
 await page.getByRole('heading',{name:'Aula sobre crônicas',exact:true}).waitFor();await page.getByLabel('Buscar materiais').fill('inexistente');await page.getByRole('heading',{name:'Nenhum resultado'}).waitFor();await page.getByLabel('Buscar materiais').fill('');
 await page.screenshot({path:'.local/videos-desktop.png',fullPage:true});
 for(const url of ['/videos','/admin/assistant']){await page.goto('http://127.0.0.1:3000'+url);await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await page.screenshot({path:'.local/assistant-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Ativar tema escuro'}).click();await page.screenshot({path:'.local/assistant-dark.png',fullPage:true});
 await page.evaluate(()=>localStorage.setItem('user',JSON.stringify({id:'student',nome:'Aluno',role:'student',turma:'7º ANO'})));
 await page.goto('http://127.0.0.1:3000/videos');await page.getByRole('heading',{name:'Aula sobre crônicas',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Adicionar material'}).count(),0);assert.equal(await page.getByRole('button',{name:'Editar',exact:true}).count(),0);
 await page.goto('http://127.0.0.1:3000/admin/assistant');await page.waitForURL('**/dashboard');
 assert.deepEqual(errors,[]);console.log('PASS: AI activation, editable draft, explicit publication, review without automatic grade, video publication and search, student permissions, mobile overflow, dark theme. Fixtures only.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
