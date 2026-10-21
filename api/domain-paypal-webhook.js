// Preview-only signed webhook intake. This records audit events but never
// captures payments, changes purchase state or submits registrar orders.
import {FieldValue} from 'firebase-admin/firestore';
import {domainOrderDatabase} from '../lib/domain-firebase.js';
import {verifySandboxWebhook} from '../lib/domain-paypal-webhooks.js';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
  if(process.env.VERCEL_ENV==='production'||process.env.PAYPAL_ENV!=='sandbox'||
     !process.env.PAYPAL_WEBHOOK_ID)return res.status(503).json({error:'Webhook is disabled'});
  try{
    const verified=await verifySandboxWebhook({headers:req.headers,event:req.body});
    if(!verified)return res.status(400).json({error:'Signature invalid'});
    const {id,event_type,create_time}=req.body;
    if(!/^[A-Za-z0-9_-]{5,100}$/.test(id)||typeof event_type!=='string')
      return res.status(400).json({error:'Invalid event'});
    const ref=domainOrderDatabase().collection('domainWebhookAudit').doc(id);
    await domainOrderDatabase().runTransaction(async tx=>{
      const snap=await tx.get(ref);
      if(!snap.exists)tx.create(ref,{eventType:event_type,provider:'paypal_sandbox',
        createdAt:FieldValue.serverTimestamp(),paypalCreatedAt:create_time||null,
        action:'audit_only'});
    });
    return res.status(200).json({received:true});
  }catch{return res.status(503).json({error:'Unable to verify webhook'})}
}
