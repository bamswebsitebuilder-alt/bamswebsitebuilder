// Preview-only, credential-free connectivity probe for registrar hosts.
// Do not send API credentials or domain customer information.
const hosts=[
  ['v2-sandbox','https://api.sandbox.resellerclub.com/v2/domains/available?domainName=example.com'],
  ['v2-live','https://api.resellerclub.com/v2/domains/available?domainName=example.com'],
  ['legacy-api','https://httpapi.com/api/domains/available.json?domain-name=example&tlds=com']
];
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  if(process.env.VERCEL_ENV!=='preview')return res.status(404).json({error:'Not found'});
  const results=await Promise.all(hosts.map(async ([name,url])=>{
    const started=Date.now();
    try{
      const response=await fetch(url,{headers:{Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(6500)});
      await response.body?.cancel();
      return {name,httpStatus:response.status,elapsedMs:Date.now()-started,network:'reachable'};
    }catch(error){
      return {name,elapsedMs:Date.now()-started,network:'failed',
        errorType:String(error?.name||'unknown').replace(/[^A-Za-z]/g,'').slice(0,30),
        errorCode:String(error?.cause?.code||'unknown').replace(/[^A-Za-z0-9_]/g,'').slice(0,35)};
    }
  }));
  return res.status(200).json({results});
}
