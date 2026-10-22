// Read-only standard-domain eligibility gate. Fail closed on any uncertainty.
const SUPPORTED=/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.(?:com|net|org|co)$/;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store, max-age=0');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({eligible:false,error:'GET required'});}
 const domain=typeof req.query?.domain==='string'?req.query.domain.trim().toLowerCase():'';
 if(!SUPPORTED.test(domain))return res.status(400).json({eligible:false,error:'Only standard .com, .net, .org and .co searches are supported'});
 const uid=process.env.RESELLERCLUB_USER_ID,key=process.env.RESELLERCLUB_API_KEY;
 if(process.env.RESELLERCLUB_LEGACY_AVAILABILITY!=='true'||!/^\d+$/.test(uid||'')||!key)
  return res.status(503).json({domain,eligible:false,verified:false,message:'Registrar eligibility cannot be verified'});
 const params=new URLSearchParams({'auth-userid':uid,'api-key':key,'domain-name':domain});
 try{
  const upstream=await fetch('https://httpapi.com/api/domains/premium-check.json?'+params.toString(),{
   headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(9000)});
  if(!upstream.ok)throw Error('upstream');
  const result=await upstream.json();
  // API schema must be positively verified before approving any customer charge.
  if(result&&typeof result==='object'&&result.premium===true)
   return res.status(200).json({domain,eligible:false,verified:true,premium:true,message:'Premium domains are not sold here'});
  return res.status(200).json({domain,eligible:false,verified:false,premium:null,
   message:'Standard registration eligibility is awaiting registrar confirmation'});
 }catch(e){
  console.error('[domain-standard-eligibility]',String(e?.name||'error').replace(/[^A-Za-z]/g,'').slice(0,24));
  return res.status(200).json({domain,eligible:false,verified:false,premium:null,
   message:'Registrar premium classification is unavailable. Payment is disabled'});
 }
}
