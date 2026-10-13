import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync(new URL('../js/inquiry-feedback.js',import.meta.url),'utf8');
function setup(){
 const listeners={},timers=[];const button={textContent:'Send Message',disabled:false};let status;
 const form={dataset:{},querySelector:()=>button,checkValidity:()=>true,append:x=>status=x,addEventListener:(k,fn)=>listeners[k]=fn};
 vm.runInNewContext(code,{document:{documentElement:{lang:'en'},querySelectorAll:()=>[form],createElement:()=>({setAttribute(){}})},window:{addEventListener:(k,fn)=>listeners[k]=fn},setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout(){}});
 return {listeners,timers,form,button,status};
}
test('native submission blocks duplicate clicks and recovers when delivery stays unconfirmed',()=>{
 const r=setup();r.listeners.submit({preventDefault(){throw Error('first submit must remain native')}});assert.equal(r.button.disabled,true);assert.equal(r.form.dataset.sending,'true');
 let prevented=false;r.listeners.submit({preventDefault(){prevented=true}});assert.equal(prevented,true);
 r.timers[0]();assert.equal(r.button.disabled,false);assert.equal(r.button.textContent,'Send Message');assert.match(r.status.textContent,/Delivery has not been confirmed/);
});
test('returning with the browser Back button restores the form button',()=>{
 const r=setup();r.listeners.submit({preventDefault(){}});r.listeners.pageshow();assert.equal(r.button.disabled,false);assert.equal(r.form.dataset.sending,undefined);
});
