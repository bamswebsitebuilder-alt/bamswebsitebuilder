import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root=new URL('../',import.meta.url);
const read=name=>readFileSync(new URL(name,root),'utf8');
test('homepage delivery CTA points to a present package comparison',()=>{
  assert.match(read('index.html'),/href="\/prices#compare">Compare delivery estimates/);
  assert.match(read('prices.html'),/id="compare"/);
});
test('retired English subscriptions URL is not advertised as a canonical page',()=>{
  const config=JSON.parse(read('vercel.json'));
  assert.ok(config.redirects.some(r=>r.source==='/subscriptions'&&r.statusCode===301&&r.destination==='/prices#compare'));
  const sitemap=read('sitemap.xml');
  assert.doesNotMatch(sitemap,/\.com\/subscriptions(?:<|")/);
  assert.match(sitemap,/<loc>https:\/\/www\.bamswebsitebuilder\.com\/es\/subscriptions<\/loc>/);
});
test('demo contact links and the ConnectSphere preview controls have valid destinations',()=>{
  for(const folder of ['', 'es/']) {
    assert.match(read(folder+'evergreen-lawn-care/index.html'),/id="contact"/);
    for(const page of ['prices','portfolio','templates']) {
      const content=read(folder+'lawn-care-portfolio/'+page+'.html');
      assert.ok(content.includes('href="/'+folder+'evergreen-lawn-care#contact"'));
    }
    for(const sub of ['', 'es/']) {
      const html=read(folder+'connectsphere/'+sub+'index.html');
      for(const id of ['home','explore','friends']) {
        assert.ok(html.includes('id="'+id+'"')&&html.includes('href="#'+id+'"'));
      }
      assert.doesNotMatch(html,/href="#(?:messages|notifications|communities|saved|settings)"/);
    }
  }
});
