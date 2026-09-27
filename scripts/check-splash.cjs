const {chromium}=require('../frontend/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.goto('http://127.0.0.1:3000/login');
  await page.getByRole('main',{name:'Abertura da ETI LEITURA'}).waitFor();
  await page.waitForTimeout(650);
  await page.screenshot({path:'.local/splash-desktop.png'});
  await page.getByRole('main',{name:'Abertura da ETI LEITURA'}).waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('eti-splash-seen')),'1');
  await page.reload();assert.equal(await page.locator('.eti-splash').count(),0);
  const mobile=await browser.newPage({viewport:{width:320,height:700}});
  await mobile.goto('http://127.0.0.1:3000/login');await mobile.locator('.eti-splash').waitFor();await mobile.waitForTimeout(500);
  assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await mobile.screenshot({path:'.local/splash-mobile.png'});await mobile.keyboard.press('Escape');await mobile.locator('.eti-splash').waitFor({state:'hidden'});
  const quiet=await browser.newPage({reducedMotion:'reduce'});await quiet.goto('http://127.0.0.1:3000/login');
  await quiet.locator('.splash-quiet').waitFor();assert.equal(await quiet.locator('.splash-content').evaluate(e=>getComputedStyle(e).animationName),'none');await quiet.locator('.eti-splash').waitFor({state:'hidden'});
  const capture=await browser.newPage({viewport:{width:1440,height:900}});
  await capture.addInitScript(()=>{const timer=window.setTimeout;window.setTimeout=(fn,delay,...args)=>timer(fn,delay===1800?15000:delay,...args);});
  await capture.goto('http://127.0.0.1:3000/login');await capture.locator('.eti-splash').waitFor();await capture.waitForTimeout(700);await capture.screenshot({path:'.local/splash-desktop.png'});await capture.setViewportSize({width:320,height:700});await capture.screenshot({path:'.local/splash-mobile.png'});await capture.getByRole('button',{name:'Entrar na plataforma'}).click();
  await capture.setViewportSize({width:1440,height:900});await capture.locator('.brand-sprite-frames').first().waitFor();
  const sprite=await capture.locator('.brand-sprite-frames').first().evaluate(e=>{const animation=e.getAnimations()[0];const duration=animation.effect.getTiming().duration;animation.pause();animation.currentTime=0;const start=getComputedStyle(e).transform;animation.currentTime=9500;const moving=getComputedStyle(e).transform;animation.currentTime=10500;const resting=getComputedStyle(e).transform;return {duration,start,moving,resting};});
  assert.equal(sprite.duration,10000);assert.notEqual(sprite.moving,sprite.start);assert.equal(sprite.resting,sprite.start);
  await capture.emulateMedia({reducedMotion:'reduce'});assert.equal(await capture.locator('.brand-sprite-frames').first().evaluate(e=>getComputedStyle(e).animationName),'none');
  console.log('PASS: branded splash, automatic dismissal, once per tab, Escape skip, mobile layout, 10-second logo sprite and reduced-motion preference.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
