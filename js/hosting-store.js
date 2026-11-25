import {db} from './firebase-config.js';
import {doc,onSnapshot,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';
import {hostingInput,hostingAgreementId,hasAgreedHostingTerms} from './hosting-model.js?v=4';

// Uses the existing admin-written project document; clients retain read-only access.
export const hostingStore={
  watch(uid,next,error){return onSnapshot(doc(db,'users',uid,'projects','current'),snapshot=>next(snapshot.data()?.hosting||null),error);},
  watchAcceptance(uid,id,next,error){return onSnapshot(doc(db,'users',uid,'agreements',id,'acceptances','client'),snapshot=>next(snapshot.exists()&&snapshot.data().clientUid===uid),error);},
  async save(uid,values,revision,adminUid){
    const input=hostingInput(values);
    input.agreementId=await hostingAgreementId(input.agreementNumber);
    await runTransaction(db,async transaction=>{
      const target=doc(db,'users',uid,'projects','current');
      const project=await transaction.get(target);
      if(!project.exists())throw Error('no-project');
      if((project.data().hosting?.revision||0)!==revision)throw Error('conflict');
      if(project.data().hosting?.billingMode==='paypal-automated'&&input.billingMode!=='paypal-automated')throw Error('billing-arrangement');
      if(input.paypalPlanId){
        const quote=await transaction.get(doc(db,'users',uid,'agreements',input.agreementId));
        const receipt=await transaction.get(doc(db,'users',uid,'agreements',input.agreementId,'acceptances','client'));
        if(!quote.exists()||quote.data().state!=='issued'||!receipt.exists()||receipt.data().clientUid!==uid)throw Error('not-accepted');
        if(input.billingMode==='paypal-automated'&&!hasAgreedHostingTerms(quote.data(),input.feeCents,input.cadence))throw Error('hosting-terms');
      }
      transaction.update(target,{hosting:{...input,revision:revision+1,updatedAt:serverTimestamp(),updatedBy:adminUid},updatedAt:serverTimestamp()});
    });
    return revision+1;
  }
};
