import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../js/navigation.js', import.meta.url), 'utf8');
function page(path, language='en') {
  const events = {}, bands = [];
  const classes = () => { const values=new Set(); return {toggle(k,on){on?values.add(k):values.delete(k)}, contains(k){return values.has(k)}}; };
  const element = () => ({classList:classes(),attributes:{},listeners:{},hidden:false,
    setAttribute(k,v){this.attributes[k]=v},addEventListener(k,v){this.listeners[k]=v},getClientRects(){return [{}]},
    focus(){document.activeElement=this},querySelector(){return null},querySelectorAll(){return []}});
  const first=element(),last=element(),toggle=element(),overlay=element(),close=element(),header=element(),menu=element();
  menu.querySelector=s=>s==='.mobile-theme-section'?element():s==='a, button'?first:null;
  menu.querySelectorAll=()=>[first,last];
  menu.contains=e=>e===first||e===last;
  const document={readyState:'complete',activeElement:toggle,
    documentElement:{lang:language,dataset:{},style:{}},body:{classList:classes()},head:{append(){}},
    getElementById(id){return {'menu-toggle':toggle,'mobile-menu':menu,'menu-overlay':overlay,'mobile-menu-close':close,'site-header':header}[id]},
    querySelector(s){return s==='.mobile-menu'?menu:s==='footer'?{insertAdjacentElement(_,band){bands.push(band)}}:null},
    querySelectorAll(){return []},createElement(){return element()},addEventListener(k,v){events[k]=v}};
  const window={addEventListener(){},matchMedia(){return {matches:false,addEventListener(){}}},requestAnimationFrame(cb){cb()},scrollY:0};
  vm.runInNewContext(source,{document,window,location:{pathname:path},navigator:{},localStorage:{getItem(){return 'dark'}}});
  return {document,menu,toggle,overlay,close,first,last,events,bands};
}
test('quote prompt uses the correct language for English, Spanish, and HTML aliases',()=>{
  for (const [path,lang,target] of [['/portfolio','en','/contact'],['/es/portfolio','es','/es/contact'],['/es/portfolio.html','es','/es/contact'],['/subscriptions.html','en','/contact']]) {
    const p=page(path,lang);assert.equal(p.bands.length,1);assert.ok(p.bands[0].innerHTML.includes(`href="${target}"`));
  }
  for (const path of ['/','/es/','/contact','/es/contact','/login','/es/client-portal']) assert.equal(page(path).bands.length,0);
});
test('closed drawer is inert; open drawer traps keyboard focus and Escape restores the trigger',()=>{
  const p=page('/');assert.equal(p.menu.inert,true);p.toggle.listeners.click();
  assert.equal(p.menu.inert,false);assert.equal(p.toggle.attributes['aria-expanded'],'true');assert.equal(p.document.activeElement,p.first);
  let prevented=false;p.events.keydown({key:'Tab',shiftKey:true,preventDefault(){prevented=true}});
  assert.equal(prevented,true);assert.equal(p.document.activeElement,p.last);
  p.events.keydown({key:'Tab',shiftKey:false,preventDefault(){}});assert.equal(p.document.activeElement,p.first);
  p.events.keydown({key:'Escape'});assert.equal(p.menu.inert,true);assert.equal(p.toggle.attributes['aria-expanded'],'false');assert.equal(p.document.activeElement,p.toggle);
});
test('overlay and close button both close the mobile drawer',()=>{
  const p=page('/');for (const button of [p.overlay,p.close]) {p.toggle.listeners.click();button.listeners.click();assert.equal(p.menu.inert,true);assert.equal(p.document.activeElement,p.toggle)}
});
