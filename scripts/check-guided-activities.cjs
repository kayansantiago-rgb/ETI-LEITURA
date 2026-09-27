// Isolated browser fixtures: no real students, notes or publications are modified.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const {chromium}=require('../frontend/node_modules/playwright');
const root=path.resolve('frontend/build');
const server=http.createServer((req,res)=>{let file=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);return res.end();}if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(root,'index.html');res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
(async()=>{await new Promise(r=>server.listen(4175,'127.0.0.1',r));const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));
 const activity={id:'a',titulo:'Entre palavras e descobertas',descricao:'Leia com atenção e desenvolva suas ideias. Cada resposta conta uma parte da sua aprendizagem.',turma:'7º ANO',disciplina:'Português',status:'aberta',prazo:null,encerrada:false,professor_id:'t',professor_nome:'Professora Ana',perguntas:[{id:'q1',enunciado:'Que mensagem o texto trouxe para você?',tipo:'texto',alternativas:[]},{id:'q2',enunciado:'Qual sentimento melhor representa a leitura?',tipo:'alternativa',alternativas:['Curiosidade','Esperança','Alegria']}],anexos:[]};
 let submitted=null,failSubmit=true,comments=[],scheduled=[];
 let responses=['Mariana Silva','Pedro Almeida'].map((nome,i)=>({id:'r'+i,user_nome:nome,user_turma:'7º ANO',updated_at:'2026-09-25T12:00:00+00:00',respostas:[{pergunta_id:'q1',resposta:i?'A leitura me fez pensar em como aprendemos uns com os outros.':'O texto mostra que as pequenas descobertas também mudam nossa forma de ver o mundo. Quando a personagem compartilha sua ideia, todos encontram um caminho novo.'},{pergunta_id:'q2',resposta:i?'Esperança':'Curiosidade'}],nota:null,feedback:null,tentativa:1,historico:[]}));
 await page.addInitScript(()=>{sessionStorage.setItem('eti-splash-seen','1');localStorage.setItem('token','fixture');if(!localStorage.getItem('user'))localStorage.setItem('user',JSON.stringify({id:'s',nome:'Mariana Silva',role:'student',turma:'7º ANO'}));});
 await page.route('**/api/**',async route=>{const req=route.request(),p=new URL(req.url()).pathname,m=req.method();let data=[];
  if(m!=='GET')writes.push({p,body:req.postDataJSON()});
  if(p==='/api/activities/a')data={...activity,minha_resposta:submitted};
  else if(p==='/api/activities/a/response'){if(failSubmit){failSubmit=false;return route.fulfill({status:503,json:{detail:'Teste: tente novamente.'}});}submitted={...req.postDataJSON(),id:'mine',tentativa:1,historico:[]};data=submitted;}
  else if(p==='/api/admin/activities/a/responses')data=responses;
  else if(p.endsWith('/correction')){const id=p.split('/').at(-2);data={...responses.find(r=>r.id===id),...req.postDataJSON()};responses=responses.map(r=>r.id===id?data:r);}
  else if(p==='/api/admin/feedback-templates'){if(m==='POST'){data={id:'c'+comments.length,...req.postDataJSON()};comments.push(data);}else data=comments;}
  else if(p.startsWith('/api/admin/feedback-templates/')){comments=comments.filter(c=>c.id!==p.split('/').pop());return route.fulfill({status:204});}
  else if(p==='/api/activities')data=[{...activity,entregas:2,corrigidas:0},...scheduled];
  else if(p==='/api/admin/activities'&&m==='POST'){data={...req.postDataJSON(),id:'scheduled',agendada:true,entregas:0,corrigidas:0};scheduled.push(data);}
  else if(p==='/api/admin/rubrics')data=[{id:'rubric',titulo:'Leitura e interpretação',criterios:[{descricao:'Compreensão',pontos:6},{descricao:'Justificativa',pontos:4}]}];
  return route.fulfill({json:data});
 });
 const goto=p=>page.goto('http://127.0.0.1:4175'+p);
 const noOverflow=async label=>{for(const width of [320,390,768,1100,1440]){await page.setViewportSize({width,height:1000});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)console.log(await page.evaluate(()=>Array.from(document.querySelectorAll('body *')).filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>[e.tagName,e.className,e.id,Math.round(e.getBoundingClientRect().width)]).slice(0,25)));assert.equal(overflow,false,label+' overflow '+width);}};
 await goto('/activities/a');await page.getByRole('heading',{name:'Pergunta 1 de 2'}).waitFor();
 await page.getByRole('button',{name:'Próxima',exact:true}).click();await page.getByText('Responda esta pergunta para continuar.').waitFor();
 await page.getByLabel('1. Que mensagem o texto trouxe para você?').fill('Aprendi que descobrir pode começar com uma pergunta.');
 await page.getByRole('button',{name:'Próxima',exact:true}).click();await page.getByLabel('Curiosidade',{exact:true}).check();
 assert.equal(writes.filter(w=>w.p.endsWith('/response')).length,0);
 await page.getByRole('button',{name:'Anterior',exact:true}).click();assert.equal(await page.getByLabel('1. Que mensagem o texto trouxe para você?').inputValue(),'Aprendi que descobrir pode começar com uma pergunta.');
 await page.reload();assert.equal(await page.getByLabel('1. Que mensagem o texto trouxe para você?').inputValue(),'Aprendi que descobrir pode começar com uma pergunta.');
 await noOverflow('guided answer');await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.local/activity-steps-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Próxima',exact:true}).click();await page.getByRole('button',{name:'Revisar respostas',exact:true}).click();await page.getByRole('heading',{name:'Vamos revisar?'}).waitFor();await page.getByRole('button',{name:'Enviar respostas',exact:true}).click();await page.getByText('Teste: tente novamente.',{exact:true}).waitFor();assert(await page.getByText('Aprendi que descobrir pode começar com uma pergunta.',{exact:true}).isVisible());
 await page.getByRole('button',{name:'Enviar respostas',exact:true}).click();await page.getByText('Tentativa 1 enviada',{exact:true}).waitFor();assert.equal(submitted.respostas.length,2);
 await page.evaluate(()=>localStorage.setItem('user',JSON.stringify({id:'t',nome:'Professora Ana',role:'teacher',turmas:['7º ANO']})));
 await page.setViewportSize({width:1440,height:1000});await goto('/admin/activities/a');await page.locator('.correction-desk').waitFor();
 assert(await page.getByLabel('Respostas do aluno',{exact:true}).isVisible());assert(await page.getByLabel('Correção da entrega',{exact:true}).isVisible());
 await page.getByLabel('Nota (0 a 10)').fill('8');await page.getByLabel('Feedback para o aluno').fill('Boa interpretação.');
 await page.getByRole('button',{name:'Próximo aluno',exact:true}).click();assert.equal(await page.getByLabel('Nota (0 a 10)').inputValue(),'');
 await page.getByLabel('Nota (0 a 10)').fill('6');await page.getByRole('button',{name:'Anterior',exact:true}).click();assert.equal(await page.getByLabel('Nota (0 a 10)').inputValue(),'8');
 await page.getByText('Meus comentários reutilizáveis',{exact:true}).click();await page.getByLabel('Novo comentário reutilizável').fill('Inclua um exemplo do texto para aprofundar sua justificativa.');await page.getByRole('button',{name:'Salvar comentário',exact:true}).click();await page.getByRole('button',{name:'Adicionar ao feedback',exact:true}).click();
 assert((await page.getByLabel('Feedback para o aluno').inputValue()).includes('Boa interpretação.\n\nInclua um exemplo'));
 await page.screenshot({path:'.local/activity-correction-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Salvar e próximo',exact:true}).click();await page.locator('.correction-heading h3').filter({hasText:'Pedro Almeida'}).waitFor();assert.equal(responses[0].nota,8);assert.equal(responses[1].nota,null);assert.equal(await page.getByLabel('Nota (0 a 10)').inputValue(),'6');
 await noOverflow('correction');await page.setViewportSize({width:390,height:844});assert(await page.getByLabel('Respostas do aluno',{exact:true}).isVisible());assert.equal(await page.getByLabel('Correção da entrega',{exact:true}).isVisible(),false);
 await page.getByRole('button',{name:'Correção',exact:true}).click();assert(await page.getByLabel('Correção da entrega',{exact:true}).isVisible());await page.getByRole('button',{name:'Ativar tema escuro'}).click();await page.screenshot({path:'.local/activity-correction-mobile.png',fullPage:true});await page.getByRole('button',{name:'Enviar correção',exact:true}).click();await page.getByText('Correção enviada ao aluno.',{exact:true}).waitFor();assert.equal(responses[1].nota,6);
 await goto('/admin/activities');await page.getByRole('button',{name:'Criar atividade',exact:true}).click();await page.getByLabel('Título *',{exact:true}).fill('Leitura da próxima semana');await page.getByLabel('Pergunta 1 *',{exact:true}).fill('O que você descobriu?');await page.getByLabel('Agendar publicação').check();await page.getByLabel('Data e hora de publicação (Brasília)').fill('2099-01-02T08:30');await page.getByLabel('Data limite (opcional)').fill('2099-01-04');await noOverflow('schedule form');await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.local/activity-schedule-mobile.png',fullPage:true});await page.getByRole('button',{name:'Agendar atividade',exact:true}).click();await page.getByRole('heading',{name:'Leitura da próxima semana',exact:true}).waitFor();assert.equal(scheduled[0].publicar_em,'2099-01-02T11:30:00.000Z');assert.equal(await page.getByRole('button',{name:'Agendadas (1)',exact:true}).getAttribute('aria-pressed'),'true');assert.equal(await page.getByRole('heading',{name:activity.titulo,exact:true}).count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: guided mobile responses, required answers, draft restoration, review and failed-delivery recovery; independent correction drafts, private comments, save/next, mobile tabs; scheduling/timezone/tab; light/dark and responsive widths.');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});

