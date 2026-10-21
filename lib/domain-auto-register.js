// Background-only sandbox domain fulfillment. Never expose as a public route.
// Registration begins only after an authenticated PayPal capture was verified,
// the order has consent, and a Firestore transaction acquired a one-time lock.
import {randomBytes} from 'node:crypto';
import {FieldValue} from 'firebase-admin/firestore';
import {domainOrderDatabase} from './domain-firebase.js';
import {STATES} from './domain-order-guards.js';
import {acquireRegistrationAttempt} from './domain-fulfillment.js';
import {getSandboxDomainQuoteData,createSandboxRegistrarCustomer,
  createSandboxRegistrarContact,registerSandboxDomain} from './domain-registrar.js';
function numericId(value){
  const id=String(value??'');
  if(!/^[1-9][0-9]{0,17}$/.test(id))throw Error('Unexpected registrar identifier');
  return id;
}
function nameservers(){
  const ns=[process.env.DOMAIN_DEFAULT_NS_1,process.env.DOMAIN_DEFAULT_NS_2];
  if(ns.some(x=>!x||!/^([a-z0-9-]+\.)+[a-z]{2,63}$/.test(x)))throw Error('Nameservers not configured');
  return ns;
}
export async function fulfillSandboxPaidDomain(orderId){
  if(process.env.VERCEL_ENV==='production'||
     process.env.DOMAIN_ENABLE_SANDBOX_REGISTRATION!=='true'||
     process.env.DOMAIN_ENABLE_SANDBOX_PAYMENTS!=='true')
    throw Error('Sandbox fulfillment disabled');
  const ns=nameservers(),db=domainOrderDatabase();
  const ref=db.collection('domainOrders').doc(orderId);
  const snapshot=await ref.get();
  if(!snapshot.exists)throw Error('Order missing');
  const order=snapshot.data();
  if(order.state!==STATES.PAID||!order.registrant||!order.registrantConsent)
    throw Error('Order is not paid or missing registrant consent');
  const attemptId=await acquireRegistrationAttempt({orderId});
  try{
    const price=await getSandboxDomainQuoteData(order.domain);
    if(price.wholesaleCents>order.wholesaleCents||
       price.wholesaleCents>=order.amountCents-300||
       !price.registrarVerified||price.premium)
      throw Error('Domain registrar cost or availability changed');
    const customer=order.registrant;
    const suffix=orderId.replace(/-/g,'').slice(0,18);
    const username='bam-domain-'+suffix;
    const password=randomBytes(32).toString('base64url')+'Z9!';
    const newCustomer=await createSandboxRegistrarCustomer({
      username,password,name:customer.name,company:customer.company||customer.name,
      addressLine1:customer.addressLine1,city:customer.city,
      country:customer.country,zipcode:customer.zipcode,
      phoneCountryCode:customer.phoneCountryCode,phone:customer.phone
    });
    const customerId=numericId(newCustomer.customerId);
    await ref.update({registrarCustomerId:customerId,updatedAt:FieldValue.serverTimestamp()});
    const contact=await createSandboxRegistrarContact({
      customerId,name:customer.name,email:customer.email,
      addressLine1:customer.addressLine1,city:customer.city,
      country:customer.country,zipcode:customer.zipcode,
      phoneCountryCode:customer.phoneCountryCode,phone:customer.phone
    });
    const contactId=numericId(contact.contactId??contact.value);
    await ref.update({registrarContactId:contactId,updatedAt:FieldValue.serverTimestamp()});
    const receipt=await registerSandboxDomain({
      domain:order.domain,years:1,customerId,
      regContactId:contactId,adminContactId:contactId,
      techContactId:contactId,billingContactId:contactId,ns
    });
    const registrarOrderId=numericId(receipt.orderId??receipt.order_id);
    // A submitted order isn't proof of completed registration.
    await db.runTransaction(async tx=>{
      const snap=await tx.get(ref);
      if(!snap.exists||snap.data().state!==STATES.REGISTERING||
         snap.data().registrationAttemptId!==attemptId)throw Error('Attempt mismatch');
      tx.update(ref,{registrarOrderId,state:STATES.REGISTERING,
        registrarSubmittedAt:FieldValue.serverTimestamp(),
        updatedAt:FieldValue.serverTimestamp()});
    });
    return {orderId,registrarOrderId,status:'registration_submitted'};
  }catch{
    // Do not automatically retry: an external registrar write might have succeeded.
    await db.runTransaction(async tx=>{
      const snap=await tx.get(ref);
      if(snap.exists&&snap.data().registrationAttemptId===attemptId)
        tx.update(ref,{state:STATES.REVIEW,updatedAt:FieldValue.serverTimestamp()});
    });
    return {orderId,status:STATES.REVIEW};
  }
}
