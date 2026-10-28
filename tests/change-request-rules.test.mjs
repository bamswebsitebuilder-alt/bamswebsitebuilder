import fs from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc,deleteDoc,serverTimestamp,Timestamp,collection,query,orderBy,limit,getDocs} from 'firebase/firestore';
const env=await initializeTestEnvironment({projectId:'demo-bam-requests',firestore:{host:'127.0.0.1',port:8088,rules:await fs.readFile('firestore.rules','utf8')}});
const db=id=>env.authenticatedContext(id,{email_verified:true,email:id+'@example.test'}).firestore();
const client=db('client'),admin=db('admin'),other=db('other'),anon=env.unauthenticatedContext().firestore();
const request={clientUid:'client',title:'Update contact button',pageUrl:'https://example.test/contact',description:'Please update the contact button text.',screenshotPath:'',status:'submitted',scope:'unreviewed',adminNote:'',createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
const ref=(database,id='r1',uid='client')=>doc(database,'users',uid,'changeRequests',id);
let checks=0;const yes=async p=>{await assertSucceeds(p);checks++;};const no=async p=>{await assertFails(p);checks++;};
try{
 await env.withSecurityRulesDisabled(async context=>{for(const [id,role] of [['client','client'],['admin','admin'],['other','client']])await setDoc(doc(context.firestore(),'users',id),{role});});
 await yes(setDoc(ref(client),request));await yes(getDoc(ref(client)));await yes(getDoc(ref(admin)));await no(getDoc(ref(other)));await no(getDoc(ref(anon)));
 await yes(getDocs(query(collection(client,'users/client/changeRequests'),orderBy('createdAt','desc'),limit(100))));await yes(getDocs(query(collection(admin,'users/client/changeRequests'),orderBy('createdAt','desc'),limit(100))));await no(getDocs(collection(other,'users/client/changeRequests')));await no(getDocs(collection(anon,'users/client/changeRequests')));
 for(const database of [other,anon,db('orphan'),env.authenticatedContext('client',{email_verified:false}).firestore()])await no(setDoc(ref(database,'forged'),request));
 for(const [key,value] of Object.entries({clientUid:'other',status:'completed',scope:'included',adminNote:'Forged admin',createdAt:Timestamp.fromMillis(1),updatedAt:Timestamp.fromMillis(1),title:'xx',description:'short',pageUrl:'javascript:alert(1)',screenshotPath:'users/other/uploads/change-request_123.png',extraData:'unknown'}))await no(setDoc(ref(client,'bad-'+key),{...request,[key]:value}));
 for(const field of ['clientUid','title','description','pageUrl','screenshotPath','status','scope','adminNote','createdAt','updatedAt']){const value={...request};delete value[field];await no(setDoc(ref(client,'missing-'+field),value));}
 for(const [key,max] of [['title',150],['description',4000],['pageUrl',2048],['screenshotPath',512],['adminNote',2000]])await no(setDoc(ref(client,'oversize-'+key),{...request,[key]:'x'.repeat(max+1)}));
 await no(setDoc(ref(client,'bad-type'),{...request,title:42}));await no(setDoc(ref(client,'bad-url'),{...request,pageUrl:'https://name:password@example.test/'}));
 await yes(setDoc(ref(client,'image'),{...request,screenshotPath:'users/client/uploads/change-request_ABC123.png'}));await no(setDoc(ref(client,'svg'),{...request,screenshotPath:'users/client/uploads/change-request_ABC123.svg'}));
 for(const patch of [{status:'in-progress'},{scope:'included'},{title:'Changed title'},{clientUid:'other'},{adminNote:'Forged note'},{createdAt:serverTimestamp()}])await no(updateDoc(ref(client),{...patch,updatedAt:serverTimestamp()}));
 await no(updateDoc(ref(admin),{status:'completed',scope:'included',updatedAt:serverTimestamp()}));
 await yes(updateDoc(ref(admin),{status:'in-review',scope:'included',adminNote:'Included revision',updatedAt:serverTimestamp()}));
 await no(updateDoc(ref(admin),{description:'Changed original request',updatedAt:serverTimestamp()}));await no(updateDoc(ref(admin),{adminNote:'x'.repeat(2001),updatedAt:serverTimestamp()}));await no(updateDoc(ref(admin),{extraData:true,updatedAt:serverTimestamp()}));await no(updateDoc(ref(admin),{updatedAt:Timestamp.fromMillis(1)}));
 await no(updateDoc(ref(other),{status:'cancelled',updatedAt:serverTimestamp()}));
 await yes(updateDoc(ref(client),{status:'cancelled',updatedAt:serverTimestamp()}));await no(updateDoc(ref(admin),{status:'in-review',updatedAt:serverTimestamp()}));
 await yes(setDoc(ref(client,'finish'),request));await yes(updateDoc(ref(admin,'finish'),{status:'in-review',updatedAt:serverTimestamp()}));await no(updateDoc(ref(admin,'finish'),{status:'in-progress',updatedAt:serverTimestamp()}));await yes(updateDoc(ref(admin,'finish'),{status:'in-progress',scope:'included',updatedAt:serverTimestamp()}));await no(updateDoc(ref(client,'finish'),{status:'cancelled',updatedAt:serverTimestamp()}));await yes(updateDoc(ref(admin,'finish'),{status:'completed',updatedAt:serverTimestamp()}));
 await no(deleteDoc(ref(client)));await no(deleteDoc(ref(admin)));
 await env.withSecurityRulesDisabled(context=>setDoc(ref(context.firestore(),'orphan','missing-parent'),{...request,clientUid:'missing-parent'}));await no(getDoc(ref(admin,'orphan','missing-parent')));
 console.log(`PASS: ${checks} change-request permission, query, schema, size, ownership, timestamp, transition, and orphan checks. Emulator only.`);
}finally{await env.cleanup();}
