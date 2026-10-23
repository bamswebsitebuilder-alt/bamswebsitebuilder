import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=new URL('../',import.meta.url);
const paths=[];
for(const folder of ['', 'es/']) for(const f of fs.readdirSync(new URL(folder,root))) if(f.endsWith('.html')) paths.push(folder+f);
const expected=['home','services','prices','subscriptions','domains','portfolio','templates','project-stories','reviews','about','website-tips','website-review','faq','updates','email-updates','contact','login','booking'];
test('business menus have matching destinations and order in desktop and mobile, in both languages',()=>{
 let checked=0;
 for(const file of paths){
  const html=fs.readFileSync(new URL(file,root),'utf8');
  const desktop=html.match(/<nav class="desktop-navigation"[^>]*>([\s\S]*?)<\/nav>/);
  if(!desktop)continue;checked++;
  const mobile=html.match(/<nav class="(?:mobile-navigation|booking-mobile-links)"[^>]*>([\s\S]*?)<\/nav>/);assert.ok(mobile,file);
  for(const menu of [desktop[1],mobile[1]]) {
   const pages=[...menu.matchAll(/<a data-page="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(pages,expected,file);
   assert.ok(pages.indexOf('portfolio')<pages.indexOf('templates'),file);
   const urls=[...menu.matchAll(/<a[^>]*href="([^"]+)"/g)].map(m=>m[1]);
   for(const href of urls){assert.ok(file.startsWith('es/')?(href.startsWith('/es/')||href==='/domains'):!href.startsWith('/es/'),file+' '+href);const clean=href.split('#')[0].replace(/^\//,'');assert.ok(clean===''||clean==='es/'||fs.existsSync(new URL(clean+'.html',root)),file+' '+href)}
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
