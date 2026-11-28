import {configured,firebase,token,paypal,validSubId,validPlanId,matchingPlan,snapshot,digest,send,approvalUrl} from '../lib/paypal-sandbox.js';

// Only an authenticated client with an accepted, admin-configured hosting agreement
// may create a sandbox subscription. Never accept a price or plan from the browser.
export default async function handler(req,res){
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return send(res,405,{error:'method'});}
 if(!configured())return send(res,503,{error:'sandbox not configured'});
 const bearer=req.headers.authorization;
 if(typeof bearer!=='string'||!bearer.startsWith('Bearer '))return send(res,401,{error:'authentication required'});
 try{
  const {db,auth}=firebase();let identity;
  try{identity=await auth.verifyIdToken(bearer.slice(7),true);}catch{return send(res,401,{error:'invalid authentication'});}
  const uid=identity.uid;
  const allowedEmail=(process.env.PAYPAL_SANDBOX_TEST_EMAIL||'').trim().toLowerCase();
  const account=await auth.getUser(uid);
  if(!allowedEmail||!identity.email_verified||!account.emailVerified||account.disabled||(identity.email||'').toLowerCase()!==allowedEmail||(account.email||'').toLowerCase()!==allowedEmail)return send(res,403,{error:'Sandbox checkout is restricted to the verified test account'});
  const user=db.collection('users').doc(uid);
  const [profile,project]=await Promise.all([user.get(),user.collection('projects').doc('current').get()]);
  const h=project.data()?.hosting;
  if(profile.data()?.role!=='client')return send(res,403,{error:'Client account required'});
  if(req.method==='GET'){const state=await user.collection('billingAutomation').doc('sandbox').get();const data=state.data()||{};return send(res,200,{mode:'sandbox',status:data.status||'NOT_STARTED',subscriptionId:data.subscriptionId||null,nextBillingTime:data.nextBillingTime||null,lastPaymentAmount:data.lastPaymentAmount||null,lastPaymentCurrency:data.lastPaymentCurrency||null});}
  if(!profile.exists||!h||h.billingMode!=='paypal'||h.billingStatus!=='awaiting-approval'||!['setup','active'].includes(h.status)||!validPlanId(h.paypalPlanId)||!Number.isSafeInteger(h.feeCents)||h.feeCents<=0||!['monthly','yearly'].includes(h.cadence)||!/^[a-f0-9]{64}$/.test(h.agreementId||''))return send(res,409,{error:'hosting not eligible'});
  const agreement=user.collection('agreements').doc(h.agreementId);
  const [quote,receipt]=await Promise.all([agreement.get(),agreement.collection('acceptances').doc('client').get()]);
  if(!quote.exists||quote.data().state!=='issued'||!receipt.exists||receipt.data().clientUid!==uid)return send(res,409,{error:'agreement not accepted'});
  const access=await token();
  const plan=await paypal(access,'/v1/billing/plans/'+encodeURIComponent(h.paypalPlanId));
  if(!matchingPlan(plan,h))return send(res,409,{error:'sandbox plan does not match agreement'});
  const target=user.collection('billingAutomation').doc('sandbox');
  const reservation=db.collection('paypalSandboxReservations').doc(digest(uid));
  const customId=digest('sandbox-hosting:'+uid+':'+h.agreementId+':'+h.paypalPlanId);
  const requestId=customId.slice(0,38);
  const locked=await db.runTransaction(async tx=>{
   const [old,hold,fresh]=await Promise.all([tx.get(target),tx.get(reservation),tx.get(user.collection('projects').doc('current'))]);
   if(fresh.data()?.hosting?.revision!==h.revision)return {conflict:true};
   if(old.exists)return {existing:old.data().subscriptionId};
   if(hold.exists){const p=hold.data();if(p.customId!==customId||Date.now()-p.createdAt.toMillis()>3600000)return {conflict:true};}
   else tx.create(reservation,{customId,requestId,createdAt:new Date(),mode:'sandbox'});
   return {};
  });
  if(locked.conflict)return send(res,409,{error:'subscription requires review'});
  if(locked.existing){
   if(!validSubId(locked.existing))return send(res,409,{error:'subscription requires review'});
   const binding=await db.collection('paypalSandboxBindings').doc(locked.existing).get();
   if(!binding.exists||binding.data().uid!==uid||binding.data().customId!==customId)return send(res,409,{error:'subscription requires review'});
   const sub=await paypal(access,'/v1/billing/subscriptions/'+encodeURIComponent(locked.existing));
   if(sub.id!==locked.existing||sub.plan_id!==h.paypalPlanId||sub.custom_id!==customId)return send(res,409,{error:'subscription mismatch'});
   return send(res,200,{mode:'sandbox',subscriptionId:sub.id,status:sub.status,approvalUrl:sub.status==='APPROVAL_PENDING'?approvalUrl(sub):null});
  }
  const sub=await paypal(access,'/v1/billing/subscriptions',{plan_id:h.paypalPlanId,custom_id:customId,quantity:'1'},requestId);
  if(!validSubId(sub.id))throw Error('invalid subscription');
  const verified=await paypal(access,'/v1/billing/subscriptions/'+encodeURIComponent(sub.id));
  if(verified.id!==sub.id||verified.plan_id!==h.paypalPlanId||verified.custom_id!==customId)throw Error('subscription mismatch');
  const binding=db.collection('paypalSandboxBindings').doc(sub.id);
  await db.runTransaction(async tx=>{
   const [old,link,hold]=await Promise.all([tx.get(target),tx.get(binding),tx.get(reservation)]);
   if(!hold.exists||hold.data().customId!==customId)throw Error('reservation changed');
   if(old.exists&&old.data().subscriptionId!==sub.id)throw Error('subscription conflict');
   if(link.exists&&(link.data().uid!==uid||link.data().customId!==customId||link.data().planId!==h.paypalPlanId))throw Error('binding conflict');
   if(!link.exists)tx.create(binding,{uid,customId,planId:h.paypalPlanId,mode:'sandbox',createdAt:new Date()});
   if(!old.exists)tx.create(target,snapshot(verified));
  });
  return send(res,201,{mode:'sandbox',subscriptionId:sub.id,status:verified.status,approvalUrl:verified.status==='APPROVAL_PENDING'?(approvalUrl(sub)||approvalUrl(verified)):null});
 }catch{return send(res,503,{error:'unable to create or retrieve sandbox subscription'});}
}
