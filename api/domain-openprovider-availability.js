// Read-only Openprovider search / premium classification; no checkout or registrations.
// Credentials are server-side only. Endpoint fails closed for unknown premiums or costs.
const TLD=['com','net','org','co'];
const NAME=/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
let cachedToken=null,tokenAt=0;
async function token(){
 if(process.env.OPENPROVIDER_API_TOKEN)return process.env.OPENPROVIDER_API_TOKEN;
 const username=process.env.OPENPROVIDER_USERNAME,password=process.env.OPENPROVIDER_PASSWORD;
 if(!username||!password)throw Error('missing-credentials');
 if(cachedToken&&Date.now()-tokenAt<30*60*1000)return cachedToken;
 const r=await fetch('https://api.openprovider.eu/v1/auth/login',{
  method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},
  body:JSON.stringify({username,password,ip:'0.0.0.0'}),redirect:'error',
  signal:AbortSignal.timeout(9000)});
 if(!r.ok)throw Error('auth-failed');
 const d=await r.json();
 if(d?.code!==0||typeof d?.data?.token!=='string'||!d.data.token)throw Error('auth-invalid');
 cachedToken=d.data.token;tokenAt=Date.now();return cachedToken;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'GET required'});}
 const name=typeof req.query?.name==='string'?req.query.name.trim().toLowerCase():'';
 if(!NAME.test(name))return res.status(400).json({error:'Enter a valid domain name without the extension.'});
 // Only enable on preview until genuine registrar responses and order flow pass tests.
 if(process.env.VERCEL_ENV==='production')return res.status(503).json({error:'Openprovider checkout integration is not activated'});
 if(!process.env.OPENPROVIDER_API_TOKEN&&(!process.env.OPENPROVIDER_USERNAME||!process.env.OPENPROVIDER_PASSWORD))
  return res.status(503).json({verified:false,provider:'openprovider',error:'Openprovider API access is not configured yet. No payments are available.'});
 try{
  const bearer=await token();
  const upstream=await fetch('https://api.openprovider.eu/v1/domains/check',{
   method:'POST',headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json',Accept:'application/json'},
   body:JSON.stringify({domains:TLD.map(extension=>({name,extension})),with_price:true}),
   redirect:'error',signal:AbortSignal.timeout(11000)});
  if(!upstream.ok)throw Error('check-failed');
  const body=await upstream.json();
  if(body?.code!==0||!Array.isArray(body?.data?.results))throw Error('check-shape');
  const domains=TLD.map(extension=>{
   const domain=name+'.'+extension;
   const found=body.data.results.filter(item=>item&&String(item.domain||'').toLowerCase()===domain);
   if(found.length!==1)return {domain,status:'unknown',premium:null,eligible:false};
   const item=found[0],status=item.status==='free'?'available':item.status==='active'?'registered':'unknown';
   const premium=item.is_premium===0||item.is_premium===false?false:
    item.is_premium===1||item.is_premium===true?true:null;
   const trademarkClaim=Boolean(item.claim_key);
   return {domain,status,premium,eligible:status==='available'&&premium===false&&!trademarkClaim,
     trademarkClaim};
  });
  // "verified" means API transport succeeded, not that all domains are eligible.
  return res.status(200).json({provider:'openprovider',verified:true,checkoutEnabled:false,domains});
 }catch(e){
  console.error('[openprovider-availability]',String(e?.message||'error').replace(/[^a-zA-Z-]/g,'').slice(0,35));
  return res.status(502).json({provider:'openprovider',verified:false,error:'Registrar lookup could not be verified. No payments are available.'});
 }
}
