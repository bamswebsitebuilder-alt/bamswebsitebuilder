// Sandbox-only server capture endpoint. Captures are never executed from
// browser-supplied amounts, and duplicate payment attempts fail closed.
import {FieldValue} from 'firebase-admin/firestore';
import {verifyDomainCustomer,domainOrderDatabase} from '../lib/domain-firebase.js';
import {STATES} from '../lib/domain-order-guards.js';
import {captureSandboxOrder} from '../lib/domain-paypal-orders.js';
import {recordVerifiedPaypalCapture} from '../lib/domain-fulfillment.js';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'POST required'});}
  if(process.env.VERCEL_ENV==='production'||process.env.PAYPAL_ENV!=='sandbox'||
     process.env.DOMAIN_ENABLE_SANDBOX_PAYMENTS!=='true')
    return res.status(503).json({error:'Domain payments are not enabled.'});
  const quoteId=String(req.body?.quoteId||'');
  if(!/^[-_A-Za-z0-9]{8,64}$/.test(quoteId))
    return res.status(400).json({error:'Invalid order reference'});
  try{
    const uid=await verifyDomainCustomer(req),db=domainOrderDatabase();
    const ref=db.collection('domainOrders').doc(quoteId);
    let quote;
    await db.runTransaction(async tx=>{
      const snap=await tx.get(ref);
      if(!snap.exists)throw Error('Order not found');
      quote=snap.data();
      if(quote.uid!==uid||quote.state!==STATES.PAYPAL_CREATED||
         !/^[A-Z0-9]{8,32}$/.test(quote.paypalOrderId||'')||
         !Number.isSafeInteger(quote.amountCents)||quote.amountCents<=0||
         quote.currency!=='USD'||!quote.registrarVerified||quote.registrantConsent!==true||
         quote.premium!==false||!quote.expiresAt||quote.expiresAt<=Date.now())
        throw Error('Order needs review');
      tx.update(ref,{state:STATES.CAPTURE_PENDING,updatedAt:FieldValue.serverTimestamp()});
    });
    try{
      const capture=await captureSandboxOrder(quote.paypalOrderId,quoteId);
      await recordVerifiedPaypalCapture({
        orderId:quoteId,quote:{id:quoteId,domain:quote.domain,amountCents:quote.amountCents},
        captureResult:capture,paypalOrderId:quote.paypalOrderId
      });
      return res.status(200).json({status:STATES.PAID,registration:'pending_server_fulfillment'});
    }catch{
      await ref.update({state:STATES.REVIEW,updatedAt:FieldValue.serverTimestamp()}).catch(()=>{});
      return res.status(503).json({error:'Payment result requires reconciliation. Do not retry or pay again.'});
    }
  }catch(e){
    if(e.code?.startsWith('auth/')||/identity token/.test(e.message||''))
      return res.status(401).json({error:'Please sign in again.'});
    return res.status(409).json({error:'This order cannot be captured yet.'});
  }
}
