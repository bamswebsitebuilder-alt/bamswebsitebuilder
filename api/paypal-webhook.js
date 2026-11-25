import {configured,firebase,token,paypal,validSubId,snapshot,digest,send} from '../lib/paypal-sandbox.js';
const events=new Set(['BILLING.SUBSCRIPTION.CREATED','BILLING.SUBSCRIPTION.ACTIVATED','BILLING.SUBSCRIPTION.UPDATED','BILLING.SUBSCRIPTION.CANCELLED','BILLING.SUBSCRIPTION.SUSPENDED','BILLING.SUBSCRIPTION.EXPIRED','BILLING.SUBSCRIPTION.PAYMENT.FAILED','PAYMENT.SALE.COMPLETED','PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED']);
export default async function handler(req,res){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'method'});}
 if(!configured())return send(res,503,{error:'sandbox not configured'});
 try{
  const e=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!e||typeof e.id!=='string'||e.id.length>200||typeof e.event_type!=='string')return send(res,400,{error:'invalid event'});
  const fields={'auth_algo':'paypal-auth-algo','cert_url':'paypal-cert-url','transmission_id':'paypal-transmission-id','transmission_sig':'paypal-transmission-sig','transmission_time':'paypal-transmission-time'};
  const signature={webhook_id:process.env.PAYPAL_WEBHOOK_ID,webhook_event:e};
  for(const [k,h] of Object.entries(fields)){if(typeof req.headers[h]!=='string'||!req.headers[h])return send(res,400,{error:'missing signature'});signature[k]=req.headers[h];}
  const access=await token();const check=await paypal(access,'/v1/notifications/verify-webhook-signature',signature);
  if(check.verification_status!=='SUCCESS')return send(res,401,{error:'invalid signature'});
  if(!events.has(e.event_type))return send(res,200,{ignored:true});
  const id=e.event_type.startsWith('BILLING.SUBSCRIPTION.')?e.resource?.id:e.resource?.billing_agreement_id;
  if(!validSubId(id))return send(res,200,{ignored:true});
  const {db}=firebase();const binding=db.collection('paypalSandboxBindings').doc(id), event=db.collection('paypalSandboxEvents').doc(digest(e.id));
  const registered=await binding.get();if(!registered.exists)return send(res,200,{ignored:true});
  const bound=registered.data();if(typeof bound.uid!=='string'||bound.mode!=='sandbox')return send(res,409,{error:'invalid binding'});
  const sub=await paypal(access,'/v1/billing/subscriptions/'+encodeURIComponent(id));
  if(sub.id!==id||sub.plan_id!==bound.planId||sub.custom_id!==bound.customId)return send(res,409,{error:'subscription mismatch'});
  const current=snapshot(sub);const target=db.collection('users').doc(bound.uid).collection('billingAutomation').doc('sandbox');
  await db.runTransaction(async tx=>{
   const [seen,old,link]=await Promise.all([tx.get(event),tx.get(target),tx.get(binding)]);
   if(seen.exists)return;
   if(!link.exists||link.data().uid!==bound.uid||link.data().customId!==bound.customId||link.data().planId!==bound.planId)throw Error('binding changed');
   if(old.exists&&old.data().subscriptionId!==id)throw Error('different subscription');
   const previous=old.data()?.providerUpdatedAt;
   if(!previous||!current.providerUpdatedAt||current.providerUpdatedAt>=previous)tx.set(target,current,{merge:true});
   tx.create(event,{type:e.event_type,subscriptionId:id,receivedAt:new Date(),mode:'sandbox'});
  });
  return send(res,200,{received:true});
 }catch{ return send(res,503,{error:'unable to verify or synchronize event'});}
}
