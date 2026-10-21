// Pure domain checkout state guards. Importable in server-side order handlers.
// No third-party charge or registrar write occurs here.
export const STATES=Object.freeze({
  REQUESTED:'quote_requested',QUOTED:'quote_verified',PAYPAL_CREATED:'paypal_created',
  CAPTURE_PENDING:'capture_pending',PAID:'payment_verified',
  REGISTERING:'registration_submitted',ACTIVE:'registered',
  REVIEW:'manual_review',REFUNDED:'refunded'
});
export function isServerVerifiedQuote(quote, now=Date.now()){
  if(!quote||typeof quote.id!=='string'||!/^[-_A-Za-z0-9]{8,64}$/.test(quote.id))return false;
  if(!/^[a-z0-9-]+\.(com|net|org|co)$/.test(quote.domain||''))return false;
  if(quote.years!==1||quote.currency!=='USD'||!Number.isSafeInteger(quote.amountCents)||quote.amountCents<=0)return false;
  if(!Number.isSafeInteger(quote.wholesaleCents)||quote.wholesaleCents<=0)return false;
  if(quote.amountCents<=quote.wholesaleCents||quote.premium===true||quote.registrarVerified!==true)return false;
  if(!Number.isFinite(quote.expiresAt)||quote.expiresAt<=now||quote.expiresAt>now+15*60*1000)return false;
  return true;
}
export function canSubmitRegistration(order){
  return Boolean(order&&order.state===STATES.PAID&&
    typeof order.uid==='string'&&order.uid.length>0&&
    typeof order.paypalCaptureId==='string'&&order.paypalCaptureId.length>0&&
    order.paymentVerified===true&&order.registrantConsent===true&&
    order.registrarVerified===true&&order.premium!==true&&
    Number.isSafeInteger(order.wholesaleCents)&&order.wholesaleCents>0&&
    Number.isSafeInteger(order.amountCents)&&order.amountCents>order.wholesaleCents&&
    !order.registrarOrderId&&!order.registrationAttemptId);
}
export function sanitizeOrderStatus(order){
  const allowed=['quote_requested','quote_verified','paypal_created','capture_pending','payment_verified','registration_submitted','registered','manual_review','refunded'];
  return allowed.includes(order?.state)?order.state:'manual_review';
}
