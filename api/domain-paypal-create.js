// Development-only create step: no PayPal call unless a trusted server quote
// was saved in Firestore with an independently verified registrar cost.
import {FieldValue} from 'firebase-admin/firestore';
import {verifyDomainCustomer,domainOrderDatabase} from '../lib/domain-firebase.js';
import {isServerVerifiedQuote,STATES} from '../lib/domain-order-guards.js';
import {createSandboxOrder} from '../lib/domain-paypal-orders.js';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'POST required'});}
  if(process.env.VERCEL_ENV==='production'||process.env.PAYPAL_ENV!=='sandbox'||
      process.env.DOMAIN_ENABLE_SANDBOX_PAYMENTS!=='true')
    return res.status(503).json({error:'Domain payments are not enabled.'});
  const id=String(req.body?.quoteId||'');
  if(!/^[-_A-Za-z0-9]{8,64}$/.test(id))return res.status(400).json({error:'Invalid quote'});
  try {
    const uid=await verifyDomainCustomer(req),db=domainOrderDatabase();
    const ref=db.collection('domainOrders').doc(id);
    let quote;
    await db.runTransaction(async tx=>{
      const snap=await tx.get(ref);
      if(!snap.exists)throw Error('Quote not found');
      quote=snap.data();
      if(quote.uid!==uid||quote.state!==STATES.QUOTED||!isServerVerifiedQuote({id,...quote}))
        throw Error('Quote must be reverified');
      tx.update(ref,{state:'paypal_creating',updatedAt:FieldValue.serverTimestamp()});
    });
    // A timeout is ambiguous: the deterministic PayPal request ID prevents
    // duplicate create requests, and orders are moved to manual review.
    try {
      const order=await createSandboxOrder({id,amountCents:quote.amountCents});
      if(!/^[A-Z0-9]{8,32}$/.test(order.id||''))throw Error('Unrecognized PayPal response');
      await db.runTransaction(async tx=>{
        const snap=await tx.get(ref);
        if(!snap.exists||snap.data().state!=='paypal_creating')throw Error('Order state mismatch');
        tx.update(ref,{state:STATES.PAYPAL_CREATED,paypalOrderId:order.id,
          updatedAt:FieldValue.serverTimestamp()});
      });
      return res.status(201).json({orderId:order.id,quoteId:id,sandbox:true});
    }catch{
      await ref.update({state:STATES.REVIEW,updatedAt:FieldValue.serverTimestamp()}).catch(()=>{});
      return res.status(503).json({error:'PayPal order could not be confirmed. Contact support before retrying.'});
    }
  }catch(e){
    if(e.code?.startsWith('auth/')||/identity token/.test(e.message||''))
      return res.status(401).json({error:'Please sign in again.'});
    return res.status(409).json({error:'Verified quote unavailable or has expired.'});
  }
}
