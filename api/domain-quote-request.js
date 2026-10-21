import { verifyDomainCustomer, createDomainQuoteRequest } from '../lib/domain-firebase.js';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
  if(process.env.VERCEL_ENV==='production')return res.status(503).json({error:'Domain requests are not activated on the live website.'});
  if(!process.env.FIREBASE_SERVICE_ACCOUNT_JSON)return res.status(503).json({error:'Domain requests are not configured.'});
  const domain=String(req.body?.domain||'').trim().toLowerCase();
  if(!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.[a-z]{2,63}$/.test(domain))
    return res.status(400).json({error:'Enter a valid domain such as business.com.'});
  try{
    const uid=await verifyDomainCustomer(req);
    const requestId=await createDomainQuoteRequest({uid,domain,years:1});
    return res.status(202).json({requestId,state:'quote_requested',message:'Your request was recorded. No domain has been reserved and no payment was made.'});
  }catch(e){
    if(e.code?.startsWith('auth/')||/identity token/.test(e.message))return res.status(401).json({error:'Please sign in again.'});
    return res.status(503).json({error:'Could not record your request. Please try again later.'});
  }
}
