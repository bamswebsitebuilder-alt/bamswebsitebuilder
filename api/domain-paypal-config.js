// Public metadata for the PayPal Sandbox browser SDK.
// Client IDs are publishable; client secrets are never returned to browsers.
export default function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  const enabled=process.env.VERCEL_ENV!=='production'&&
    process.env.PAYPAL_ENV==='sandbox'&&
    process.env.DOMAIN_ENABLE_SANDBOX_PAYMENTS==='true'&&
    Boolean(process.env.PAYPAL_CLIENT_ID);
  return res.status(200).json(enabled?
    {enabled:true,mode:'sandbox',clientId:process.env.PAYPAL_CLIENT_ID}:
    {enabled:false,mode:'disabled'});
}
