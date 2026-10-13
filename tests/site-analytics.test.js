import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../js/site-analytics.js',import.meta.url),'utf8');
function run({id='G-TEST123',allowed=true,path='/contact',pending=null}={}) {
  const listeners={}, nodes=[], store=new Map(pending?[['bam-inquiry-pending',JSON.stringify(pending)]]:[]);
  const window={BAM_ANALYTICS_ID:id,BAMCookieConsent:{decided:true,analytics:allowed},addEventListener:(k,cb)=>listeners[k]=cb};
  const document={documentElement:{lang:'en'},head:{append:n=>nodes.push(n)},createElement:()=>({}),addEventListener:(k,cb)=>listeners[k]=cb};
  vm.runInNewContext(source,{window,document,navigator:{},location:{origin:'https://www.bamswebsitebuilder.com',pathname:path,href:'https://www.bamswebsitebuilder.com'+path+'?email=private@example.com'},URL,Date,sessionStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}});
  return {window,listeners,nodes,store};
}
test('measurement stays off without a verified ID or analytics consent',()=>{
  for(const args of [{id:''},{allowed:false}]) {const r=run(args);assert.equal(r.nodes.length,0);assert.equal(r.window.dataLayer,undefined)}
});
test('consented public events strip customer query strings and advertising features',()=>{
  const r=run();assert.equal(r.nodes.length,1);const payload=JSON.stringify(r.window.dataLayer);assert.ok(!payload.includes('private@example.com'));assert.ok(payload.includes('allow_google_signals'));assert.ok(payload.includes('"page_location":"https://www.bamswebsitebuilder.com/contact"'));
});
test('revoking consent stops later click measurement',()=>{
  const r=run(), count=r.window.dataLayer.length;r.window.BAMCookieConsent.analytics=false;r.listeners['bam:consent-changed']();
  r.listeners.click({target:{closest:()=>({href:'tel:+17274178762',classList:{contains:()=>false}})}});
  assert.equal(r.window['ga-disable-G-TEST123'],true);assert.equal(r.window.dataLayer.length,count+1);
});
test('private portal and admin pages never load the analytics provider',()=>{
  for(const path of ['/admin-dashboard','/es/client-portal','/login'])assert.equal(run({path}).nodes.length,0);
});
test('a direct thank-you visit never counts as a submitted inquiry',()=>{
  let r=run({path:'/thank-you'});assert.ok(!JSON.stringify(r.window.dataLayer).includes('inquiry_provider_return'));
  r=run({path:'/thank-you',pending:{kind:'quote',time:Date.now()}});assert.ok(JSON.stringify(r.window.dataLayer).includes('inquiry_provider_return'));assert.equal(r.store.size,0);
});
