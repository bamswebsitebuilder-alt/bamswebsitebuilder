import {auth,db} from './firebase-config.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import {doc,getDoc} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';
import {hostingStore} from './hosting-store.js?v=4';
import {renderHosting} from './hosting-view.js?v=4';
import {createSiteEditor} from './site-editor-ui.js';
import {showSubscription} from './hosting-subscriptions.js';
const host=document.getElementById('client-hosting');
const editorHost=document.createElement('article');
editorHost.className='portal-card bam-portal-tool';
document.getElementById('project')?.append(editorHost);
const subscriptionHost=document.createElement('section');
subscriptionHost.className='bam-portal-tool bam-billing';
subscriptionHost.hidden=true;
host?.after(subscriptionHost);
let currentUser=null, billingGeneration=0;
const editor=createSiteEditor(editorHost,()=>currentUser);
editorHost.hidden=true;
const es=document.documentElement.lang.startsWith('es');
let generation=0,stop=()=>{},stopReceipt=()=>{};
onAuthStateChanged(auth,async user=>{
  const current=++generation;stop();stopReceipt();host?.replaceChildren();
  currentUser=null;editor?.reset();editorHost.hidden=true;subscriptionHost.hidden=true;subscriptionHost.replaceChildren();billingGeneration++;
  if(!host||!user?.emailVerified)return;
  const fail=()=>{host.textContent=es?'No se pudo cargar el alojamiento. Recarga la página o contacta a BAM.':'Hosting details could not be loaded. Refresh the page or contact BAM.';};
  try{
    const profile=await getDoc(doc(db,'users',user.uid));
    if(current!==generation)return;
    if(profile.data()?.role!=='client'){fail();return;}
    currentUser=user;editorHost.hidden=false;editor?.load();
    stop=hostingStore.watch(user.uid,record=>{
      stopReceipt();
      const render=accepted=>{
        if(current!==generation)return;
        const billing=++billingGeneration;
        renderHosting(host,record,{es,accepted});
        subscriptionHost.hidden=record?.billingMode!=='paypal-automated';
        if(subscriptionHost.hidden)subscriptionHost.replaceChildren();
        else showSubscription(subscriptionHost,user,{accepted,enrollment:true,stillCurrent:()=>current===generation&&billing===billingGeneration});
      };
      render(false);
      if(record?.agreementId&&record?.paypalPlanId)stopReceipt=hostingStore.watchAcceptance(user.uid,record.agreementId,render,()=>render(false));
    },fail);
  }catch{if(current===generation)fail();}
});
window.addEventListener('beforeunload',()=>{generation++;stop();stopReceipt();});
