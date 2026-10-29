import {auth,db} from './firebase-config.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import {doc,getDoc} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';
import {hostingStore} from './hosting-store.js?v=3';
import {renderHosting} from './hosting-view.js?v=3';
const host=document.getElementById('client-hosting');
const es=document.documentElement.lang.startsWith('es');
let generation=0,stop=()=>{},stopReceipt=()=>{};
onAuthStateChanged(auth,async user=>{
  const current=++generation;stop();stopReceipt();host?.replaceChildren();
  if(!host||!user?.emailVerified)return;
  const fail=()=>{host.textContent=es?'No se pudo cargar el alojamiento. Recarga la página o contacta a BAM.':'Hosting details could not be loaded. Refresh the page or contact BAM.';};
  try{
    const profile=await getDoc(doc(db,'users',user.uid));
    if(current!==generation)return;
    if(profile.data()?.role!=='client'){fail();return;}
    stop=hostingStore.watch(user.uid,record=>{
      stopReceipt();renderHosting(host,record,{es});
      if(record?.agreementId&&record?.paypalPlanId)stopReceipt=hostingStore.watchAcceptance(user.uid,record.agreementId,accepted=>renderHosting(host,record,{es,accepted}),()=>renderHosting(host,record,{es}));
    },fail);
  }catch{if(current===generation)fail();}
});
window.addEventListener('beforeunload',()=>{generation++;stop();stopReceipt();});
