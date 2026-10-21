// Creates a server-generated, short-lived, one-year sandbox checkout quote.
// The browser cannot provide the total or wholesale cost.
import {randomUUID} from 'node:crypto';
import {FieldValue} from 'firebase-admin/firestore';
import {domainOrderDatabase} from './domain-firebase.js';
import {getSandboxDomainQuoteData} from './domain-registrar.js';
import {isServerVerifiedQuote,STATES} from './domain-order-guards.js';
export const CUSTOMER_REGISTRATION_CENTS=Object.freeze({
  com:1999,net:2299,org:2499,co:4999
});
function clean(value,limit){
  if(typeof value!=='string')throw Error('Missing registrant information');
  const result=value.trim();
  if(!result||result.length>limit)throw Error('Invalid registrant information');
  return result;
}
function validatedRegistrant(data){
  if(!data||typeof data!=='object')throw Error('Registrant information required');
  const details={
    name:clean(data.name,100),email:clean(data.email,180),
    addressLine1:clean(data.addressLine1,150),city:clean(data.city,90),
    country:clean(data.country,2).toUpperCase(),zipcode:clean(data.zipcode,30),
    phoneCountryCode:clean(data.phoneCountryCode,4),phone:clean(data.phone,25)
  };
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)||
     !/^[A-Z]{2}$/.test(details.country)||
     !/^\d{1,4}$/.test(details.phoneCountryCode)||
     !/^[+0-9() .-]{7,25}$/.test(details.phone))
    throw Error('Invalid email, country or phone');
  return details;
}
export async function issueSandboxVerifiedQuote({uid,domain,registrant,termsAccepted}){
  if(process.env.VERCEL_ENV==='production'||process.env.RESELLERCLUB_ENV!=='sandbox')
    throw Error('Sandbox only');
  if(typeof uid!=='string'||!uid)throw Error('Sign in required');
  if(termsAccepted!==true)throw Error('Registrant consent required');
  const lower=String(domain||'').trim().toLowerCase();
  const ext=lower.split('.').at(-1);
  const amountCents=CUSTOMER_REGISTRATION_CENTS[ext];
  if(!amountCents)throw Error('Unsupported domain');
  const registrantData=validatedRegistrant(registrant);
  const quoteData=await getSandboxDomainQuoteData(lower);
  // Reserve room for gateway fees and processing overhead, excluding taxes.
  if(amountCents-quoteData.wholesaleCents<300)throw Error('Quote is below minimum price margin');
  const id=randomUUID(), expiresAt=Date.now()+10*60*1000;
  const quote={id,domain:lower,uid,years:1,currency:'USD',amountCents,
    wholesaleCents:quoteData.wholesaleCents,registrarVerified:true,
    premium:false,expiresAt,registrantConsent:true,
    registrant:registrantData,state:STATES.QUOTED};
  if(!isServerVerifiedQuote(quote))throw Error('Quote not valid');
  await domainOrderDatabase().collection('domainOrders').doc(id).create({
    ...quote,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp(),
    paypalOrderId:null,paypalCaptureId:null,registrarOrderId:null,registrationAttemptId:null,
    paymentVerified:false
  });
  return {id,domain:lower,amountCents,currency:'USD',years:1,expiresAt,
    renewalPriceCents:{com:2199,net:2499,org:2299,co:5499}[ext],
    message:'Sandbox quote only; purchase and domain registration are disabled until testing is complete.'};
}
