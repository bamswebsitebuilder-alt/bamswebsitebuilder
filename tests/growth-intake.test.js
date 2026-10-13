import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const script=fs.readFileSync(new URL('../js/quote-inquiry.js',import.meta.url),'utf8');
function intake(query,spanish=false,draft='') {
  const select=values=>({value:'',options:values.map(value=>({value}))});
  const fields={message:{value:draft},package:select(spanish?['','Sitio inicial','Sitio empresarial','Sitio premium']:['','Starter Website','Business Website','Premium Website']),
    'payment-option':select(['','One-time payment','Starter Monthly - $20.83/month for 12 months']),
    [spanish?'website-template':'template-choice']:select(['','Titan Athletics','AFTERHOURS Premium','Pearl & Pine Dentistry']),
    'inquiry-preferences':{open:false}};
  const document={documentElement:{lang:spanish?'es':'en'},getElementById:id=>fields[id],addEventListener(_,cb){cb()}};
  vm.runInNewContext(script,{document,window:{location:{search:query}},URLSearchParams});return fields;
}
test('a design selected in either language is carried into the form and the inquiry text',()=>{
  for (const es of [false,true]) {const f=intake('?template=Titan%20Athletics&package=premium',es);assert.equal(f[es?'website-template':'template-choice'].value,'Titan Athletics');assert.equal(f.package.value,es?'Sitio premium':'Premium Website');assert.match(f.message.value,/Titan Athletics/);assert.equal(f['inquiry-preferences'].open,true)}
});
test('encoded design names remain literal and customer drafts are preserved',()=>{
  const f=intake('?template=Pearl%20%26%20Pine%20Dentistry');assert.equal(f['template-choice'].value,'Pearl & Pine Dentistry');assert.match(f.message.value,/Pearl & Pine Dentistry/);
  assert.equal(intake('?template=Titan%20Athletics',false,'My existing draft').message.value,'My existing draft');
});
test('ordinary inquiries leave design and payment optional, and monthly choices still work',()=>{
  const blank=intake('');assert.equal(blank['template-choice'].value,'');assert.equal(blank['payment-option'].value,'');assert.equal(blank['inquiry-preferences'].open,false);
  const f=intake('?plan=starter-monthly');assert.equal(f.package.value,'Starter Website');assert.equal(f['payment-option'].value,'Starter Monthly - $20.83/month for 12 months');
});
const templateScript=fs.readFileSync(new URL('../js/templates.js',import.meta.url),'utf8');
function templateCards(es) {
  let clone;const card={innerHTML:'',cloneNode(){clone={innerHTML:''};return clone},insertAdjacentElement(){}};
  vm.runInNewContext(templateScript,{document:{documentElement:{lang:es?'es':'en'},querySelector(){return card},querySelectorAll(){return []}}});return [card.innerHTML,clone.innerHTML];
}
test('generated starter and premium designs keep the correct language and quote destination',()=>{
  for (const es of [false,true]) for(const card of templateCards(es)) {assert.ok(card.includes(es?'href="/es/contact?template=':'href="/contact?template='));assert.ok(card.includes(es?'Elegir diseño':'Choose Design'));assert.ok(card.includes(es?'Ver demo':'View Demo'));if(es)assert.ok(!card.includes('Up to 10 website pages'))}
});
