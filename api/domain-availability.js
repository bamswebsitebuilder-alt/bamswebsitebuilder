// Public, read-only domain lookup with safe failure behavior.
import {checkSandboxAvailability} from '../lib/domain-registrar.js';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({message:'Method not allowed'});}
  if(process.env.VERCEL_ENV==='production'||process.env.RESELLERCLUB_ENV!=='sandbox')
    return res.status(503).json({available:null,message:'Domain search is not enabled on the live website yet.'});
  const domain=String(req.query?.domain||'').trim().toLowerCase();
  if(!/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain))
    return res.status(400).json({available:null,message:'Enter a valid domain, such as yourbusiness.com.'});
  try{
    const available=await checkSandboxAvailability(domain);
    return res.status(200).json({domain,available,message:available?
      domain+' appears available. Registration is not enabled; contact us for a verified quote.':
      domain+' is already registered. Try a different name.'});
  }catch(error){
    // Log only server-controlled error classes/status; never credentials or provider payloads.
    const reason=String(error?.message||'').match(/^(ResellerClub HTTP [0-9]{3}|ResellerClub credentials missing|Unknown availability response|Only listed domain extensions are supported|ResellerClub sandbox only)$/)?.[0]||'Unknown registrar failure';
    console.error('[domain-availability]',reason);
    return res.status(502).json({available:null,message:'Registrar could not verify availability. Please try again or contact us.'});
  }
}
