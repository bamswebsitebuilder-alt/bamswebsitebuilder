// Server-only PayPal sandbox operations. Never expose this module in a browser.
// Payments remain unavailable until authenticated order persistence and registrar
// fulfillment are complete. These functions are NOT wired to a public endpoint.
import { paypalAccessToken } from './paypal.js';
const base = 'https://api-m.sandbox.paypal.com';
function quoteIdValid(id){return typeof id==='string' && /^[A-Za-z0-9_-]{8,64}$/.test(id)}
export function verifyCompletedCapture(order,quote){
  if(!quote||!quoteIdValid(quote.id)||!Number.isSafeInteger(quote.amountCents)||quote.amountCents<=0)return false;
  if(order?.status!=='COMPLETED'||!Array.isArray(order.purchase_units)||order.purchase_units.length!==1)return false;
  const unit=order.purchase_units[0];
  if(unit.reference_id!==quote.id||unit.amount?.currency_code!=='USD'||unit.amount?.value!==(quote.amountCents/100).toFixed(2))return false;
  const captures=unit.payments?.captures;
  return Array.isArray(captures)&&captures.length===1&&
    typeof captures[0].id==='string'&&captures[0].id.length>0&&
    captures[0].status==='COMPLETED'&&captures[0].amount?.currency_code==='USD'&&
    captures[0].amount?.value===(quote.amountCents/100).toFixed(2);
}
async function request(path,method,body,key){
  if(process.env.PAYPAL_ENV!=='sandbox')throw Error('Sandbox required');
  const token=await paypalAccessToken();
  const response=await fetch(base+path,{
    method,
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','PayPal-Request-Id':key},
    ...(body?{body:JSON.stringify(body)}:{}),
    signal:AbortSignal.timeout(15000)
  });
  if(!response.ok)throw Error('PayPal sandbox HTTP '+response.status);
  return response.json();
}
export async function createSandboxOrder(quote){
  if(!quoteIdValid(quote?.id)||!Number.isSafeInteger(quote?.amountCents)||quote.amountCents<=0||quote.amountCents>100000000)throw Error('Invalid server quote');
  return request('/v2/checkout/orders','POST',{
    intent:'CAPTURE',
    purchase_units:[{reference_id:quote.id,amount:{currency_code:'USD',value:(quote.amountCents/100).toFixed(2)}}]
  },'domain-create-'+quote.id);
}
export async function captureSandboxOrder(orderId,quoteId){
  if(!/^[A-Z0-9]{8,32}$/.test(orderId)||!quoteIdValid(quoteId))throw Error('Invalid order IDs');
  return request('/v2/checkout/orders/'+orderId+'/capture','POST',{},'domain-capture-'+quoteId);
}
