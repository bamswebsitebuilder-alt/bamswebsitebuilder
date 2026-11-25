import {auth,db} from './firebase-config.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import {doc,getDoc} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';
import {hostingStore} from './hosting-store.js?v=3';
import {renderHosting} from './hosting-view.js?v=3';
const host=document.getElementById('client-hosting');
const es=document.documentElement.lang.startsWith('es');
let generation=0,stop=()=>{},stopReceipt=()=>{};

async function sandboxRequest(user,method='GET'){
 const res=await fetch('/api/paypal-subscription',{method,headers:{Authorization:'Bearer '+await user.getIdToken()},cache:'no-store'});
 const data=await res.json().catch(()=>({}));
 if(!res.ok){if(method==='GET')return null;throw Error(data.error||'Sandbox checkout unavailable');}
 return data;
}
function sandboxPanel(user,state,record,accepted){
 if(!state)return;
 for(const a of host.querySelectorAll('a[href]')){if(['paypal.com','www.paypal.com'].includes(new URL(a.href).hostname))a.remove();}
 const panel=document.createElement('section');panel.className='hosting-payment';
 const title=document.createElement('h3');title.textContent='PayPal Sandbox — no real charges';panel.append(title);
 const status=document.createElement('p');status.textContent='Test subscription: '+state.status;panel.append(status);
 if(state.lastPaymentAmount!=null){const p=document.createElement('p');p.textContent='Last test payment: '+state.lastPaymentAmount+' '+(state.lastPaymentCurrency||'');panel.append(p);}
 const refresh=document.createElement('button');refresh.type='button';refresh.className='hosting-button';refresh.textContent='Refresh test status';refresh.onclick=()=>location.reload();panel.append(refresh);
 if(accepted&&record?.paypalPlanId&&['NOT_STARTED','APPROVAL_PENDING'].includes(state.status)){
 const button=document.createElement('button');button.type='button';button.className='hosting-button';button.textContent='Pay with PayPal Sandbox';button.onclick=async()=>{button.disabled=true;try{const result=await sandboxRequest(user,'POST');if(result.approvalUrl){const u=new URL(result.approvalUrl);if(u.protocol!=='https:'||!['www.sandbox.paypal.com','sandbox.paypal.com'].includes(u.hostname)||u.username||u.password)throw Error('Invalid Sandbox checkout URL');location.assign(u.href);}else status.textContent='Test subscription: '+result.status;}catch(e){status.textContent=e.message;}finally{button.disabled=false;}};panel.append(button);
 }else if(state.status==='NOT_STARTED')status.textContent+=' — requires an accepted agreement and Sandbox plan.';
 host.prepend(panel);
}

onAuthStateChanged(auth,async user=>{
  const current=++generation;stop();stopReceipt();host?.replaceChildren();
  if(!host||!user?.emailVerified)return;
  const fail=()=>{host.textContent=es?'No se pudo cargar el alojamiento. Recarga la página o contacta a BAM.':'Hosting details could not be loaded. Refresh the page or contact BAM.';};
  try{
    const profile=await getDoc(doc(db,'users',user.uid));
    if(current!==generation)return;
    if(profile.data()?.role!=='client'){fail();return;}
    const state=await sandboxRequest(user).catch(()=>null);
    if(current!==generation)return;
    const draw=(record,accepted=false)=>{renderHosting(host,record,{es,accepted});sandboxPanel(user,state,record,accepted);};
    stop=hostingStore.watch(user.uid,record=>{
      stopReceipt();draw(record);
      if(record?.agreementId&&record?.paypalPlanId)stopReceipt=hostingStore.watchAcceptance(user.uid,record.agreementId,accepted=>draw(record,accepted),()=>draw(record));
    },fail);
  }catch{if(current===generation)fail();}
});
window.addEventListener('beforeunload',()=>{generation++;stop();stopReceipt();});
