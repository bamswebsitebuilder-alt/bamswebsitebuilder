// Sandbox-only credential verification: does NOT create orders or charge customers.
// Keep this endpoint disabled publicly to avoid making third-party API calls for anonymous requests.
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({message:'Method not allowed'});
  // In production this route never reaches external payment services.
  if(process.env.VERCEL_ENV==='production')return res.status(404).json({message:'Not found'});
  const id=process.env.PAYPAL_CLIENT_ID,secret=process.env.PAYPAL_CLIENT_SECRET;
  if(!id||!secret)return res.status(503).json({configured:false,message:'PayPal sandbox credentials missing.'});
  // Public callers can only see configuration, not use the credentials to hit PayPal.
  return res.status(200).json({configured:true,mode:process.env.PAYPAL_ENV==='sandbox'?'sandbox':'not-sandbox',checkoutEnabled:false,message:'Credentials configured; authentication and checkout must be tested through a protected server-side workflow.'});
}
