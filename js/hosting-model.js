export const HOSTING_STATES=['setup','active','attention','paused','ending','ended'];
export const BILLING_STATES=['not-configured','awaiting-approval','active','past-due','cancelled'];
export const HOSTING_FIELDS=['plan','siteUrl','provider','status','nextRenewal','fee','cadence','billingMode','billingStatus','paypalPlanId','agreementNumber','domainOwner','hostingOwner','supportDetails','handoverDetails','issues','serviceEnds','lastReviewed'];
export function safeHostingUrl(value) {
  if(!value)return '';
  try { const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:''; } catch { return ''; }
}
function date(value) {
  if(!value)return '';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||new Date(value+'T12:00:00Z').toISOString().slice(0,10)!==value)throw Error('date');
  return value;
}
export function hostingInput(values) {
  const text=(key,max=100)=>{const value=String(values[key]??'').trim();if(value.length>max)throw Error('length');return value;};
  const choice=(key,options)=>{const value=text(key);if(!options.includes(value))throw Error('choice');return value;};
  const fee=text('fee');
  if(fee!==''&&(!/^\d{1,6}(\.\d{1,2})?$/.test(fee)||Number(fee)<=0||Number(fee)>100000))throw Error('fee');
  const result={version:1,plan:text('plan'),siteUrl:text('siteUrl',2048),provider:text('provider'),
    status:choice('status',HOSTING_STATES),nextRenewal:date(text('nextRenewal')),
    feeCents:fee===''?null:Math.round(Number(fee)*100),cadence:choice('cadence',['monthly','yearly']),
    billingMode:choice('billingMode',['direct','invoice','paypal']),billingStatus:choice('billingStatus',BILLING_STATES),
    paypalPlanId:text('paypalPlanId',64),agreementNumber:text('agreementNumber',20),
    domainOwner:choice('domainOwner',['unconfirmed','client','bam','other']),hostingOwner:choice('hostingOwner',['unconfirmed','client','bam','other']),
    supportDetails:text('supportDetails',2000),handoverDetails:text('handoverDetails',2000),issues:text('issues',2000),
    serviceEnds:date(text('serviceEnds')),lastReviewed:date(text('lastReviewed'))};
  if(!result.plan||!result.provider)throw Error('required');
  if(result.siteUrl&&!safeHostingUrl(result.siteUrl))throw Error('url');
  if(result.agreementNumber&&!/^[0-9]{1,20}$/.test(result.agreementNumber))throw Error('agreement');
  if(result.paypalPlanId&&!/^P-[A-Z0-9]{5,60}$/.test(result.paypalPlanId))throw Error('paypal');
  if(result.billingMode==='paypal'&&result.paypalPlanId&&(!result.agreementNumber||result.feeCents===null))throw Error('agreement');
  if(result.billingMode!=='paypal')result.paypalPlanId='';
  if(['ending','ended'].includes(result.status)&&!result.serviceEnds)throw Error('end-date');
  return result;
}
export function hostingValues(record={}) {
  return {plan:'',siteUrl:'',provider:'',status:'setup',nextRenewal:'',fee:'',cadence:'monthly',billingMode:'direct',billingStatus:'not-configured',paypalPlanId:'',agreementNumber:'',domainOwner:'unconfirmed',hostingOwner:'unconfirmed',supportDetails:'',handoverDetails:'',issues:'',serviceEnds:'',lastReviewed:'',...record,fee:record.feeCents==null?'':(record.feeCents/100).toFixed(2)};
}
export function hostingDue(record,now=new Date()) {
  if(!record||record.status==='ended'||!record.nextRenewal)return null;
  const days=Math.ceil((new Date(record.nextRenewal+'T23:59:59')-now)/86400000);
  return Number.isFinite(days)&&days<=30?{days,overdue:new Date(record.nextRenewal+'T23:59:59')<now}:null;
}
export function paypalHostingLink(record,accepted) {
  if(!accepted||record?.billingMode!=='paypal'||record.billingStatus!=='awaiting-approval'||!['setup','active'].includes(record.status)||!/^P-[A-Z0-9]{5,60}$/.test(record.paypalPlanId||'')||!record.agreementId||!(record.feeCents>0))return '';
  return 'https://www.paypal.com/webapps/billing/plans/subscribe?plan_id='+encodeURIComponent(record.paypalPlanId);
}

export async function hostingAgreementId(number) {
  if(!number)return "";
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(number));
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,"0")).join("");
}
