// Server-side PayPal OAuth helper. Never import into browser-side code.
// No customer charges are made by this module.
export async function paypalAccessToken() {
  if (process.env.PAYPAL_ENV !== 'sandbox') throw new Error('PayPal sandbox required');
  const id = process.env.PAYPAL_CLIENT_ID, secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error('PayPal credentials missing');
  const encoded = Buffer.from(id + ':' + secret).toString('base64');
  const response = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {'Authorization':'Basic '+encoded,'Content-Type':'application/x-www-form-urlencoded'},
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error('PayPal sandbox authentication failed (HTTP '+response.status+')');
  const result = await response.json();
  if (!result.access_token || result.token_type?.toLowerCase() !== 'bearer') throw new Error('Unexpected PayPal OAuth response');
  return result.access_token;
}
