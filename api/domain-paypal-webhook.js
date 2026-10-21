// PayPal webhook endpoint. Deliberately audit-only and fail-closed.
// Until a trusted Sandbox webhook ID and Sandbox OAuth credentials are
// configured, no events are accepted. Never triggers a charge or registration.
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method==='GET')return res.status(200).json({
    endpoint:'paypal-domain-webhook',reachable:true,
    configured:Boolean(process.env.PAYPAL_WEBHOOK_ID&&process.env.PAYPAL_CLIENT_ID&&process.env.PAYPAL_CLIENT_SECRET),
    processing:'disabled'
  });
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).end();}
  if(process.env.PAYPAL_ENV!=='sandbox'||!process.env.PAYPAL_WEBHOOK_ID||
     !process.env.PAYPAL_CLIENT_ID||!process.env.PAYPAL_CLIENT_SECRET)
    return res.status(503).json({error:'Webhook verification not configured'});
  // No payload is ever trusted without PayPal signature verification.
  // Verification handler will be deployed separately after IDs are configured.
  return res.status(503).json({error:'Webhook processing is not activated'});
}
