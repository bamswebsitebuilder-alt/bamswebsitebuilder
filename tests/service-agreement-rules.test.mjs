import fs from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc,deleteDoc,deleteField,serverTimestamp,collection,getDocs,writeBatch,Bytes,Timestamp,runTransaction} from 'firebase/firestore';
import {SERVICE_VERSION,MAX_PDF_BYTES,JOTFORM_ASSIGNMENT_VERSION,JOTFORM_ASSIGNMENT_NOTICE} from '../js/service-agreement-model.js';
const environment=await initializeTestEnvironment({projectId:'demo-bam-service-agreements',firestore:{host:'127.0.0.1',port:8088,rules:await fs.readFile('firestore.rules','utf8')}});
const database=(id,verified=true)=>environment.authenticatedContext(id,{email_verified:verified}).firestore();
const admin=database('admin'),client=database('client'),other=database('other'),unverified=database('client',false),anonymous=environment.unauthenticatedContext().firestore();
const ref=(db,id='one')=>doc(db,'users/client/serviceAgreements/'+id);
const pdf=(db,id='one')=>doc(ref(db,id),'documents/signed');
const data={title:'TEST ONLY',clientName:'Test Client',projectPricing:{total:500,initial:250,remaining:250,recurring:null},termsVersion:SERVICE_VERSION,termsText:'Nonbinding emulator fixture',signingUrl:'https://www.jotform.com/sign/test',status:'assigned',evidence:'',createdBy:'admin',createdAt:serverTimestamp(),updatedBy:'admin',updatedAt:serverTimestamp()};
const content=Bytes.fromUint8Array(new TextEncoder().encode('%PDF-test-only'));
const pdfData={content,uploadedBy:'admin',uploadedAt:serverTimestamp()};
const change=status=>({status,evidence:'TEST reviewed signing record',updatedAt:serverTimestamp(),updatedBy:'admin'});
let checks=0;const pass=async operation=>{await assertSucceeds(operation);checks++;};const deny=async operation=>{await assertFails(operation);checks++;};
function complete(db,id='one',bytes=content){const batch=writeBatch(db);batch.set(pdf(db,id),{...pdfData,content:bytes});batch.update(ref(db,id),change('completed'));return batch.commit();}
try{
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async context=>{for(const [id,role] of [['admin','admin'],['client','client'],['other','client']])await setDoc(doc(context.firestore(),'users',id),{role});});
  await deny(setDoc(ref(client),data));await deny(setDoc(ref(anonymous),data));
  await deny(setDoc(ref(admin),{...data,arbitrary:'bad'}));await deny(setDoc(ref(admin),{...data,title:'x'.repeat(201)}));
  await deny(setDoc(ref(admin),{...data,termsText:'x'.repeat(60001)}));await deny(setDoc(ref(admin),{...data,status:'completed'}));
  await deny(setDoc(ref(admin),{...data,signingUrl:'https://jotform.com.evil.test/sign'}));
  await deny(setDoc(ref(admin),{...data,signingUrl:'javascript:alert(1)'}));
  await deny(setDoc(ref(admin),{...data,createdBy:'other'}));await deny(setDoc(ref(admin),{...data,createdAt:Timestamp.fromMillis(1)}));
  const missing={...data};delete missing.termsText;await deny(setDoc(ref(admin),missing));
  await deny(setDoc(doc(admin,'users/missing/serviceAgreements/one'),data));
  for(const pricing of [{total:-1,initial:0,remaining:0,recurring:null},{total:500,initial:501,remaining:0,recurring:null},{total:500,initial:250,remaining:249,recurring:null},{total:500,initial:250,remaining:250,recurring:-1},{total:'500',initial:250,remaining:250,recurring:null},{total:500,initial:250,remaining:250,recurring:null,extra:1}])await deny(setDoc(ref(admin),{...data,projectPricing:pricing}));
  const noPricing={...data};delete noPricing.projectPricing;await deny(setDoc(ref(admin),noPricing));
  await pass(setDoc(ref(admin,'recurring'),{...data,projectPricing:{...data.projectPricing,recurring:25}}));
  for(const [id,pricing] of [
    ['decimal',{total:100.10,initial:0.20,remaining:99.90,recurring:null}],
    ['small-decimal',{total:0.10,initial:0.03,remaining:0.07,recurring:0.01}],
    ['paid-in-full',{total:19.99,initial:19.99,remaining:0,recurring:null}],
    ['zero',{total:0,initial:0,remaining:0,recurring:null}]
  ])await pass(runTransaction(admin,async transaction=>{
    const reference=ref(admin,id);const existing=await transaction.get(reference);
    if(existing.exists())throw Error('Fixture collision');
    transaction.set(reference,{...data,projectPricing:pricing});
  }));
  for(const pricing of [
    {total:100.10,initial:0.20,remaining:99.89,recurring:null},
    {total:100.10,initial:0.20,remaining:99.91,recurring:null},
    {total:NaN,initial:0,remaining:0,recurring:null},
    {total:Infinity,initial:0,remaining:Infinity,recurring:null},
    {total:500,initial:250,remaining:250,recurring:Infinity},
    {total:90071992547410,initial:0,remaining:90071992547410,recurring:null},
    null
  ])await deny(setDoc(ref(admin,'bad-price'),{...data,projectPricing:pricing}));
  await environment.withSecurityRulesDisabled(async context=>{
    const legacy={...data};delete legacy.projectPricing;
    for(const id of ['legacy','legacy-complete'])await setDoc(ref(context.firestore(),id),legacy);
  });
  await pass(getDoc(ref(client,'legacy')));
  await deny(updateDoc(ref(client,'legacy'),change('cancelled')));
  await deny(updateDoc(ref(admin,'legacy'),{...change('cancelled'),termsText:'rewritten'}));
  await deny(updateDoc(ref(admin,'legacy'),{...change('cancelled'),projectPricing:data.projectPricing}));
  await pass(updateDoc(ref(admin,'legacy'),change('cancelled')));
  await pass(complete(admin,'legacy-complete'));
  await pass(getDoc(pdf(client,'legacy-complete')));
  await pass(setDoc(ref(admin),data));await pass(getDoc(ref(client)));await pass(getDoc(ref(admin)));
  await deny(updateDoc(ref(admin),{...change('client_signed'),projectPricing:deleteField()}));
  await deny(updateDoc(ref(admin),{...change('client_signed'),projectPricing:{total:1000,initial:250,remaining:750,recurring:null}}));
  await deny(getDoc(ref(other)));await deny(getDoc(ref(unverified)));await deny(getDoc(ref(anonymous)));
  await pass(getDocs(collection(client,'users/client/serviceAgreements')));await deny(getDocs(collection(other,'users/client/serviceAgreements')));await deny(getDocs(collection(anonymous,'users/client/serviceAgreements')));
  await deny(updateDoc(ref(client),change('client_signed')));await deny(updateDoc(ref(admin),{...change('client_signed'),termsText:'replaced'}));
  await deny(updateDoc(ref(admin),{...change('client_signed'),createdBy:'other'}));await deny(updateDoc(ref(admin),{...change('client_signed'),evidence:''}));
  await deny(updateDoc(ref(admin),{...change('client_signed'),evidence:'x'.repeat(501)}));await deny(updateDoc(ref(admin),{...change('client_signed'),updatedAt:Timestamp.fromMillis(1)}));
  await deny(updateDoc(ref(admin),change('completed')));await deny(setDoc(pdf(admin),pdfData));await deny(complete(client));
  await deny(complete(admin,'one',Bytes.fromUint8Array(new Uint8Array(MAX_PDF_BYTES+1))));
  await pass(updateDoc(ref(admin),change('client_signed')));await deny(updateDoc(ref(admin),change('assigned')));
  await pass(complete(admin));await pass(getDoc(pdf(client)));await pass(getDoc(pdf(admin)));
  await deny(getDoc(pdf(other)));await deny(getDoc(pdf(unverified)));await deny(getDoc(pdf(anonymous)));
  await deny(updateDoc(pdf(admin),{content}));await deny(deleteDoc(pdf(admin)));await deny(deleteDoc(ref(admin)));
  await deny(updateDoc(ref(admin),change('cancelled')));await deny(updateDoc(ref(admin),{termsText:'tamper'}));
  await pass(setDoc(ref(admin,'cancel'),data));await pass(updateDoc(ref(admin,'cancel'),change('cancelled')));await deny(complete(admin,'cancel'));
  await deny(setDoc(doc(admin,'users/client/serviceAgreements/orphan/documents/signed'),pdfData));
  await deny(updateDoc(doc(client,'users/client'),{role:'admin'}));
  await deny(setDoc(doc(database('attacker'),'users/attacker'),{role:'admin'}));
  const formData={...data,assignmentType:'jotform',projectPricing:null,termsVersion:JOTFORM_ASSIGNMENT_VERSION,termsText:JOTFORM_ASSIGNMENT_NOTICE};
  await pass(runTransaction(admin,async transaction=>{const reference=ref(admin,'form-only');await transaction.get(reference);transaction.set(reference,formData);}));
  await pass(getDoc(ref(client,'form-only')));
  await deny(getDoc(ref(other,'form-only')));await deny(getDoc(ref(unverified,'form-only')));
  await deny(setDoc(ref(client,'form-client'),formData));await deny(setDoc(ref(anonymous,'form-anonymous'),formData));
  for(const invalid of [{...formData,assignmentType:'arbitrary'},{...formData,signingUrl:''},{...formData,termsVersion:SERVICE_VERSION},{...formData,termsText:'pretend agreement'},{...formData,projectPricing:data.projectPricing},{...formData,unexpected:'extra'}])await deny(setDoc(ref(admin,'invalid-form'),invalid));
  await deny(updateDoc(ref(admin,'form-only'),{...change('client_signed'),signingUrl:'https://www.jotform.com/sign/replaced'}));
  await deny(updateDoc(ref(admin,'form-only'),{...change('client_signed'),assignmentType:deleteField()}));
  await deny(updateDoc(ref(admin,'form-only'),{...change('client_signed'),termsText:'replaced'}));
  await deny(updateDoc(ref(admin,'form-only'),change('completed')));
  await pass(updateDoc(ref(admin,'form-only'),change('client_signed')));
  await pass(complete(admin,'form-only'));await pass(getDoc(pdf(client,'form-only')));
  console.log(`PASS: ${checks} service agreement security checks. No production records used.`);
}finally{await environment.cleanup();}
