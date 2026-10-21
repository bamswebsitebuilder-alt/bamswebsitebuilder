// Preview-only quote creation. Validates current registrar price server-side.
// No payment or registration is made.
import {verifyDomainCustomer} from '../lib/domain-firebase.js';
import {issueSandboxVerifiedQuote} from '../lib/domain-quotes.js';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'POST required'});}
  if(process.env.VERCEL_ENV==='production'||process.env.RESELLERCLUB_ENV!=='sandbox')
    return res.status(503).json({error:'Domain checkout is not live.'});
  try{
    const uid=await verifyDomainCustomer(req);
    const quote=await issueSandboxVerifiedQuote({
      uid,domain:req.body?.domain,registrant:req.body?.registrant,
      termsAccepted:req.body?.termsAccepted
    });
    return res.status(201).json(quote);
  }catch(e){
    if(e.code?.startsWith('auth/')||/identity token/.test(e.message||''))
      return res.status(401).json({error:'Please sign in again.'});
    return res.status(422).json({error:'Quote cannot be confirmed. Verify domain availability, registrar price, contact details and consent before retrying.'});
  }
}
