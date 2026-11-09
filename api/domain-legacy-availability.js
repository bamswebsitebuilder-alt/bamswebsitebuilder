// Read-only ResellerClub legacy HTTP availability proxy.
// Credentials stay in Vercel environment and are never sent to the browser.
// The registrar requires authentication in query parameters; never log the URL.
const TLD=['com','net','org','co'];
const statuses=new Set(['available','regthroughus','regthroughothers','unknown']);
// Public RDAP fallback confirms *registered* names only. A 404 or failed
// lookup is NOT proof that a domain is available for purchase.
async function registeredViaRdap(domain){
 const url=/\.(?:com|net)$/.test(domain)
  ?'https://rdap.verisign.com/'+domain.split('.').pop()+'/v1/domain/'+encodeURIComponent(domain)
  :'https://rdap.org/domain/'+encodeURIComponent(domain);
 try{
  const response=await fetch(url,{headers:{Accept:'application/rdap+json, application/json'},signal:AbortSignal.timeout(6500)});
  if(!response.ok)return false;
  const record=await response.json();
  return record&&record.objectClassName==='domain'&&
   typeof record.ldhName==='string'&&record.ldhName.toLowerCase()===domain;
 }catch(_error){return false;}
}
async function rdapFallback(name){
 const domains=await Promise.all(TLD.map(async tld=>{
  const domain=name+'.'+tld;
  const taken=await registeredViaRdap(domain);
  return {domain,status:taken?'regthroughothers':'unknown',available:taken?false:null,
   specialPricing:false,trademarkClaim:false};
 }));
 return domains;
}
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
 const configured=process.env.RESELLERCLUB_LEGACY_AVAILABILITY==='true'&&uid&&/^\d+$/.test(uid)&&key;
 if(configured){
  const params=new URLSearchParams();
  params.set('auth-userid',uid);params.set('api-key',key);params.append('domain-name',name);
  for(const tld of TLD)params.append('tlds',tld);
  try{
   const response=await fetch('https://domaincheck.httpapi.com/api/domains/available.json?'+params.toString(),{
    method:'GET',headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(9000)
   });
   if(response.ok){
    const body=await response.json();
    if(body&&typeof body==='object'&&!Array.isArray(body)&&body.status!=='ERROR'){
     const domains=TLD.map(tld=>{
      const domain=name+'.'+tld;
      const entry=body[domain];
      const status=typeof entry==='object'&&entry!==null?String(entry.status||'').toLowerCase():'';
      const specialPricing=Boolean(entry&&typeof entry==='object'&&Object.prototype.hasOwnProperty.call(entry,'costHash'));
      const trademarkClaim=Boolean(entry&&typeof entry==='object'&&(entry['tm-claims-key']||entry.tmClaimsKey));
      return {domain,status:statuses.has(status)?status:'unknown',
       available:status==='available'?true:['regthroughus','regthroughothers'].includes(status)?false:null,
       specialPricing,trademarkClaim};
     });
     if(domains.some(item=>item.available!==null)){
      // A registrar's unknown result can still be confirmed as registered via RDAP.
      const unknown=domains.filter(item=>item.available===null);
      await Promise.all(unknown.map(async item=>{
       if(await registeredViaRdap(item.domain)){item.available=false;item.status='regthroughothers';}
      }));
      return res.status(200).json({verified:true,source:'registrar',domains});
     }
    }
   }
  }catch(error){
   // Never log registrar URLs, credentials or response payloads.
   console.error('[legacy-domain-availability]',String(error?.name||'error').replace(/[^A-Za-z]/g,'').slice(0,25));
  }
 }
 // When registrar integration is not enabled or is unavailable, RDAP still
 // lets the site accurately label confirmed registrations as "Already taken".
 const domains=await rdapFallback(name);
 if(domains.some(item=>item.available===false))
  return res.status(200).json({verified:true,source:'rdap-registration-only',domains});
 return res.status(503).json({verified:false,domains,error:'Live availability could not be verified. Check Squarespace for final availability.'});
}
