import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {prepareAgreementDraft,quoteMatches} from '../js/agreement-draft.js';
import {validateQuote,TERMS_VERSION} from '../js/agreement-model.js';

test('published package prices, monthly totals and revision estimates are exact; custom drafts invent no scope or costs',()=>{
  const expected={starter:[250,249.96,2],business:[500,500.04,2],premium:[850,849.96,3]};
  for(const [plan,[price,total,revisions]] of Object.entries(expected)){
    const once=prepareAgreementDraft({plan,quoteNumber:'Q-1'});
    const monthly=prepareAgreementDraft({plan,payment:'monthly',language:'es',quoteNumber:'Q-2'});
    assert.equal(once.amount,price);assert.equal(monthly.amount,total);assert.equal(once.revisions,revisions);
    assert.equal(once.scope,'');assert.equal(once.costs,'');assert.equal(once.project,'');assert.match(monthly.payments,/12 pagos/);
  }
  assert.equal(prepareAgreementDraft({project:{title:'Website Project — Onboarding'}}).project,'');
  const custom=prepareAgreementDraft({project:{title:'Actual project'},quoteNumber:'Q-3'});
  assert.equal(custom.project,'Actual project');assert.equal(custom.amount,'');assert.equal(custom.delivery,'');
});

const source=readFileSync(new URL('../js/agreements-admin.js',import.meta.url),'utf8')
  .replace(/^import .*;\r?\n/gm,'').replace('export function createAdminAgreements','function createAdminAgreements');

function setup(storage=new Map()){
  const ids=['client','number','provider','project','language','amount','payments','delivery','revisions','scope','costs','variations','plan','payment','preview-button','new-draft'];
  const make=()=>({_value:'',get value(){return this._value;},set value(value){this._value=String(value);},disabled:false,hidden:false,textContent:'',dataset:{},handlers:{},children:[],
    addEventListener(type,fn){this.handlers[type]=fn;},replaceChildren(...children){this.children=children;},append(child){this.children.push(child);}});
  const elements=new Map(ids.map(id=>['agreement-'+id,make()]));
  for(const id of ['agreement-form','admin-agreements','agreement-form-status','agreement-preview'])elements.set(id,make());
  const button=make();const form=elements.get('agreement-form');
  form.querySelector=()=>button;form.querySelectorAll=()=>[...ids.map(id=>elements.get('agreement-'+id)),button];
  let timer;const stored=new Map();let writes=0,failAfterWrite=false;const previews=[];
  const context={sessionStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},document:{documentElement:{lang:'en'},getElementById:id=>elements.get(id),createElement:make},
    Option:function(text,value){this.text=text;this.value=value;},crypto:webcrypto,TextEncoder,Date,Number,Uint8Array,Map,
    prepareAgreementDraft,quoteMatches,validateQuote,TERMS_VERSION,downloadAgreement(){},
    renderAgreement(host,quote){previews.push(quote);host.textContent=quote.quoteNumber;},
    fetch:async()=>({ok:true,json:async()=>({en:'Fixed versioned English terms',es:'Términos fijos'})}),
    setTimeout(fn){timer=fn;return 1;},clearTimeout(){timer=null;},
    db:{},doc:(_db,...parts)=>parts.join('/'),collection:(_db,...parts)=>parts.join('/'),serverTimestamp:()=> 'server-time',Timestamp:{fromDate:date=>date},
    onSnapshot(_ref,callback){callback({empty:true,docs:[]});return ()=>{};},
    runTransaction:async(_db,fn)=>fn({get:async ref=>({exists:()=>stored.has(ref),data:()=>stored.get(ref)}),set(ref,value){stored.set(ref,value);writes++;if(failAfterWrite){failAfterWrite=false;throw Error('Connection lost after commit');}}})
  };
  vm.runInNewContext(source,context);
  const ui=context.createAdminAgreements(()=>({uid:'owner'}),id=>({title:`Project ${id}`}));
  ui.clients([{id:'one',fullName:'Client One',email:'one@example.test'},{id:'two',fullName:'Client Two',email:'two@example.test'}]);
  const field=id=>elements.get('agreement-'+id);
  const choose=id=>{field('client').value=id;field('client').handlers.change();};
  const preset=(plan,payment='one-time')=>{field('plan').value=plan;field('payment').value=payment;field('plan').handlers.change();};
  const complete=()=>{field('scope').value='Home, About and Contact; responsive layout and contact form. Files and launch handover included. Milestone approval by written review.';field('costs').value='Client pays hosting and domain directly; no additional recurring BAM service included.';};
  return {field,choose,preset,complete,button,stored,previews,form,ui,status:elements.get('agreement-form-status'),writes:()=>writes,
    preview:async()=>{form.handlers.input();await timer();},submit:()=>form.handlers.submit({preventDefault(){}}),failOnce(){failAfterWrite=true;}};
}

test('client selection prepares a draft without issuing it and keeps different client edits separate',()=>{
  const ui=setup();ui.choose('one');assert.match(ui.field('number').value,/^BAM-/);assert.equal(ui.field('project').value,'Project one');
  ui.field('scope').value='Private draft for one';ui.choose('two');assert.equal(ui.field('scope').value,'');assert.equal(ui.field('project').value,'Project two');
  ui.choose('one');assert.equal(ui.field('scope').value,'Private draft for one');assert.equal(ui.writes(),0);
});

test('package selection fills approved terms while retaining exact owner-entered scope and costs',()=>{
  const ui=setup();ui.choose('one');ui.complete();const scope=ui.field('scope').value;
  ui.preset('business','monthly');assert.equal(ui.field('amount').value,'500.04');assert.equal(ui.field('scope').value,scope);assert.match(ui.field('costs').value,/Client pays/);
  assert.equal(ui.writes(),0);
});

test('completed drafts preview automatically and only explicit approval issues the fixed agreement',async()=>{
  const ui=setup();ui.choose('one');ui.preset('starter');await ui.preview();assert.equal(ui.previews.length,0);assert.equal(ui.writes(),0);
  ui.complete();await ui.preview();assert.equal(ui.previews.length,1);assert.equal(ui.writes(),0);
  await ui.submit();assert.equal(ui.writes(),1);assert.equal(ui.button.disabled,true);
  const issued=[...ui.stored.values()][0];assert.equal(issued.clientEmail,'one@example.test');assert.equal(issued.state,'issued');assert.equal(issued.termsVersion,TERMS_VERSION);
  await ui.submit();assert.equal(ui.writes(),1);
});

test('retry after an uncertain commit reuses the same quote and cannot duplicate or rewrite it',async()=>{
  const ui=setup();ui.choose('one');ui.preset('premium');ui.complete();ui.failOnce();await ui.submit();assert.equal(ui.writes(),1);assert.equal(ui.button.disabled,false);
  await ui.submit();assert.equal(ui.writes(),1);assert.equal(ui.button.disabled,true);
  ui.button.disabled=false;ui.field('amount').value='999';await ui.submit();assert.equal(ui.writes(),1);assert.match(ui.status.textContent,/already used/);
});

test('starting another draft makes a new quote number without reusing the issued scope',async()=>{
  const ui=setup();ui.choose('one');ui.preset('starter');ui.complete();const old=ui.field('number').value;await ui.submit();
  ui.field('new-draft').handlers.click();assert.notEqual(ui.field('number').value,old);assert.equal(ui.field('scope').value,'');assert.equal(ui.button.disabled,false);
});

test('saving a project prepares its client draft and updates automatic titles without changing manual titles',()=>{
  const app=setup();app.choose('one');app.field('scope').value='Scope for one';
  app.ui.prepareFor('two',{title:'New client project'});
  assert.equal(app.field('client').value,'two');assert.equal(app.field('project').value,'New client project');assert.equal(app.field('scope').value,'');
  app.ui.project({userId:'two',title:'Updated project'});assert.equal(app.field('project').value,'Updated project');
  app.field('project').value='Owner entered quote name';app.ui.project({userId:'two',title:'Later project name'});
  assert.equal(app.field('project').value,'Owner entered quote name');assert.equal(app.writes(),0);
});

test('a refreshed dashboard restores the unfinished draft and its stable quote number in this tab',async()=>{
  const storage=new Map();const first=setup(storage);first.choose('one');first.preset('starter');first.complete();await first.preview();
  const number=first.field('number').value;const second=setup(storage);second.choose('one');
  assert.equal(second.field('number').value,number);assert.equal(second.field('scope').value,first.field('scope').value);
  assert.equal(second.field('amount').value,'250');assert.equal(second.writes(),0);
});
