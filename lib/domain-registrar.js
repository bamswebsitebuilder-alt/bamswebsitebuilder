// Official ResellerClub/LogicBoxes HTTP API transport (sandbox only).
// Documentation: https://manage.resellerclub.com/kb/answer/764
const DOMAIN=/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const SANDBOX='https://test.httpapi.com/api';
function auth(){
  if(process.env.RESELLERCLUB_ENV!=='sandbox')throw Error('Registrar sandbox required');
  const user=process.env.RESELLERCLUB_USER_ID,key=process.env.RESELLERCLUB_API_KEY;
  if(!/^[0-9]+$/.test(user||'')||!key)throw Error('Registrar credentials missing or invalid');
  return {'auth-userid':user,'api-key':key};
}
async function request(path,method,params){
  const data=new URLSearchParams({...auth(),...params});
  const origin=path==='/domains/available.json'?'https://domaincheck.httpapi.com/api':SANDBOX;
  const url=origin+path+(method==='GET'?'?'+data.toString():'');
  const response=await fetch(url,{method,headers:{Accept:'application/json',...(method==='POST'?{'Content-Type':'application/x-www-form-urlencoded'}:{})},
    ...(method==='POST'?{body:data.toString()}:{}),signal:AbortSignal.timeout(12000)});
  const result=await response.json().catch(()=>null);
  if(!response.ok||result?.status==='ERROR'||!result)throw Error('ResellerClub request failed HTTP '+response.status);
  return result;
}
export async function checkSandboxAvailability(domain){
  if(typeof domain!=='string'||!DOMAIN.test(domain))throw Error('Invalid domain');
  // API expects the desired second-level label as domain-name and tlds separately.
  const segments=domain.split('.');
  if(segments.length!==2)throw Error('Only standard two-part domain names are supported');
  const [label,tld]=segments;
  const result=await request('/domains/available.json','GET',{'domain-name':label,tlds:tld});
  const item=result[domain];
  if(item?.status==='available')return true;
  if(['regthroughus','regthroughothers'].includes(item?.status))return false;
  throw Error('Registrar returned unknown availability');
}
// Registration and customer creation must never be reachable through a public
// endpoint until payment/capture reconciliation, registrar validation, and
// idempotency locks are end-to-end tested.
export async function registerSandboxDomain({domain,years,customerId,regContactId,adminContactId,techContactId,billingContactId,ns}){
  if(process.env.DOMAIN_ENABLE_SANDBOX_REGISTRATION!=='true')throw Error('Registrar writes disabled');
  if(!DOMAIN.test(domain)||!Number.isInteger(years)||years<1||years>10)throw Error('Invalid domain or term');
  const ids={ 'customer-id':customerId,'reg-contact-id':regContactId,'admin-contact-id':adminContactId,'tech-contact-id':techContactId,'billing-contact-id':billingContactId};
  for(const id of Object.values(ids))if(!/^[1-9][0-9]*$/.test(String(id)))throw Error('Invalid customer/contact ID');
  if(!Array.isArray(ns)||ns.length<2||ns.some(x=>typeof x!=='string'||!DOMAIN.test(x)))throw Error('Invalid nameservers');
  const params={'domain-name':domain,years:String(years),...ids,'invoice-option':'OnlyAdd','auto-renew':'false'};
  // Repeated ns form parameters are required by the registrar API.
  // Support repeated keys using URLSearchParams here rather than a plain object.
  const form=new URLSearchParams({...auth(),...params});
  ns.forEach(x=>form.append('ns',x));
  const response=await fetch(SANDBOX+'/domains/register.json',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},
    body:form.toString(),signal:AbortSignal.timeout(15000)});
  const result=await response.json().catch(()=>null);
  if(!response.ok||!result||result.status==='ERROR')throw Error('Registration outcome requires manual reconciliation');
  return result;
}
