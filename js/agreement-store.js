import {doc,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';
import {ACCEPTANCE_STATEMENT,validateAcceptance} from './agreement-model.js?v=1';

export async function acceptAgreement(db,user,quoteId,name,checked) {
  if(!user?.uid || !user.emailVerified)throw new Error('Please sign in with your verified account.');
  const quote=doc(db,'users',user.uid,'agreements',quoteId);
  const receipt=doc(quote,'acceptances','client');
  await runTransaction(db,async transaction=>{
    const fresh=await transaction.get(quote);const existing=await transaction.get(receipt);
    if(!fresh.exists())throw new Error('Quote not found.');
    validateAcceptance(fresh.data(),existing.exists()?existing.data():null,name,checked);
    transaction.set(receipt,{quoteId,termsVersion:fresh.data().termsVersion,name:name.trim(),email:user.email,clientUid:user.uid,statement:ACCEPTANCE_STATEMENT,acceptedAt:serverTimestamp()});
  });
}
