// ResellerClub JSON v2 sandbox integration.
// Source: https://developer.resellerclub.com/documentation/quickstart
// Registrar writes are disabled until payment/reconciliation testing is complete.
const BASE='https://api.sandbox.resellerclub.com/v2';
const DOMAIN=/^(?=.{4,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.(?:com|net|org|co)$/;
function credentials(){
  if(process.env.RESELLERCLUB_ENV!=='sandbox')throw Error('ResellerClub sandbox only');
  const key=process.env.RESELLERCLUB_API_KEY,uid=process.env.RESELLERCLUB_USER_ID;
  if(!key||!/^[0-9]+$/.test(uid||''))throw Error('ResellerClub credentials missing');
  return {Authorization:'ApiKey '+key,'X-User-Id':uid,Accept:'application/json'};
}
async function call(path,method='GET',body){
  const response=await fetch(BASE+path,{
    method,
    headers:{...credentials(),...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),
    signal:AbortSignal.timeout(12000)
  });
  const result=await response.json().catch(()=>null);
  if(!response.ok||!result||result.status==='ERROR')throw Error('ResellerClub HTTP '+response.status);
  return result;
}
function domainValid(domain){return typeof domain==='string'&&DOMAIN.test(domain);}
export async function checkSandboxAvailability(domain){
  if(!domainValid(domain))throw Error('Only listed domain extensions are supported');
  const [label,tld]=domain.split('.');
  const params=new URLSearchParams({domainName:label,tlds:tld});
  const result=await call('/domains/available?'+params);
  const item=result?.[domain]??result?.result?.[domain]??result;
  if(item?.available===true||item?.status==='available')return true;
  if(item?.available===false||['regthroughus','regthroughothers','unavailable','taken'].includes(item?.status))return false;
  throw Error('Unknown availability response');
}
function positiveId(id){return /^[1-9][0-9]{0,17}$/.test(String(id??''));}
export async function createSandboxRegistrarCustomer(customer){
  if(process.env.DOMAIN_ENABLE_SANDBOX_REGISTRATION!=='true')throw Error('Registrar writes disabled');
  const keys=['username','password','name','company','addressLine1','city','country','zipcode','phoneCountryCode','phone'];
  if(!customer||keys.some(k=>typeof customer[k]!=='string'||!customer[k].trim()))throw Error('Missing customer information');
  return call('/customers','POST',Object.fromEntries(keys.map(k=>[k,customer[k].trim()])));
}
export async function createSandboxRegistrarContact(contact){
  if(process.env.DOMAIN_ENABLE_SANDBOX_REGISTRATION!=='true')throw Error('Registrar writes disabled');
  const keys=['customerId','name','email','addressLine1','city','country','zipcode','phoneCountryCode','phone'];
  if(!contact||keys.some(k=>!String(contact[k]??'').trim())||!positiveId(contact.customerId))throw Error('Missing contact information');
  return call('/contacts','POST',{...contact,type:'Contact'});
}
export async function registerSandboxDomain({domain,years,customerId,regContactId,adminContactId,techContactId,billingContactId,ns}){
  if(process.env.DOMAIN_ENABLE_SANDBOX_REGISTRATION!=='true')throw Error('Registrar writes disabled');
  if(!domainValid(domain)||years!==1)throw Error('Invalid domain or term');
  if(![customerId,regContactId,adminContactId,techContactId,billingContactId].every(positiveId))throw Error('Invalid contact IDs');
  if(!Array.isArray(ns)||ns.length<2||ns.some(x=>typeof x!=='string'||!/^([a-z0-9-]+\.)+[a-z]{2,63}$/.test(x)))throw Error('Invalid nameservers');
  // Calls to registration are non-idempotent. The caller must first acquire
  // an order-specific Firestore lock, and manually reconcile ambiguous outcomes.
  return call('/domains','POST',{domainName:domain,years,customerId:String(customerId),
    regContactId:String(regContactId),adminContactId:String(adminContactId),
    techContactId:String(techContactId),billingContactId:String(billingContactId),
    ns,invoiceOption:'PayInvoice',autoRenew:false});
}
export async function getSandboxRegistrationActions(orderId){
  if(!positiveId(orderId))throw Error('Invalid registrar order ID');
  const q=new URLSearchParams({orderId:String(orderId),page:'1',size:'10'});
  return call('/actions?'+q);
}
