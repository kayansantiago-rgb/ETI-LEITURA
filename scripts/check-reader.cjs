// Visual and interaction checks with explicit fixtures; no database is modified.
const fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require('../frontend/node_modules/playwright');
process.chdir(path.resolve(__dirname,'..'));
const root=path.resolve(__dirname,'../frontend/build');
const server=http.createServer((req,res)=>{let file=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);return res.end();}if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(root,'index.html');const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html','.mjs':'application/javascript','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml'})[ext]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
(async()=>{await new Promise(r=>server.listen(4173,'127.0.0.1',r));const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1050}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const user={id:'test',nome:'Mariana Silva',email:'mariana@example.com',turma:'7º ANO',role:'student'};
const books=[{id:'1',titulo:'O Pequeno Príncipe',autor:'Antoine de Saint-Exupéry',progress:45,nivel_ensino:'AMBOS'},{id:'2',titulo:'A Ilha do Tesouro',autor:'Robert Louis Stevenson',progress:15,nivel_ensino:'FUNDAMENTAL'},{id:'3',titulo:'Dom Casmurro',autor:'Machado de Assis',progress:100,nivel_ensino:'MÉDIO'},{id:'4',titulo:'O Jardim Secreto',autor:'Frances Hodgson Burnett',progress:0,nivel_ensino:'AMBOS'}].map((b,i)=>({...b,descricao:'Uma história para descobrir novas perspectivas e compartilhar ideias.',capa_url:`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="${['#233f62','#467369','#a16b4d','#6a668c'][i]}"/><rect x="20" y="20" width="260" height="360" rx="2" fill="none" stroke="#ffffff55"/><circle cx="150" cy="165" r="65" fill="none" stroke="#ffffff44" stroke-width="2"/><path d="M85 210 L150 90 L215 210Z" fill="none" stroke="#ffffff77"/><text x="150" y="295" text-anchor="middle" font-size="17" font-family="serif" fill="white">${b.titulo}</text><text x="150" y="340" text-anchor="middle" font-size="10" font-family="sans-serif" fill="#ffffffaa">ETI LEITURA · ACERVO DE TESTE</text></svg>`)}`}));
await page.route('**/api/**',async route=>{const url=new URL(route.request().url()),p=url.pathname;let data=[];if(p==='/api/stats')data={total_books:4,my_summaries:2};else if(p==='/api/admin/stats')data={total_books:4,total_users:28,total_summaries:12,total_productions:7};else if(p==='/api/books')data=books;else if(p==='/api/auth/me')data=user;else if(p==='/api/calendar')data=[{id:'e1',titulo:'Roda de leitura',data:`${url.searchParams.get('ano')}-${String(url.searchParams.get('mes')).padStart(2,'0')}-22`,cor:'#294b9c'}];else if(p==='/api/books/1')data=books[0];else if(p==='/api/books/1/progress')data={percentage:45};else if(p==='/api/books/1/summary')return route.fulfill({status:404,json:{detail:'Sem resumo'}});return route.fulfill({json:data});});

const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 500 700] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R >>','','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 500 700] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >> >>','','<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>'];
objects[4]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 500 700] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>';
for(const [i,n] of [[3,1],[5,2]]){const stream='BT /F1 12 Tf 55 635 Td (ETI LEITURA - ACERVO DE TESTE) Tj 0 -75 Td /F1 28 Tf (Uma janela para o mundo) Tj 0 -50 Td /F1 14 Tf (Cada livro abre um novo caminho.) Tj 0 -25 Td (Era uma vez uma escola cheia de historias.) Tj 0 -25 Td (Ao abrir um livro, tudo podia acontecer.) Tj 0 -390 Td (Pagina '+n+') Tj ET';objects[i]='<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream';}
let pdf='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=(i+1)+' 0 obj\n'+o+'\nendobj\n';});let x=Buffer.byteLength(pdf);pdf+='xref\n0 8\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n'+x+'\n%%EOF';
books[0].arquivo_url='data:application/pdf;base64,'+Buffer.from(pdf).toString('base64');
await page.route('**/api/books/1/position',r=>r.fulfill({json:{page:1}}));
await page.goto('http://127.0.0.1:4173/login');
await page.evaluate(u=>{localStorage.setItem('user',JSON.stringify(u));localStorage.setItem('token','visual-test-only')},user);
await page.goto('http://127.0.0.1:4173/reader/1');
await page.locator('.react-pdf__Page canvas').waitFor().catch(async e=>{console.log(await page.locator('body').innerText(),errors);throw e;});
if(!await page.locator('.reading-focus').count())throw Error('Reader must start immersed');
await page.getByRole('button',{name:'Próxima página',exact:true}).click();
if(await page.getByLabel('Página atual').inputValue()!=='2')throw Error('Page navigation failed');
await page.getByRole('button',{name:'Ajustes',exact:true}).click();
await page.getByRole('button',{name:'Sépia',exact:true}).click();
await page.getByRole('button',{name:'Aumentar página',exact:true}).click();
await page.getByText('125%',{exact:true}).waitFor();
await page.getByRole('button',{name:'Diminuir página',exact:true}).click();
await page.getByRole('button',{name:'Fechar',exact:true}).click();
await page.waitForTimeout(700);
await page.screenshot({path:'docs/leitor-imersivo-desktop.png',fullPage:true});
await page.reload();await page.locator('.react-pdf__Page canvas').waitFor();
if(await page.getByLabel('Página atual').inputValue()!=='2')throw Error('Saved position lost');
await page.setViewportSize({width:390,height:844});
await page.getByRole('button',{name:'Ajustes',exact:true}).click();
await page.getByRole('button',{name:'Noturno',exact:true}).click();
await page.getByRole('button',{name:'Fechar',exact:true}).click();
await page.waitForTimeout(400);
if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Reader mobile overflow');
await page.screenshot({path:'docs/leitor-imersivo-mobile.png',fullPage:true});
await page.getByRole('link',{name:'Voltar ao livro'}).click();await page.getByTestId('book-details-page').waitFor();
await page.goto('http://127.0.0.1:4173/eti-logo.svg');
for(const size of [192,512]){await page.setViewportSize({width:size,height:size});await page.screenshot({path:'frontend/public/logo'+size+'.png',omitBackground:true});}
if(errors.length)throw Error(errors.join('\n'));
console.log('PASS: PDF renders, immersive default, pagination, paper, zoom, persistence, mobile, exit. Mock PDF and API only.');await browser.close();server.close();})().catch(e=>{console.error(e);server.close();process.exit(1)});
