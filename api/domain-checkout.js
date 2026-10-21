// Intentionally disabled until Firebase-authenticated server-side quoting,
// PayPal capture verification, and registrar fulfillment are implemented.
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Allow','POST');
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  return res.status(503).json({checkoutEnabled:false,error:'Domain purchases are not available yet. No payment was created.'});
}
