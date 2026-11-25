import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
import {test} from 'node:test';
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('hair salon demo is discoverable in both galleries and selectable on both quote forms', () => {
  assert.match(read('templates.html'), /"Velvet Strand","Hair salon","beauty","business"[^\]]+"\/velvet-strand"/);
  assert.match(read('es/templates.html'), /href="\/es\/contact\?template=Velvet%20Strand&amp;package=business"/);
  for (const path of ['contact.html','es/contact.html']) assert.match(read(path), /<option value="Velvet Strand">Velvet Strand<\/option>/);
  assert.match(read('velvet-strand/index.html'), /href="\/contact\?template=Velvet%20Strand&amp;package=Business"/);
});
test('the demo previews a selected service without submitting an appointment', () => {
  const make = () => ({events:{},addEventListener(type, callback){this.events[type]=callback;}});
  const form=make(), service=make(), button=make(), result=make(), link=make();
  link.dataset={service:'color'};
  service.selectedOptions=[{textContent:'Dimensional Color'}];
  runInNewContext(read('velvet-strand/booking.js'),{document:{
    querySelector: key => ({'#booking-preview':form,'#service':service,'#preview-button':button,'#booking-result':result})[key],
    querySelectorAll: () => [link]
  }});
  link.events.click(); assert.equal(service.value,'color');
  button.events.click(); assert.match(result.textContent,/Dimensional Color · 2 hours.*No appointment was booked/);
  let canceled=false; form.events.submit({preventDefault(){canceled=true;}});
  assert.equal(canceled,true);
});
