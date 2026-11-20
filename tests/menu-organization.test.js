import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const paths=[];
const config=JSON.parse(fs.readFileSync(new URL('vercel.json',root),'utf8'));
const pageExists=href=>{
  const target=href.split('#')[0].replace(/^\//,'');
  if(target===''||target==='es/'||fs.existsSync(new URL(target+'.html',root))) return true;
  return config.redirects.some(r=>r.source==='/'+target && r.statusCode===301 &&
    r.destination.startsWith('/') && fs.existsSync(new URL(r.destination.slice(1).split('#')[0]+'.html',root)));
};
for(const folder of ['', 'es/']) for(const f of fs.readdirSync(new URL(folder,root))) if(f.endsWith('.html')) paths.push(folder+f);
const expected=['home','services','prices','subscriptions','domains','hosting','portfolio','templates','project-stories','reviews','about','website-tips','website-review','faq','updates','email-updates','contact','login','booking'];
test('business navigation groups use available destinations in both languages',()=>{
 let checked=0;
 for(const file of paths){
  const html=fs.readFileSync(new URL(file,root),'utf8');
  const desktop=html.match(/<nav class="desktop-navigation"[^>]*>([\s\S]*?)<\/nav>/);
  if(!desktop)continue;checked++;
  const mobile=html.match(/<nav class="(?:mobile-navigation|booking-mobile-links)"[^>]*>([\s\S]*?)<\/nav>/);assert.ok(mobile,file);
  for(const menu of [desktop[1],mobile[1]]) {
   const pages=[...menu.matchAll(/<a data-page="([^"]+)"/g)].map(m=>m[1]);
   const coreGroups=expected.slice(0,16).filter(page=>page!=='subscriptions'||file.startsWith('es/'));
   let next=-1;
   for(const page of coreGroups) {
    const at=pages.indexOf(page,next+1);
    assert.notEqual(at,-1,file+' missing or out of order: '+page);
    next=at;
   }
   const urls=[...menu.matchAll(/<a[^>]*href="([^"]+)"/g)].map(m=>m[1]);
   for(const href of urls){assert.ok(file.startsWith('es/')?(href.startsWith('/es/')||href==='/domains'):!href.startsWith('/es/'),file+' '+href);assert.ok(pageExists(href),file+' '+href)}
  }
  assert.equal([...desktop[1].matchAll(/data-menu-group=/g)].length,3,file);
  assert.equal([...mobile[1].matchAll(/class="mobile-nav-group"/g)].length,3,file);
 }
 assert.ok(checked>=50);
});
test('menus retain only one mobile booking destination and preserve the quote CTA',()=>{
 for(const file of paths) {
  const html=fs.readFileSync(new URL(file,root),'utf8');if(!html.includes('class="desktop-navigation"'))continue;
  const drawer=html.match(/<aside[^>]*class="(?:mobile-menu|booking-mobile-menu)"[^>]*>([\s\S]*?)<\/aside>/);assert.ok(drawer,file);
  assert.equal([...drawer[1].matchAll(/data-page="booking"/g)].length,1,file);
  if(!file.endsWith('booking.html'))assert.ok(drawer[1].includes('class="mobile-menu-cta"'),file);
 }
});
