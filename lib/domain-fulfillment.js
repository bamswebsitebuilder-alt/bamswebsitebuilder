// Firebase transactional registrar fulfillment gate, server-only.
// Never execute registrar writes from a browser request or payment return URL.
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { canSubmitRegistration, STATES } from './domain-order-guards.js';
import { verifyCompletedCapture } from './domain-paypal-orders.js';
import { verifyDomainCustomer } from './domain-firebase.js';

export async function recordVerifiedPaypalCapture({orderId,quote,captureResult,paypalOrderId}) {
  if(process.env.PAYPAL_ENV!=='sandbox'||process.env.DOMAIN_ENABLE_SANDBOX_PAYMENTS!=='true')
    throw Error('Sandbox payment reconciliation disabled');
  if(!verifyCompletedCapture(captureResult,quote))throw Error('Capture does not match quote');
  if(typeof orderId!=='string'||orderId!==quote.id)throw Error('Quote/order mismatch');
  const captureId=captureResult.purchase_units[0].payments.captures[0].id;
  const ref=getFirestore().collection('domainOrders').doc(orderId);
  await getFirestore().runTransaction(async tx=>{
    const snap=await tx.get(ref);
    if(!snap.exists)throw Error('Missing order');
    const order=snap.data();
    if(order.state===STATES.PAID&&order.paypalCaptureId===captureId)return;
    if(order.state!==STATES.CAPTURE_PENDING||order.paypalOrderId!==paypalOrderId||
       order.amountCents!==quote.amountCents||order.currency!=='USD'||order.domain!==quote.domain)
      throw Error('Order state mismatch — manual review required');
    tx.update(ref,{state:STATES.PAID,paymentVerified:true,paypalCaptureId:captureId,
      updatedAt:FieldValue.serverTimestamp()});
  });
  return {captureId,state:STATES.PAID};
}
export async function acquireRegistrationAttempt({orderId}){
  if(process.env.DOMAIN_ENABLE_SANDBOX_REGISTRATION!=='true')throw Error('Registration disabled');
  const attemptId=randomUUID();
  const ref=getFirestore().collection('domainOrders').doc(orderId);
  await getFirestore().runTransaction(async tx=>{
    const snap=await tx.get(ref);
    if(!snap.exists||!canSubmitRegistration(snap.data()))
      throw Error('Order not eligible or was already submitted');
    tx.update(ref,{state:STATES.REGISTERING,registrationAttemptId:attemptId,
      registrationAttemptAt:FieldValue.serverTimestamp(),
      updatedAt:FieldValue.serverTimestamp()});
  });
  return attemptId;
}
export async function recordRegistrarOutcome({orderId,attemptId,registrarOrderId,status}){
  // Do not automatically retry a failed or ambiguous registrar API response.
  if(!/^[a-f0-9-]{36}$/.test(attemptId))throw Error('Invalid attempt');
  if(!['registered','manual_review'].includes(status))throw Error('Unknown registration result');
  const ref=getFirestore().collection('domainOrders').doc(orderId);
  await getFirestore().runTransaction(async tx=>{
    const snap=await tx.get(ref);
    if(!snap.exists||snap.data().registrationAttemptId!==attemptId||
       snap.data().state!==STATES.REGISTERING)throw Error('Registration attempt mismatch');
    if(status==='registered'&&!/^[1-9][0-9]{0,17}$/.test(String(registrarOrderId||'')))throw Error('Missing registrar order ID');
    tx.update(ref,{state:status,registrarOrderId:registrarOrderId||null,
      updatedAt:FieldValue.serverTimestamp()});
  });
}
