import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
test('every public page uses the current shared header, footer, CSS, and navigation script',()=>{
 let count=0;
 for(const folder of ['', 'es/']) {
  const home=fs.readFileSync(new URL(folder+'index.html',root),'utf8');const footer=home.match(/<footer\b[\s\S]*?<\/footer>/)[0];
  for(const file of fs.readdirSync(new URL(folder,root)).filter(f=>f.endsWith('.html'))) {
   const html=fs.readFileSync(new URL(folder+file,root),'utf8');if(!html.includes('class="site-header"'))continue;count++;
   assert.equal(html.match(/<footer\b[\s\S]*?<\/footer>/)[0],footer,folder+file);
   for(const asset of ['style','page-theme','footer-fix','site-upgrades','responsive-fixes','client-guide','accessibility','public-polish','menu-organization','public-shell']) {
    assert.equal([...html.matchAll(new RegExp('/css/'+asset+'\\.css\\?v=20261013-consistency-1','g'))].length,1,folder+file+' '+asset);
   }
   assert.ok(html.includes('/js/navigation.js?v=20261013-consistency-1'),folder+file);
   assert.ok(!html.includes('/js/booking-menu.js'),folder+file);
  }
 }
 assert.ok(count>=55);
});
