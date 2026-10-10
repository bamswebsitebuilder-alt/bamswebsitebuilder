import {auth,db} from './firebase-config.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import {collection,doc,onSnapshot} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';
import {downloadAgreement} from './agreement-model.js?v=1';
import {acceptAgreement} from './agreement-store.js?v=1';
import {renderAgreement} from './agreement-view.js?v=1';

const host=document.getElementById('client-agreements');
const es=document.documentElement.lang.startsWith('es');
let stop=()=>{};
onAuthStateChanged(auth,user=>{
  stop();
  if(!host || !user?.emailVerified) return;
  const receiptStops=[];
  const unwatch=onSnapshot(collection(db,'users',user.uid,'agreements'),snapshot=>{
    receiptStops.splice(0).forEach(fn=>fn());host.replaceChildren();
    if(snapshot.empty){host.textContent=es?'Tu cotización aparecerá aquí cuando BAM la emita. Acepta el acuerdo antes de pagar.':'Your quote will appear here when BAM issues it. Accept the agreement before paying.';return;}
    snapshot.docs.sort((a,b)=>(b.data().issuedAt?.seconds||0)-(a.data().issuedAt?.seconds||0)).forEach(item=>{
      const quote={id:item.id,...item.data()};const section=document.createElement('article');section.className='agreement-card';host.append(section);
      const reference=doc(db,'users',user.uid,'agreements',item.id);
      const receipt=doc(reference,'acceptances','client');
      receiptStops.push(onSnapshot(receipt,accepted=>{
        const acceptance=accepted.exists()?accepted.data():null;
        renderAgreement(section,quote,acceptance,{
          es,download:()=>downloadAgreement(quote,acceptance),
          accept:async(name,checked)=>{
            if(auth.currentUser?.uid!==user.uid)throw new Error(es?'Vuelve a iniciar sesión.':'Please sign in again.');
            await acceptAgreement(db,user,item.id,name,checked);
          }
        });
      },()=>{section.textContent=es?'No se pudo cargar la aceptación. Recarga la página o contacta a BAM.':'Acceptance could not be loaded. Refresh or contact BAM.';}));
    });
  },()=>{host.textContent=es?'No se pudieron cargar los acuerdos. Recarga la página o contacta a BAM.':'Agreements could not be loaded. Refresh or contact BAM.';});
  stop=()=>{unwatch();receiptStops.splice(0).forEach(fn=>fn());};
});
