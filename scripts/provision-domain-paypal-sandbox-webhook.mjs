// PayPal Sandbox webhook provisioning script. Dry run by default.
// Run only after a stable public HTTPS webhook endpoint is deployed and
// its signature verification is active; never paste client secrets into chat.
// Uses PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET from a protected environment.
const url=process.env.PAYPAL_WEBHOOK_URL;
const create=process.argv.includes('--create');
if(process.env.PAYPAL_ENV!=='sandbox')throw Error('Only PayPal Sandbox is supported');
if(!url)throw Error('Set PAYPAL_WEBHOOK_URL to the stable deployed public endpoint');
const endpoint=new URL(url);
if(endpoint.protocol!=='https:'||!['www.bamswebsitebuilder.com','bamswebsitebuilder.vercel.app'].includes(endpoint.hostname)||
  endpoint.pathname!=='/api/domain-paypal-webhook'||endpoint.search||endpoint.hash)
  throw Error('Expected stable, verified HTTPS domain-paypal-webhook endpoint');
const types=['PAYMENT.CAPTURE.COMPLETED','PAYMENT.CAPTURE.DENIED',
  'PAYMENT.CAPTURE.REFUNDED','PAYMENT.CAPTURE.REVERSED'];
if(!create){
  console.log(JSON.stringify({dryRun:true,webhookUrl:endpoint.href,eventTypes:types,
    next:'Deploy and verify the public sandbox webhook handler before running --create'},null,2));
  process.exit(0);
}
if(!process.env.PAYPAL_CLIENT_ID||!process.env.PAYPAL_CLIENT_SECRET)
  throw Error('Missing protected PayPal Sandbox credentials');
const auth=Buffer.from(process.env.PAYPAL_CLIENT_ID+':'+process.env.PAYPAL_CLIENT_SECRET).toString('base64');
const tokenResponse=await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token',{
  method:'POST',headers:{Authorization:'Basic '+auth,'Content-Type':'application/x-www-form-urlencoded'},
  body:'grant_type=client_credentials',signal:AbortSignal.timeout(15000)});
if(!tokenResponse.ok)throw Error('Sandbox OAuth failed: HTTP '+tokenResponse.status);
const token=(await tokenResponse.json()).access_token;
if(!token)throw Error('Missing access token');
const base='https://api-m.sandbox.paypal.com/v1/notifications/webhooks';
const headers={Authorization:'Bearer '+token,Accept:'application/json'};
const list=await fetch(base,{headers,signal:AbortSignal.timeout(15000)});
if(!list.ok)throw Error('Unable to list webhooks: HTTP '+list.status);
const existing=((await list.json()).webhooks||[]).find(w=>w.url===endpoint.href);
if(existing){
  console.log(JSON.stringify({alreadyExists:true,webhookId:existing.id,url:existing.url},null,2));
  process.exit(0);
}
const response=await fetch(base,{method:'POST',headers:{...headers,'Content-Type':'application/json'},
  body:JSON.stringify({url:endpoint.href,event_types:types.map(name=>({name}))}),
  signal:AbortSignal.timeout(15000)});
if(!response.ok)throw Error('PayPal webhook creation failed: HTTP '+response.status);
const result=await response.json();
if(!result.id)throw Error('PayPal webhook ID missing');
console.log(JSON.stringify({created:true,webhookId:result.id,url:result.url,
  next:'Set PAYPAL_WEBHOOK_ID in Vercel and redeploy. Do not turn on payment flags.'},null,2));
