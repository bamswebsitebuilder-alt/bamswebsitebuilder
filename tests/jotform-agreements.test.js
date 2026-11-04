import test from 'node:test';
import assert from 'node:assert/strict';
import {createJotformHandler,submissionSummary} from '../lib/jotform-agreements.js';

const formId='263058308288060',submissionId='1234567890123456789';
const tokenFor=sub=>['header',Buffer.from(JSON.stringify({sub})).toString('base64url'),'signature'].join('.');
const submission={id:submissionId,form_id:formId,status:'ACTIVE',created_at:'2026-11-03 12:00:00',answers:{
  9:{type:'control_email',answer:'client@example.test'},64:{type:'control_signature',answer:'private-client-signature'},68:{type:'control_signature',answer:'private-provider-signature'}
}};
const baseRequest={method:'POST',headers:{origin:'https://www.bamswebsitebuilder.com','content-type':'application/json',authorization:'Bearer '+tokenFor('admin')},body:{action:'submission',clientUid:'client',agreementId:'agreement-one',submissionId}};
const clone=value=>structuredClone(value);
function setup(options={}){
  const requests=[];const env={JOTFORM_API_KEY:'test-only-api-key',JOTFORM_FORM_ID:formId,...options.env};
  const response=(body,status=200)=>({ok:status>=200&&status<300,status,json:async()=>body});
  const fetchFn=async(url,init)=>{
    requests.push({url,init});
    if(url.startsWith('https://firestore.googleapis.com/')){
      assert.equal(init.headers.APIKEY,undefined);assert.ok(init.headers.Authorization.startsWith('Bearer '));
      if(options.rejectedToken)return response({},403);
      if(url.endsWith('/users/admin')||url.endsWith('/users/client-admin'))return response({fields:{role:{stringValue:options.role||'admin'}}});
      if(url.endsWith('/users/client'))return response({fields:{role:{stringValue:'client'},email:{stringValue:options.email||'client@example.test'}}});
      if(url.endsWith('/serviceAgreements/agreement-one'))return response({fields:{termsVersion:{stringValue:'bam-client-service-2026-11-02-v1'},signingUrl:{stringValue:options.signingUrl||'https://form.jotform.com/'+formId}}},options.missingAgreement?404:200);
      return response({},404);
    }
    assert.equal(init.headers.APIKEY,'test-only-api-key');assert.equal(init.headers.Authorization,undefined);
    assert.ok(url.startsWith('https://api.jotform.com/'));assert.ok(!url.includes('test-only-api-key'));
    if(options.networkError)throw new Error('private vendor diagnostics');
    if(options.invalidJson)return {ok:true,status:200,json:async()=>{throw Error('invalid JSON');}};
    if(url.endsWith('/form/'+formId))return response({responseCode:200,content:{id:formId,type:'LEGACY',status:'ENABLED'}});
    return response({responseCode:options.vendorCode||200,content:options.submission||submission},options.vendorHttp||200);
  };
  const handler=createJotformHandler({env,fetchFn});
  const run=async request=>{
    const result={headers:{}};const res={setHeader:(name,value)=>result.headers[name]=value,status(status){result.status=status;return this;},json(body){result.body=body;return this;}};
    await handler(request||clone(baseRequest),res);return result;
  };
  return {run,requests};
}

test('a verified matching submission exposes a redacted summary and never asserts signing completion',async()=>{
  const app=setup(),result=await app.run();assert.equal(result.status,200);
  assert.equal(result.body.clientSignaturePresent,true);assert.equal(result.body.providerSignaturePresent,true);
  assert.equal(result.body.requiresStaffReview,true);assert.equal(result.body.signingStatus,'staff_review_required');
  assert.equal(result.headers['Cache-Control'],'private, no-store');
  const serialized=JSON.stringify(result.body);for(const secret of ['test-only-api-key','private-client-signature','private-provider-signature','client@example.test'])assert.ok(!serialized.includes(secret));
  assert.ok(app.requests.every(request=>!request.init.method||request.init.method==='GET'),'integration performs no upstream writes');
});

test('connection checks are admin-only and identify the form without leaking credentials',async()=>{
  const app=setup();const req=clone(baseRequest);req.body={action:'connection'};const result=await app.run(req);
  assert.deepEqual(result.body,{connected:true,formId,formType:'LEGACY',formEnabled:true,requiresStaffReview:true});
});

test('unauthenticated, non-admin, untrusted origins and forged tokens cannot query Jotform',async()=>{
  for(const [edit,status,options] of [
    [req=>req.method='GET',405,{}],
    [req=>delete req.headers.authorization,401,{}],
    [req=>req.headers.origin='https://attacker.example',403,{}],
    [req=>req.headers['content-type']='text/plain',415,{}],
    [()=>{},403,{role:'client'}],
    [()=>{},403,{rejectedToken:true}],
    [req=>req.headers.authorization='Bearer invalid-token',401,{}]
  ]){
    const app=setup(options),req=clone(baseRequest);edit(req);assert.equal((await app.run(req)).status,status);
    assert.ok(app.requests.every(request=>request.url.startsWith('https://firestore.googleapis.com/')));
  }
});

test('wrong client, deleted or foreign-form submissions and missing assignments are rejected',async()=>{
  const variants=[
    [{submission:{...submission,form_id:'111111111111111'}},409],
    [{submission:{...submission,status:'DELETED'}},409],
    [{email:'someone-else@example.test'},409],
    [{missingAgreement:true},404],
    [{signingUrl:'https://form.jotform.com/111111111111111'},409],
    [{signingUrl:'https://jotform.com.attacker.example/'+formId},409],
    [{submission:{...submission,id:'2222222222222222222'}},502]
  ];
  for(const [options,status] of variants)assert.equal((await setup(options).run()).status,status);
});

test('bad identifiers, traversal and oversized requests are rejected before calling Jotform',async()=>{
  for(const override of [{clientUid:'../admin'},{agreementId:'../other'},{submissionId:'https://attacker.example'},{action:'arbitrary'},{extra:'x'.repeat(2500)}]){
    const app=setup(),req=clone(baseRequest);Object.assign(req.body,override);assert.equal((await app.run(req)).status,400);
    assert.ok(app.requests.every(request=>request.url.startsWith('https://firestore.googleapis.com/')));
  }
});

test('API failures fail closed and never include raw diagnostics in client responses',async()=>{
  for(const options of [{env:{JOTFORM_API_KEY:''}},{vendorCode:401},{vendorCode:429},{networkError:true},{invalidJson:true}]){
    const result=await setup(options).run();assert.ok([502,503].includes(result.status));
    assert.ok(!JSON.stringify(result.body).includes('private vendor diagnostics'));
  }
});

test('optional or absent signature fields stay missing and do not become accepted signatures',()=>{
  const result=submissionSummary({...submission,answers:{9:submission.answers[9],64:{type:'control_signature',answer:''},68:{type:'control_textbox',answer:'not a signature'}}},{formId,clientEmail:'CLIENT@example.test'});
  assert.equal(result.clientSignaturePresent,false);assert.equal(result.providerSignaturePresent,false);assert.equal(result.requiresStaffReview,true);
});
