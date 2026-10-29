// Run with the Firestore emulator. No production writes are made.
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc} from 'firebase/firestore';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hostingValues,hostingAgreementId} from '../js/hosting-model.js';
const env=await initializeTestEnvironment({projectId:'demo-bam-hosting',firestore:{host:'127.0.0.1',port:8088,rules:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')}});
let count=0;const pass=()=>count++;
const client=env.authenticatedContext('hosting-client',{email_verified:true}).firestore();
const other=env.authenticatedContext('other-client',{email_verified:true}).firestore();
const admin=env.authenticatedContext('hosting-admin',{email_verified:true}).firestore();
const anon=env.unauthenticatedContext().firestore();
const ref=db=>doc(db,'users','hosting-client','projects','current');
const values={...hostingValues(),plan:'Managed hosting',provider:'Test provider',siteUrl:'https://example.test',fee:'25',domainName:'client.example',domainRegistrar:'Example registrar',domainRenewal:'2027-10-28',domainManageUrl:'https://registrar.example/account'};
async function loadStore(db){
  globalThis.__hostingTestDb=db;
  let source=await readFile(new URL('../js/hosting-store.js',import.meta.url),'utf8');
  source=source.replace("import {db} from './firebase-config.js';",'const db=globalThis.__hostingTestDb;')
    .replace('https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js',import.meta.resolve('firebase/firestore'))
    .replace('./hosting-model.js?v=3',new URL('../js/hosting-model.js',import.meta.url).href);
  return (await import('data:text/javascript;base64,'+Buffer.from(source+'\n// '+Math.random()).toString('base64'))).hostingStore;
}
try{
  await env.withSecurityRulesDisabled(async context=>{
    const db=context.firestore();for(const [uid,role] of [['hosting-client','client'],['other-client','client'],['hosting-admin','admin']])await setDoc(doc(db,'users',uid),{role});
    await setDoc(ref(db),{title:'Existing site',workflow:{preserved:true}});
  });
  const store=await loadStore(admin);
  assert.equal(await store.save('hosting-client',values,0,'hosting-admin'),1);pass();
  const saved=(await assertSucceeds(getDoc(ref(client)))).data();assert.equal(saved.hosting.feeCents,2500);assert.equal(saved.hosting.domainName,'client.example');assert.equal(saved.hosting.domainRenewal,'2027-10-28');assert.equal(saved.hosting.domainManageUrl,'https://registrar.example/account');assert.equal(saved.title,'Existing site');assert.equal(saved.workflow.preserved,true);assert.ok(saved.hosting.updatedAt.toMillis());pass();
  await assertFails(getDoc(ref(other)));pass();await assertFails(getDoc(ref(anon)));pass();
  await assertFails(updateDoc(ref(client),{hosting:{status:'active'}}));pass();
  await assertFails(updateDoc(ref(other),{hosting:{status:'active'}}));pass();
  const clientStore=await loadStore(client);await assert.rejects(clientStore.save('hosting-client',values,1,'hosting-client'));pass();
  await assert.rejects(store.save('hosting-client',{...values,plan:'Stale edit'},0,'hosting-admin'),/conflict/);pass();
  assert.equal((await getDoc(ref(admin))).data().hosting.plan,'Managed hosting');pass();
  await assert.rejects(store.save('other-client',values,0,'hosting-admin'),/no-project/);pass();
  const paypal={...values,billingMode:'paypal',paypalPlanId:'P-ABCDE12345',agreementNumber:'1001',billingStatus:'awaiting-approval'};
  await assert.rejects(store.save('hosting-client',paypal,1,'hosting-admin'),/not-accepted/);pass();
  const quoteId=await hostingAgreementId('1001');
  await env.withSecurityRulesDisabled(async context=>{
    const db=context.firestore();await setDoc(doc(db,'users','hosting-client','agreements',quoteId),{state:'issued'});
    await setDoc(doc(db,'users','hosting-client','agreements',quoteId,'acceptances','client'),{clientUid:'other-client'});
  });
  await assert.rejects(store.save('hosting-client',paypal,1,'hosting-admin'),/not-accepted/);pass();
  await env.withSecurityRulesDisabled(async context=>{await setDoc(doc(context.firestore(),'users','hosting-client','agreements',quoteId,'acceptances','client'),{clientUid:'hosting-client'});});
  assert.equal(await store.save('hosting-client',paypal,1,'hosting-admin'),2);pass();
  assert.equal((await getDoc(ref(admin))).data().hosting.agreementId,quoteId);pass();
  await assert.rejects(store.save('hosting-client',{...paypal,fee:'-25'},2,'hosting-admin'));pass();
  await env.withSecurityRulesDisabled(async context=>{await updateDoc(doc(context.firestore(),'users','hosting-client','agreements',quoteId),{state:'withdrawn'});});
  await assert.rejects(store.save('hosting-client',paypal,2,'hosting-admin'),/not-accepted/);pass();
  assert.equal((await getDoc(ref(admin))).data().hosting.revision,2);pass();
  console.log(`${count} hosting store and access checks passed`);
}finally{await env.cleanup();}
