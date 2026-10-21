// Preview-only, limited registrar connectivity probe. An authenticated sandbox
// request uses the Vercel environment secret and never returns headers or body.
const hosts=[
  ['v2-sandbox','https://api.sandbox.resellerclub.com/v2/domains/available?domainName=example.com'],
  ['v2-live','https://api.resellerclub.com/v2/domains/available?domainName=example.com'],
  ['legacy-api','https://httpapi.com/api/domains/available.json?domain-name=example&tlds=com']
];
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  if(process.env.VERCEL_ENV!=='preview')return res.status(404).json({error:'Not found'});
  const key=process.env.RESELLERCLUB_API_KEY;
  const uid=process.env.RESELLERCLUB_USER_ID;
  const checks=key&&uid?[...hosts,['v2-sandbox-auth','https://api.sandbox.resellerclub.com/v2/domains/available?domainName=example.com&tlds=com']]:hosts;
  const results=await Promise.all(checks.map(async ([name,url])=>{
    const started=Date.now();
    try{
      const headers=name==='v2-sandbox-auth'?{Accept:'application/json',Authorization:'ApiKey '+key,'X-User-Id':uid}:{Accept:'application/json'};
      const response=await fetch(url,{headers,redirect:'manual',signal:AbortSignal.timeout(6500)});
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
