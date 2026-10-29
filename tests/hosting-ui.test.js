import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {renderHosting} from '../js/hosting-view.js';

test('hosting editor retains failed drafts, prevents duplicate saves, and isolates client drafts',async()=>{
  const dom=new JSDOM('<html lang="en"><div id="admin-hosting"></div></html>');globalThis.document=dom.window.document;
  let source=await readFile(new URL('../js/hosting-admin.js',import.meta.url),'utf8');source=source.replace("import {hostingStore} from './hosting-store.js?v=1';",'const hostingStore={};').replace('./hosting-model.js?v=1',new URL('../js/hosting-model.js',import.meta.url).href).replace('./hosting-view.js?v=1',new URL('../js/hosting-view.js',import.meta.url).href);
  const {createAdminHosting}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  let calls=0,fail=true,finish;const store={async save(){calls++;if(fail)throw Error('offline');return new Promise(resolve=>{finish=resolve;});}};
  const ui=createAdminHosting(()=>({uid:'admin'}),store);
  const clients=[{id:'a',businessName:'Bakery <script>alert(1)</script>'},{id:'b',businessName:'Studio'}];
  const projects=[{userId:'a',hosting:{revision:1,plan:'Managed hosting',provider:'Provider',status:'active'}}];
  ui.update(clients,projects);
  const select=document.getElementById('hosting-client'),form=document.getElementById('hosting-form');
  const change=()=>select.dispatchEvent(new dom.window.Event('change'));
  const input=(name,value)=>{form.elements.namedItem(name).value=value;form.dispatchEvent(new dom.window.Event('input'));};
  const submit=()=>form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));
  select.value='a';change();input('issues','Please check this draft.');submit();await new Promise(setImmediate);
  assert.equal(calls,1);assert.match(document.getElementById('hosting-save-status').textContent,/draft is still here/);assert.equal(form.elements.namedItem('issues').value,'Please check this draft.');
  ui.update(clients,projects);assert.equal(form.elements.namedItem('issues').value,'Please check this draft.');
  select.value='b';change();input('plan','Studio hosting');select.value='a';change();assert.equal(form.elements.namedItem('issues').value,'Please check this draft.');
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
