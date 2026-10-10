import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc,deleteDoc,serverTimestamp,Timestamp,collection,getDocs} from 'firebase/firestore';
import {TERMS_VERSION,ACCEPTANCE_STATEMENT,validateQuote,validateAcceptance,quoteState,agreementCopyHtml} from '../js/agreement-model.js';
const environment=await initializeTestEnvironment({projectId:'demo-bam-agreements',firestore:{host:'127.0.0.1',port:8088,rules:await fs.readFile('firestore.rules','utf8')}});
const quote={quoteNumber:'TEST-ONLY-1',clientName:'Test Client',clientEmail:'client@example.test',providerName:'TEST ONLY — not a contract',projectName:'Nonbinding emulator test',scope:'Test pages',amount:250,paymentSchedule:'50% before work, 50% before launch',delivery:'2–3 weeks',revisions:2,ongoingCosts:'None included; confirm separately',variations:'',language:'en',termsVersion:TERMS_VERSION,termsText:'TEST ONLY',state:'issued',issuedBy:'admin',issuedAt:serverTimestamp(),expiresAt:Timestamp.fromMillis(Date.now()+86400000)};
const database=id=>environment.authenticatedContext(id,{email:`${id}@example.test`,email_verified:true}).firestore();
const admin=database('admin'),client=database('client'),other=database('other'),anonymous=environment.unauthenticatedContext().firestore();
const ref=db=>doc(db,'users/client/agreements/q1');const receipt=db=>doc(db,'users/client/agreements/q1/acceptances/client');
const accept={quoteId:'q1',termsVersion:TERMS_VERSION,name:'Test Client',email:'client@example.test',clientUid:'client',statement:ACCEPTANCE_STATEMENT,acceptedAt:serverTimestamp()};
let checks=0;const pass=async promise=>{await assertSucceeds(promise);checks++;};const deny=async promise=>{await assertFails(promise);checks++;};
try{
  await environment.withSecurityRulesDisabled(async context=>{await setDoc(doc(context.firestore(),'users/admin'),{role:'admin'});await setDoc(doc(context.firestore(),'users/client'),{role:'client'});});
  validateQuote(quote);assert.throws(()=>validateQuote({...quote,amount:0}));assert.throws(()=>validateQuote({...quote,scope:''}));assert.throws(()=>validateQuote({...quote,termsText:''}));checks+=4;
  await deny(setDoc(ref(client),quote));await deny(setDoc(ref(anonymous),quote));await pass(setDoc(ref(admin),quote));
  await pass(getDoc(ref(client)));await deny(getDoc(ref(other)));await deny(getDoc(ref(anonymous)));await pass(getDocs(collection(client,'users/client/agreements')));await deny(getDocs(collection(other,'users/client/agreements')));
  await deny(updateDoc(ref(admin),{amount:500}));await deny(updateDoc(ref(client),{scope:'Tampered'}));await deny(deleteDoc(ref(admin)));
  await deny(setDoc(receipt(admin),{...accept,clientUid:'admin',email:'admin@example.test'}));await deny(setDoc(receipt(other),{...accept,clientUid:'other',email:'other@example.test'}));
  await deny(setDoc(receipt(client),{...accept,email:'forged@example.test'}));await deny(setDoc(receipt(client),{...accept,termsVersion:'wrong'}));await deny(setDoc(receipt(client),{...accept,acceptedAt:Timestamp.fromMillis(1)}));
  const unverified=environment.authenticatedContext('client',{email:'client@example.test',email_verified:false}).firestore();await deny(setDoc(receipt(unverified),accept));
  await pass(setDoc(receipt(client),accept));await pass(getDoc(receipt(admin)));await deny(updateDoc(receipt(client),{name:'Changed'}));await deny(deleteDoc(receipt(admin)));await deny(updateDoc(ref(admin),{state:'withdrawn',withdrawnAt:serverTimestamp()}));
  const withdrawn=doc(admin,'users/client/agreements/q2');await pass(setDoc(withdrawn,{...quote,quoteNumber:'TEST-ONLY-2'}));await pass(updateDoc(withdrawn,{state:'withdrawn',withdrawnAt:serverTimestamp()}));
  await deny(setDoc(doc(client,'users/client/agreements/q2/acceptances/client'),{...accept,quoteId:'q2'}));
  await environment.withSecurityRulesDisabled(async context=>{await setDoc(doc(context.firestore(),'users/client/agreements/expired'),{...quote,issuedAt:Timestamp.fromMillis(1),expiresAt:Timestamp.fromMillis(1)});});
  await deny(setDoc(doc(client,'users/client/agreements/expired/acceptances/client'),{...accept,quoteId:'expired'}));
  const saved=(await getDoc(ref(client))).data();const recorded=(await getDoc(receipt(client))).data();assert.equal(quoteState(saved,recorded),'accepted');assert.throws(()=>validateAcceptance(saved,recorded,'Test Client',true));assert.throws(()=>validateAcceptance(saved,null,'Test Client',false));assert.ok(agreementCopyHtml({...saved,id:'q1'},recorded).includes('TEST ONLY'));assert.ok(agreementCopyHtml({...saved,scope:'<script>bad()</script>'},recorded).includes('&lt;script&gt;'));checks+=5;
  console.log(`PASS: ${checks} agreement checks, including verified owner acceptance, cross-client isolation, immutable quotes/receipts, expiry, withdrawal, and retained copies. No production data was used.`);
}finally{await environment.cleanup();}

