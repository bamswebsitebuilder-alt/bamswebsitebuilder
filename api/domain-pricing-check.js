// Read-only ResellerClub Web Pro HTTP API premium and wholesale pricing diagnostic.
// Never returns wholesale amounts, API credentials, or upstream errors to the browser.
// No payments or registrar writes.
const DOMAIN=/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.(?:com|net|org|co)$/;
const productKeys={com:['dotcom','domcom'],net:['dotnet','domnet'],org:['dotorg','domorg'],co:['dotco','domco']};
let cachedCosts=null,cachedAt=0;
function dollars(value){
 const s=String(value??'');
 if(!/^(?:0|[1-9]\d{0,5})(?:\.\d{1,2})?$/.test(s))return null;
 const [a,b='']=s.split('.'),n=Number(a)*100+Number(b.padEnd(2,'0'));
 return Number.isSafeInteger(n)&&n>0?n:null;
}
async function fetchRegistrar(path,params,timeout=9000){
 const response=await fetch('https://httpapi.com/api/'+path+'?'+params.toString(),{
  headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(timeout)});
 if(!response.ok)throw Error('upstream-status-'+response.status);
 const body=await response.json();
 if(!body||typeof body!=='object'||Array.isArray(body)||body.status==='ERROR')throw Error('upstream-shape');
 return body;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'GET required'});}
 const domain=typeof req.query?.domain==='string'?req.query.domain.trim().toLowerCase():'';
 if(!DOMAIN.test(domain))return res.status(400).json({error:'Unsupported domain name'});
 const uid=process.env.RESELLERCLUB_USER_ID,key=process.env.RESELLERCLUB_API_KEY;
 if(process.env.RESELLERCLUB_LEGACY_AVAILABILITY!=='true'||!/^\d+$/.test(uid||'')||!key)
  return res.status(503).json({error:'Registrar pricing lookup is not configured'});
 const p=new URLSearchParams({'auth-userid':uid,'api-key':key,'domain-name':domain});
 let stage='premium';
 try{
  if(process.env.VERCEL_ENV==='preview'&&req.query?.check==='wholesale'){
   const auth=new URLSearchParams({'auth-userid':uid,'api-key':key});
   const costs=await fetchRegistrar('products/reseller-cost-price.json',auth,20000);
   const groups=Object.entries(productKeys).map(([tld,aliases])=>({tld,mappedProducts:aliases.filter(k=>costs[k]&&typeof costs[k]==='object').length}));
   const comProductKeys=Object.keys(costs).filter(k=>/^[a-z0-9]{3,20}$/.test(k)&&(/com|domc/.test(k))).slice(0,12);
   return res.status(200).json({wholesaleReached:true,productGroups:groups,comProductKeys,checkoutEnabled:false});
  }
  const premium=await fetchRegistrar('domains/premium-check.json',p);
  // Fail closed on ambiguous or unavailable premium status.
  if(typeof premium.premium!=='boolean')
   return res.status(200).json({domain,verified:false,premium:null,reason:'Premium classification unavailable',checkoutEnabled:false});
  const tld=domain.split('.').pop();
  if(premium.premium===true)return res.status(200).json({domain,verified:true,premium:true,
   standardPricing:false,checkoutEnabled:false,message:'Premium domain requires a custom quote'});
  stage='wholesale';
  let costs=cachedCosts;
  if(!costs||Date.now()-cachedAt>600000){
   const auth=new URLSearchParams({'auth-userid':uid,'api-key':key});
   costs=await fetchRegistrar('products/reseller-cost-price.json',auth,13000);
   cachedCosts=costs;cachedAt=Date.now();
  }
  const matched=productKeys[tld].filter(k=>costs[k]&&typeof costs[k]==='object');
  if(matched.length!==1)return res.status(200).json({domain,verified:true,premium:false,
    standardPricing:false,checkoutEnabled:false,message:'Wholesale product mapping needs verification'});
  const entry=costs[matched[0]],registrationCost=dollars(entry.addnewdomain?.['1']),renewalCost=dollars(entry.renewdomain?.['1']);
  if(registrationCost===null||renewalCost===null)return res.status(200).json({domain,verified:true,premium:false,
    standardPricing:false,checkoutEnabled:false,message:'Wholesale registration or renewal price unavailable'});
  return res.status(200).json({domain,verified:true,premium:false,standardPricing:true,
    costValidated:true,checkoutEnabled:false,message:'Registrar premium classification and wholesale price confirmed'});
 }catch(e){
  console.error('[domain-pricing-check]',String(e?.name||'error').replace(/[^A-Za-z]/g,'').slice(0,25));
  return res.status(502).json({error:'Registrar pricing lookup unavailable. No payment was taken.',testStage:process.env.VERCEL_ENV==='preview'?stage:undefined,testFailure:process.env.VERCEL_ENV==='preview'?String(e?.message||e?.name||'unknown').replace(/[^a-zA-Z0-9-]/g,'').slice(0,25):undefined});
 }
}
