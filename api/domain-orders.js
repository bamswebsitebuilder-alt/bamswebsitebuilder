import { verifyDomainCustomer, listDomainCustomerOrders } from '../lib/domain-firebase.js';
export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('Vary','Authorization');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  if(!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    return res.status(503).json({error:'Domain order records are not configured.'});
  try {
    const uid=await verifyDomainCustomer(req);
    const orders=await listDomainCustomerOrders(uid);
    return res.status(200).json({orders});
  }catch(error){
    if(error.message==='Missing Firebase identity token'||error.message==='Invalid Firebase identity')
      return res.status(401).json({error:'Please sign in again.'});
    if(error.code==='auth/id-token-expired'||error.code==='auth/argument-error'||error.code==='auth/id-token-revoked')
      return res.status(401).json({error:'Please sign in again.'});
    return res.status(503).json({error:'Order history is temporarily unavailable.'});
  }
}
