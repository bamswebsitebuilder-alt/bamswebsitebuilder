// Registrar availability lookup. Never display guessed prices or treat availability as a reservation.
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({message:'Method not allowed'});
  const domain=String(req.query?.domain||'').trim().toLowerCase();
  if(!/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain))
    return res.status(400).json({message:'Enter a valid domain name such as yourbusiness.com.'});
  const key=process.env.RESELLERCLUB_API_KEY,user=process.env.RESELLERCLUB_USER_ID;
  if(!key||!user)return res.status(503).json({available:null,message:'Live domain lookup is not activated yet. Please contact us for assistance.'});
  const live=process.env.RESELLERCLUB_ENV==='live';
  const base=live?'https://api.resellerclub.com/v2':'https://api.sandbox.resellerclub.com/v2';
  try{
    const parts=domain.split('.');
    const tld=parts.pop();
    const name=parts.join('.');
    const params=new URLSearchParams({domainName:name,tlds:tld});
    const upstream=await fetch(base+'/domains/available?'+params.toString(),{headers:{Authorization:'ApiKey '+key,'X-User-Id':user,Accept:'application/json'},signal:AbortSignal.timeout(8000)});
    if(!upstream.ok)return res.status(502).json({available:null,message:'Registrar could not verify this domain right now.'});
    const data=await upstream.json();
    const entry=(data && typeof data==='object' && (data[domain]||data.result?.[domain]||data));
    const available=entry?.available===true||entry?.status==='available';
    const unavailable=entry?.available===false||['unavailable','taken','regthroughus','regthroughothers'].includes(entry?.status);
    if(!available&&!unavailable)return res.status(502).json({available:null,message:'Registrar returned an unrecognized availability status. Please contact us.'});
    return res.status(200).json({available,message:available?domain+' appears available. Checkout is not enabled yet; contact us for a confirmed quote.':domain+' is not available. Try another name.'});
  }catch{return res.status(502).json({available:null,message:'Domain lookup could not be completed. Please try again later.'})}
}
