// Server-only Firebase Admin helpers for domain orders. Never ship this file
// to the browser, and never accept order owner, price or status from client JSON.
import { getApps, initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
let app;
function adminApp(){
  if(app)return app;
  const existing=getApps().find(x=>x.name==='domain-orders');
  if(existing){app=existing;return app;}
  const projectId=process.env.FIREBASE_PROJECT_ID;
  if(projectId!=='bam-client-portal')throw Error('Firebase project not configured');
  // Use a private service account JSON only in Vercel environment settings.
  // ADC also works for trusted service environments.
  const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  let credentials;
  if(raw){
    let parsed;
    try{parsed=JSON.parse(raw)}catch{throw Error('Invalid Firebase service account JSON')}
    if(parsed.project_id!==projectId)throw Error('Firebase project mismatch');
    credentials=cert(parsed);
  }else{
    credentials=applicationDefault();
  }
  app=initializeApp({credential:credentials,projectId},'domain-orders');
  return app;
}
export async function verifyDomainCustomer(req){
  const auth=String(req.headers.authorization||'');
  if(!/^Bearer [A-Za-z0-9._-]{40,4096}$/.test(auth))throw Error('Missing Firebase identity token');
  const token=await getAuth(adminApp()).verifyIdToken(auth.slice(7),true);
  if(!token.uid)throw Error('Invalid Firebase identity');
  return token.uid;
}
export async function createPendingDomainOrder({uid,quote,domain}){
  if(typeof uid!=='string'||!uid||!quote?.id||!Number.isSafeInteger(quote.amountCents)||quote.amountCents<=0)throw Error('Invalid order quote');
  if(typeof domain!=='string'||!/^[a-z0-9-]{1,63}\.[a-z]{2,63}$/.test(domain))throw Error('Invalid domain');
  const db=getFirestore(adminApp());
  const ref=db.collection('domainOrders').doc(quote.id);
  await db.runTransaction(async tx=>{
    const snapshot=await tx.get(ref);
    if(snapshot.exists)throw Error('Duplicate quote');
    tx.create(ref,{uid,domain,amountCents:quote.amountCents,currency:'USD',
      state:'pending_payment',createdAt:FieldValue.serverTimestamp(),
      updatedAt:FieldValue.serverTimestamp(),paypalOrderId:null,
      paypalCaptureId:null,registrarOrderId:null});
  });
  return ref.id;
}
// Order state changes must be executed only by trusted server code after
// PayPal verification, with Firestore transactions and state/idempotency checks.
