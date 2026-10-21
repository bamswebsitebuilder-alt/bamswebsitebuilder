import test from 'node:test';
import assert from 'node:assert/strict';
import {STATES,isServerVerifiedQuote,canSubmitRegistration,sanitizeOrderStatus} from '../lib/domain-order-guards.js';
const now=Date.now();
const quote={id:'request_12345678',domain:'example.com',years:1,currency:'USD',
  amountCents:1999,wholesaleCents:1399,premium:false,registrarVerified:true,expiresAt:now+60000};
test('verified quote with positive spread and short expiration',()=>assert.equal(isServerVerifiedQuote(quote,now),true));
test('reject unverifiable price',()=>assert.equal(isServerVerifiedQuote({...quote,registrarVerified:false},now),false));
test('reject wholesale >= customer price',()=>assert.equal(isServerVerifiedQuote({...quote,wholesaleCents:2000},now),false));
test('reject expired quote',()=>assert.equal(isServerVerifiedQuote({...quote,expiresAt:now-1},now),false));
test('reject unapproved TLD and premium domain',()=>{
  assert.equal(isServerVerifiedQuote({...quote,domain:'example.io'},now),false);
  assert.equal(isServerVerifiedQuote({...quote,premium:true},now),false);
});
const paid={state:STATES.PAID,uid:'uid_1',paypalCaptureId:'CAPTURE123',
  paymentVerified:true,registrantConsent:true,registrarVerified:true,premium:false,
  wholesaleCents:1399,amountCents:1999,registrarOrderId:null,registrationAttemptId:null};
test('allow only fully verified paid registration',()=>assert.equal(canSubmitRegistration(paid),true));
test('reject registration after a previous attempt',()=>assert.equal(canSubmitRegistration({...paid,registrationAttemptId:'attempt_1'}),false));
test('reject missing consent and unpaid orders',()=>{
  assert.equal(canSubmitRegistration({...paid,registrantConsent:false}),false);
  assert.equal(canSubmitRegistration({...paid,state:STATES.CAPTURE_PENDING}),false);
});
test('unknown states require manual review',()=>assert.equal(sanitizeOrderStatus({state:'unknown'}),'manual_review'));
