import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {renderHosting} from '../js/hosting-view.js';

test('hosting editor retains failed drafts, prevents duplicate saves, and isolates client drafts',async()=>{
  const dom=new JSDOM('<html lang="en"><div id="admin-hosting"></div></html>');globalThis.document=dom.window.document;
  let source=await readFile(new URL('../js/hosting-admin.js',import.meta.url),'utf8');source=source.replace("import {hostingStore} from './hosting-store.js?v=3';",'const hostingStore={};').replace('./hosting-model.js?v=3',new URL('../js/hosting-model.js',import.meta.url).href).replace('./hosting-view.js?v=3',new URL('../js/hosting-view.js',import.meta.url).href);
  const {createAdminHosting}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  let calls=0,fail=true,finish;const store={async save(){calls++;if(fail)throw Error('offline');return new Promise(resolve=>{finish=resolve;});}};
  const ui=createAdminHosting(()=>({uid:'admin'}),store);
  const clients=[{id:'a',businessName:'Bakery <script>alert(1)</script>'},{id:'b',businessName:'Studio'}];
  const projects=[{userId:'a',hosting:{revision:1,plan:'Managed hosting',provider:'Provider',status:'active',domainName:'bakery.example',domainRenewal:'2000-01-01'}}];
  ui.update(clients,projects);
  const filter=document.getElementById('hosting-filter');filter.value='renewal';filter.dispatchEvent(new dom.window.Event('change'));assert.equal(document.querySelectorAll('.hosting-account').length,1);
  const search=document.getElementById('hosting-search');search.value='bakery.example';search.dispatchEvent(new dom.window.Event('input'));assert.equal(document.querySelectorAll('.hosting-account').length,1);search.value='';filter.value='all';filter.dispatchEvent(new dom.window.Event('change'));
  const select=document.getElementById('hosting-client'),form=document.getElementById('hosting-form');
  const change=()=>select.dispatchEvent(new dom.window.Event('change'));
  const input=(name,value)=>{form.elements.namedItem(name).value=value;form.dispatchEvent(new dom.window.Event('input'));};
  const submit=()=>form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));
  select.value='a';change();input('issues','Please check this draft.');input('domainName','bakery.example');input('domainRegistrar','Example registrar');submit();await new Promise(setImmediate);
  assert.equal(calls,1);assert.match(document.getElementById('hosting-save-status').textContent,/draft is still here/);assert.equal(form.elements.namedItem('issues').value,'Please check this draft.');
  ui.update(clients,projects);assert.equal(form.elements.namedItem('issues').value,'Please check this draft.');
  select.value='b';change();input('plan','Studio hosting');select.value='a';change();assert.equal(form.elements.namedItem('issues').value,'Please check this draft.');assert.equal(form.elements.namedItem('domainName').value,'bakery.example');
  fail=false;submit();submit();assert.equal(calls,2);assert.equal(select.disabled,true);finish(2);await new Promise(setImmediate);assert.match(document.getElementById('hosting-save-status').textContent,/saved/);assert.equal(select.disabled,false);
  assert.equal(document.querySelector('#hosting-account-list script'),null);
  ui.reset();assert.equal(form.elements.namedItem('issues').value,'');assert.equal(form.querySelector('fieldset').disabled,true);
  delete globalThis.document;dom.window.close();
});
test('client view renders user content literally and exposes no recurring checkout before acceptance',()=>{
  const dom=new JSDOM('<div id="hosting"></div>');globalThis.document=dom.window.document;
  const record={plan:'<script>alert(1)</script>',provider:'Provider',siteUrl:'javascript:alert(1)',status:'active',billingMode:'paypal',paypalPlanId:'P-ABCDE12345',billingStatus:'awaiting-approval',agreementId:'quote',feeCents:2500,cadence:'monthly',issues:'<img src=x onerror=alert(1)>'};
  const host=document.getElementById('hosting');renderHosting(host,record);assert.equal(host.querySelector('script,img'),null);assert.ok(host.textContent.includes('<script>'));assert.equal(host.querySelector('a[href^="https://www.paypal.com"]'),null);assert.equal(host.querySelector('a[href^="javascript:"]'),null);
  renderHosting(host,record,{accepted:true});assert.ok(host.querySelector('a[href^="https://www.paypal.com"]'));renderHosting(host,{...record,billingStatus:'active'},{accepted:true});assert.equal(host.querySelector('a[href^="https://www.paypal.com"]'),null);
  delete globalThis.document;dom.window.close();
});
test('standard hosting plan fills future-client drafts without saving or resetting existing billing',async()=>{
  for(const lang of ['en','es']){
    const dom=new JSDOM(`<html lang="${lang}"><div id="admin-hosting"></div></html>`);globalThis.document=dom.window.document;
    let source=await readFile(new URL('../js/hosting-admin.js',import.meta.url),'utf8');source=source.replace("import {hostingStore} from './hosting-store.js?v=3';",'const hostingStore={};').replace('./hosting-model.js?v=3',new URL('../js/hosting-model.js',import.meta.url).href).replace('./hosting-view.js?v=3',new URL('../js/hosting-view.js',import.meta.url).href);
    const {createAdminHosting}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
    let saves=0;const ui=createAdminHosting(()=>({uid:'admin'}),{async save(){saves++;return 1;}});
    ui.update([{id:'new'},{id:'existing'}],[{userId:'existing',hosting:{plan:'Existing',provider:'Provider',billingStatus:'active',status:'active'}}]);
    const select=document.getElementById('hosting-client'),form=document.getElementById('hosting-form'),preset=document.getElementById('hosting-standard-plan');
    select.value='new';select.dispatchEvent(new dom.window.Event('change'));preset.click();
    const field=name=>form.elements.namedItem(name).value;
    assert.equal(field('fee'),'39.00');assert.equal(field('cadence'),'monthly');assert.equal(field('paypalPlanId'),'P-61X62492NG9864027NLRJU6A');assert.equal(field('billingMode'),'paypal');assert.equal(field('billingStatus'),'awaiting-approval');assert.equal(field('agreementNumber'),'');assert.equal(field('provider'),'');assert.equal(saves,0);
    form.elements.namedItem('provider').value='Provider';form.elements.namedItem('agreementNumber').value='1001';form.dispatchEvent(new dom.window.Event('input'));
    const record={...Object.fromEntries([...form.elements].filter(e=>e.name).map(e=>[e.name,e.value])),feeCents:3900,agreementId:'accepted-quote'};
    const {paypalHostingLink}=await import('../js/hosting-model.js');assert.equal(paypalHostingLink(record,false),'');assert.equal(paypalHostingLink(record,true),'https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=P-61X62492NG9864027NLRJU6A');
    select.value='existing';select.dispatchEvent(new dom.window.Event('change'));preset.click();assert.equal(field('billingStatus'),'active');assert.equal(field('status'),'active');assert.equal(saves,0);
    select.value='new';select.dispatchEvent(new dom.window.Event('change'));assert.equal(field('agreementNumber'),'1001');
    ui.reset();delete globalThis.document;dom.window.close();
  }
});

test('clients see domain information and the exact PayPal payment path only when ready',()=>{
  for(const es of [false,true]){
    const dom=new JSDOM('<div id="hosting"></div>');globalThis.document=dom.window.document;const host=document.getElementById('hosting');
    const record={plan:'Managed hosting',provider:'Provider',status:'setup',billingMode:'paypal',billingStatus:'awaiting-approval',paypalPlanId:'P-61X62492NG9864027NLRJU6A',agreementId:'quote',feeCents:3900,cadence:'monthly',domainName:'client.example',domainRegistrar:'Registrar <script>',domainManageUrl:'https://registrar.example/account',domainOwner:'client',domainRenewal:'2099-10-28'};
    renderHosting(host,record,{es});assert.equal(host.querySelector('a[href^="https://www.paypal.com"]'),null);assert.match(host.querySelector('.hosting-payment').textContent,es?/Acuerdos/:/Agreements/);
    renderHosting(host,record,{es,accepted:true});const pay=host.querySelector('a[href^="https://www.paypal.com"]');assert.equal(pay.href,'https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=P-61X62492NG9864027NLRJU6A');assert.ok(pay.textContent.includes('$39.00'));assert.ok(host.textContent.includes('client.example'));assert.ok(host.textContent.includes('Registrar <script>'));assert.equal(host.querySelector('script'),null);assert.equal(host.querySelector('a[href="https://registrar.example/account"]').rel,'noopener noreferrer');assert.ok(host.querySelector('a[href="'+(es?'/es':'')+'/domains"]'));
    renderHosting(host,{...record,billingStatus:'active'},{es,accepted:true});assert.equal(host.querySelector('a[href^="https://www.paypal.com"]'),null);assert.match(host.querySelector('.hosting-payment').textContent,es?/existente/:/existing subscription/);
    renderHosting(host,{...record,domainManageUrl:'javascript:alert(1)',billingMode:'invoice',billingStatus:'active'},{es});assert.equal(host.querySelector('a[href^="javascript:"]'),null);assert.match(host.querySelector('.hosting-payment').textContent,es?/Facturas/:/Invoices/);
    renderHosting(host,null,{es});assert.match(host.textContent,es?/Acuerdos/:/Agreements/);assert.ok(host.querySelector('a[href="'+(es?'/es':'')+'/domains"]'));
    delete globalThis.document;dom.window.close();
  }
});
