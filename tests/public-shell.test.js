import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
test('pages with the shared header load one shared navigation script and link to privacy',()=>{
  let count=0;
  for(const folder of ['', 'es/']) {
    for(const file of fs.readdirSync(new URL(folder,root)).filter(f=>f.endsWith('.html'))) {
      const label=folder+file;
      const html=fs.readFileSync(new URL(label,root),'utf8');
      if(!html.includes('class="site-header"'))continue;
      count++;
      assert.equal([...html.matchAll(/<script[^>]*src="\/js\/navigation\.js(?:\?[^"]*)?"/g)].length,1,label+' navigation');
      assert.ok(!html.includes('/js/booking-menu.js'),label+' obsolete parallel menu');
      const footers=[...html.matchAll(/<footer\b[\s\S]*?<\/footer>/g)];
      const publicFooter=footers.at(-1)?.[0];
      assert.ok(publicFooter,label+' site footer');
      assert.match(publicFooter,/href="\/privacy-policy"/,label+' privacy policy');
    }
  }
  assert.ok(count>=55);
});
