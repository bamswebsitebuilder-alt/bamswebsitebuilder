import test from 'node:test';
import assert from 'node:assert/strict';
import {requestInput,validateScreenshot,adminRequestPatch,buildAttentionItems} from '../js/change-request-model.js';
test('requests reject unsafe URLs and invalid attachments without discarding valid Unicode content',()=>{
  assert.equal(requestInput({title:' Cambiar botón ',pageUrl:'https://example.com/contact?q=1',description:'Cambiar el texto del botón.'}).title,'Cambiar botón');
  for(const pageUrl of ['javascript:alert(1)','ftp://example.com','https://name:password@example.com','example.com'])assert.throws(()=>requestInput({title:'Change button',description:'Please update the contact button.',pageUrl}));
  for(const file of [{type:'image/svg+xml',size:100},{type:'image/png',size:6*1024*1024},{type:'image/png',size:0}])assert.throws(()=>validateScreenshot(file));
  validateScreenshot({type:'image/png',size:100});
});
test('review requires a deliberate state transition and scope classification',()=>{
  assert.throws(()=>adminRequestPatch({status:'submitted'},{status:'completed',scope:'included'}));
  assert.throws(()=>adminRequestPatch({status:'in-review'},{status:'in-progress',scope:'unreviewed'}));
  assert.throws(()=>adminRequestPatch({status:'completed'},{status:'submitted',scope:'included'}));
  assert.deepEqual(adminRequestPatch({status:'in-review'},{status:'in-progress',scope:'included',adminNote:' Included revision. '}),{status:'in-progress',scope:'included',adminNote:'Included revision.'});
});
test('attention queue prioritizes overdue work and omits settled items and future approvals',()=>{
  const now=new Date(2026,9,28,12),stamp=date=>({toMillis:()=>date.getTime()});
  const rows=buildAttentionItems({clients:[{id:'c',fullName:'Client',unreadByAdmin:2}],
    projects:[{userId:'c',title:'Overdue project',status:'In Progress',estimatedCompletion:new Date(2026,9,25),automationEnabled:true,workflowTasks:[{id:'design',done:false},{id:'design-approval',done:false}]}],
    invoices:[{userId:'c',id:'old',status:'unpaid',dueDate:stamp(new Date(2026,9,24)),amount:50},{userId:'c',status:'paid',amount:100},{userId:'c',status:'void',amount:100}],
    requests:[{id:'new',userId:'c',status:'submitted',title:'New change'},{id:'done',userId:'c',status:'completed',title:'Done change'}]},now);
  assert.equal(rows.filter(x=>x.priority===0).length,2);assert.equal(rows.filter(x=>x.kind==='invoices').length,1);
  assert.equal(rows.filter(x=>x.kind==='requests').length,1);assert.equal(rows.filter(x=>x.detail.includes('approval task')).length,0);
  assert.equal(rows.find(x=>x.kind==='messages').clientName,'Client');
});
