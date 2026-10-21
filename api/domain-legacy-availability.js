// Read-only ResellerClub legacy HTTP availability proxy.
// Credentials stay in Vercel environment and are never sent to the browser.
// The registrar requires authentication in query parameters; never log the URL.
const TLD=['com','net','org','co'];
const statuses=new Set(['available','regthroughus','regthroughothers','unknown']);
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store, max-age=0');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
 const raw=req.query?.name;
 const name=typeof raw==='string'?raw.trim().toLowerCase():'';
 if(!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(name))
  return res.status(400).json({error:'Enter a valid business name without an extension.'});
 const uid=process.env.RESELLERCLUB_USER_ID;
 const key=process.env.RESELLERCLUB_API_KEY;
 // Never use sandbox v2 credentials for this API by assumption. Explicit opt-in.
 if(process.env.RESELLERCLUB_LEGACY_AVAILABILITY!=='true'||!uid||!/^\d+$/.test(uid)||!key)
  return res.status(503).json({error:'Live domain availability is not connected yet. Please use the hosted domain store.'});
 const params=new URLSearchParams();
 params.set('auth-userid',uid);params.set('api-key',key);params.append('domain-name',name);
 for(const tld of TLD)params.append('tlds',tld);
 try{
  const response=await fetch('https://domaincheck.httpapi.com/api/domains/available.json?'+params.toString(),{
   method:'GET',headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(9000)
  });
  if(!response.ok)return res.status(502).json({error:'Registrar lookup could not be completed. Use the hosted domain store.'});
  const body=await response.json();
  if(!body||typeof body!=='object'||Array.isArray(body)||body.status==='ERROR')
   return res.status(502).json({error:'Registrar lookup could not be verified. Use the hosted domain store.'});
  const domains=TLD.map(tld=>{
   const domain=name+'.'+tld;
   const entry=body[domain];
   const status=typeof entry==='object'&&entry!==null?String(entry.status||'').toLowerCase():'';
   return {domain,status:statuses.has(status)?status:'unknown',available:status==='available'?true:['regthroughus','regthroughothers'].includes(status)?false:null};
  });
  if(domains.every(item=>item.status==='unknown'))
   return res.status(502).json({error:'Availability was not confirmed. Please check the hosted domain store.'});
  return res.status(200).json({verified:true,domains});
 }catch(error){
  // Do not log request URL, request headers, query params, provider body or API key.
  console.error('[legacy-domain-availability]',String(error?.name||'error').replace(/[^A-Za-z]/g,'').slice(0,25));
  return res.status(502).json({error:'Registrar lookup is temporarily unavailable. Use the hosted domain store.'});
 }
}
