// Browser fixtures only; the live persistence/permissions flow is checked in check_school.py.
const {chromium}=require('../frontend/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const user={id:'t',role:'teacher',nome:'Professor de teste',turmas:['7º ANO']};
 const students=[{id:'s',nome:'Aluno de teste',turma:'7º ANO'}];
 let rubrics=[],grades=[],savedCorrection=0;
 let notices=[{id:'material:m',titulo:'Novo material: Aula de leitura',link:'/videos#material-m',data:new Date().toISOString(),lida:false},{id:'grade:g',titulo:'Nota disponível: Avaliação',link:'/gradebook',data:new Date().toISOString(),lida:false}];
 await page.route('**/api/**',async route=>{
  const p=new URL(route.request().url()).pathname,method=route.request().method();let result=[];
  if(p==='/api/admin/rubrics'){if(method==='POST'){rubrics=[{...route.request().postDataJSON(),id:'r',professor_id:'t'}];result=rubrics[0];}else result=rubrics;}
  else if(p==='/api/gradebook')result={alunos:students,notas:grades};
  else if(p==='/api/admin/grades'&&method==='POST'){grades=[{...route.request().postDataJSON(),id:'g',user_nome:'Aluno de teste',turma:'7º ANO',origem:'manual',editavel:true}];result=grades[0];}
  else if(p==='/api/notifications')result=notices;
  else if(p==='/api/notifications/read-all'){notices=notices.map(n=>({...n,lida:true}));result={ok:true};}
  else if(p==='/api/activities/a')result={id:'a',titulo:'Leitura',turma:'7º ANO',professor_id:'t',perguntas:[{id:'q',enunciado:'Explique a ideia principal.'}],anexos:[],status:'aberta'};
  else if(p==='/api/admin/activities/a/responses')result=[{id:'submission',user_nome:'Aluno',user_turma:'7º ANO',updated_at:new Date().toISOString(),respostas:[{pergunta_id:'q',resposta:'Sobre amizade.'}]}];
  else if(p.endsWith('/correction')){savedCorrection++;result={};}
  else if(p==='/api/materials')result=[{id:'m',titulo:'Aula de leitura',disciplina:'Português',turma:'7º ANO',professor_nome:'Professor',professor_id:'t',video_id:'abcdefghijk',anexos:[],transcricao:'Uma explicação acessível em texto.'}];
  else if(p==='/api/admin/ai/status')result={configured:false,remaining:20,limit:20};
  await route.fulfill({json:result});
 });
 await page.goto('http://127.0.0.1:3000/login');await page.evaluate(u=>{localStorage.setItem('user',JSON.stringify(u));localStorage.setItem('token','fixture');},user);
 await page.goto('http://127.0.0.1:3000/admin/rubrics');await page.getByRole('button',{name:'Novo modelo',exact:true}).click();await page.getByLabel('Nome do modelo').fill('Leitura e argumentação');await page.getByRole('button',{name:'Salvar modelo',exact:true}).click();await page.getByRole('heading',{name:'Leitura e argumentação',exact:true}).waitFor();assert.equal(rubrics[0].criterios.reduce((n,c)=>n+c.pontos,0),10);
 await page.goto('http://127.0.0.1:3000/admin/activities/a');await page.getByText('Corrigir por critérios',{exact:true}).click();await page.getByLabel('Modelo de critérios').selectOption('r');
 await page.getByLabel('Compreensão do conteúdo · até 4 pontos').fill('3');await page.getByLabel('Argumentação e exemplos · até 4 pontos').fill('4');await page.getByLabel('Clareza da escrita · até 2 pontos').fill('1');await page.getByRole('button',{name:'Preencher nota e feedback'}).click();assert.equal(await page.getByLabel('Nota (0 a 10)').inputValue(),'8');assert((await page.getByLabel('Feedback para o aluno').inputValue()).includes('Compreensão do conteúdo: 3 / 4'));assert.equal(savedCorrection,0);
 await page.goto('http://127.0.0.1:3000/gradebook');await page.getByRole('button',{name:'Lançar nota'}).click();await page.getByLabel('Aluno',{exact:true}).selectOption('s');await page.getByLabel('Avaliação',{exact:true}).fill('Produção de crônica');await page.getByLabel('Disciplina',{exact:true}).fill('Português');await page.getByLabel('Nota (0 a 10)',{exact:true}).fill('8');await page.getByLabel('Peso na média').fill('2');await page.getByLabel('Bimestre',{exact:true}).selectOption('3');await page.getByRole('button',{name:'Salvar nota',exact:true}).click();await page.getByRole('heading',{name:'Produção de crônica',exact:true}).waitFor();await page.getByText('8.00',{exact:true}).waitFor();
 await page.getByLabel('Filtrar bimestre').selectOption('2');await page.getByText(/Nenhuma nota encontrada/).waitFor();await page.getByLabel('Filtrar bimestre').selectOption('3');await page.screenshot({path:'.local/notas-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Opções de acessibilidade'}).click();await page.getByRole('button',{name:'Bem maior',exact:true}).click();await page.getByLabel('Reduzir animações').check();await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).fontSize),'20.8px');
 await page.reload();assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).fontSize),'20.8px');assert(await page.locator('html').evaluate(e=>e.classList.contains('reduce-motion')));
 for(const width of [390,320]){await page.setViewportSize({width,height:844});for(const path of ['/gradebook','/admin/rubrics','/videos']){await page.goto('http://127.0.0.1:3000'+path);await page.waitForTimeout(200);if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)){console.log(await page.evaluate(()=>Array.from(document.querySelectorAll('body *')).filter(e=>e.getBoundingClientRect().right>innerWidth&&getComputedStyle(e).visibility!=='hidden').map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right})).slice(0,20)));await page.screenshot({path:'.local/assessment-overflow.png',fullPage:true});throw Error(`${path} overflows at ${width}`);}}}
 await page.getByText('Ler transcrição ou resumo',{exact:true}).click();await page.getByText('Uma explicação acessível em texto.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Abrir menu',exact:true}).click();const drawer=page.getByRole('dialog',{name:'Menu de navegação'});await page.waitForFunction(()=>document.querySelector('#platform-sidebar').contains(document.activeElement));await page.keyboard.press('Shift+Tab');assert(await drawer.evaluate(e=>e.contains(document.activeElement)));await page.keyboard.press('Escape');await drawer.waitFor({state:'hidden'});assert(await page.getByRole('button',{name:'Abrir menu',exact:true}).evaluate(e=>e===document.activeElement));
 await page.goto('http://127.0.0.1:3000/notifications');await page.getByRole('button',{name:'Marcar todos como lidos'}).click();await page.getByLabel('Somente não lidos').check();await page.getByText('Todos os avisos foram lidos.',{exact:true}).waitFor();
 await page.goto('http://127.0.0.1:3000/gradebook');await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Ativar tema escuro'}).click();await page.screenshot({path:'.local/notas-mobile-accessible.png',fullPage:true});
 await page.evaluate(()=>localStorage.setItem('user',JSON.stringify({id:'s',role:'student',nome:'Aluno',turma:'7º ANO'})));grades=grades.map(g=>({...g,editavel:false}));await page.goto('http://127.0.0.1:3000/gradebook');await page.getByRole('heading',{name:'Minhas notas',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Lançar nota',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Editar nota',exact:true}).count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: reusable rubric totals and application, explicit correction save, manual grade form and weighted average, period filters, persistent font size, reduced motion, keyboard drawer/focus return, notices read-all, transcript, 320/390px without overflow, student controls hidden.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
