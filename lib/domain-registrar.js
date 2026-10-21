// ResellerClub v2 adapter. Server-only. Registration is intentionally not
// invoked by any public API route until verified paid-order reconciliation exists.
const base='https://api.sandbox.resellerclub.com/v2';
const domainPattern=/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
async function callRegistrar(path,method='GET',body) {
  if(process.env.RESELLERCLUB_ENV!=='sandbox')throw Error('Registrar sandbox required');
  const key=process.env.RESELLERCLUB_API_KEY,userId=process.env.RESELLERCLUB_USER_ID;
  if(!key||!userId)throw Error('Registrar credentials missing');
  const response=await fetch(base+path,{
    method,headers:{Authorization:'ApiKey '+key,'X-User-Id':userId,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),
    signal:AbortSignal.timeout(15000)
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error('Registrar HTTP '+response.status);
  return data;
}
export async function checkSandboxAvailability(domain){
  if(typeof domain!=='string'||!domainPattern.test(domain))throw Error('Invalid domain');
  const data=await callRegistrar('/domains/available?'+new URLSearchParams({domainName:domain,tlds:domain.split('.').at(-1)}));
  const item=data?.[domain]??data?.result?.[domain]??data;
  if(item?.available===true||item?.status==='available')return true;
  if(item?.available===false||['unavailable','taken','regthroughus','regthroughothers'].includes(item?.status))return false;
  throw Error('Unrecognized registrar response');
}
export async function registerSandboxDomain({domain,years,customerId,regContactId,adminContactId,techContactId,billingContactId,ns}) {
  if(!domainPattern.test(domain)||!Number.isInteger(years)||years<1||years>10)throw Error('Invalid domain or term');
  for(const id of [customerId,regContactId,adminContactId,techContactId,billingContactId]){
    if(!Number.isSafeInteger(id)||id<=0)throw Error('Invalid registrar customer/contact IDs');
  }
  if(!Array.isArray(ns)||ns.length<2||ns.some(n=>typeof n!=='string'||!domainPattern.test(n)))throw Error('Invalid nameservers');
  // Registrar calls are NOT guaranteed idempotent. If timeout occurs after
  // submission, query the action/order status before ever attempting a retry.
  return callRegistrar('/domains','POST',{domainName:domain,years,customerId,regContactId,adminContactId,techContactId,billingContactId,ns,invoiceOption:'PayInvoice',autoRenew:false});
}
