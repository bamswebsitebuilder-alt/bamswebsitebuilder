// PayPal sandbox webhook signature verification.
// Never trust unsigned callback bodies or browser-provided payment status.
import {paypalAccessToken} from './paypal.js';
export async function verifySandboxWebhook({headers,event}){
  if(process.env.PAYPAL_ENV!=='sandbox')throw Error('Sandbox only');
  const webhookId=process.env.PAYPAL_WEBHOOK_ID;
  if(!webhookId)throw Error('PayPal webhook ID is not configured');
  if(!event||typeof event!=='object'||typeof event.id!=='string'||
     !/^[A-Za-z0-9_-]{5,100}$/.test(event.id))throw Error('Invalid PayPal event');
  function required(header){
    const value=headers[String(header).toLowerCase()];
    if(typeof value!=='string'||!value||value.length>1000)throw Error('Missing PayPal header');
    return value;
  }
  const body={
    auth_algo:required('paypal-auth-algo'),
    cert_url:required('paypal-cert-url'),
    transmission_id:required('paypal-transmission-id'),
    transmission_sig:required('paypal-transmission-sig'),
    transmission_time:required('paypal-transmission-time'),
    webhook_id:webhookId,
    webhook_event:event
  };
  if(!body.cert_url.startsWith('https://api-m.sandbox.paypal.com/'))
    throw Error('Unexpected signing certificate URL');
  const response=await fetch('https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature',{
    method:'POST',
    headers:{Authorization:'Bearer '+await paypalAccessToken(),'Content-Type':'application/json'},
    body:JSON.stringify(body),signal:AbortSignal.timeout(12000)
  });
  if(!response.ok)throw Error('PayPal webhook signature endpoint failed');
  const result=await response.json();
  return result?.verification_status==='SUCCESS';
}
