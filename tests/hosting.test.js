import test from 'node:test';
import assert from 'node:assert/strict';
import {hostingInput,hostingValues,hostingDue,paypalHostingLink,safeHostingUrl,hostingAgreementId,domainDue} from '../js/hosting-model.js';

const values=()=>({...hostingValues(),plan:'Managed hosting',provider:'Hosting provider',siteUrl:'https://example.test',fee:'25.00'});
test('hosting data validates real dates, bounds, money and safe website links',()=>{
  const input=hostingInput(values());assert.equal(input.feeCents,2500);assert.equal(input.status,'setup');
  for(const patch of [{nextRenewal:'2026-02-30'},{fee:'-2'},{fee:'0'},{fee:'1e6'},{fee:'2.333'},{fee:'100001'},{siteUrl:'javascript:alert(1)'},{siteUrl:'https://user:pass@example.test'},{plan:'a'.repeat(101)},{issues:'a'.repeat(2001)},{status:'online'},{status:'ending',serviceEnds:''}])assert.throws(()=>hostingInput({...values(),...patch}),JSON.stringify(patch));
  assert.equal(hostingInput({...values(),fee:''}).feeCents,null);assert.equal(hostingInput({...values(),nextRenewal:'2028-02-29'}).nextRenewal,'2028-02-29');
  assert.equal(safeHostingUrl('data:text/html,hello'),'');assert.equal(safeHostingUrl('https://example.test'),'https://example.test/');
});
test('recurring checkout requires accepted agreement, exact plan ID, fee and an awaiting state',async()=>{
  const raw={...values(),billingMode:'paypal',paypalPlanId:'P-ABCDE12345',agreementNumber:'1001'};
  const record={...hostingInput(raw),agreementId:await hostingAgreementId('1001'),status:'active',billingStatus:'awaiting-approval'};
  assert.match(paypalHostingLink(record,true),/^https:\/\/www\.paypal\.com\/webapps\/billing\/plans\/subscribe\?plan_id=P-ABCDE12345$/);
  for(const patch of [{billingStatus:'active'},{status:'ending'},{status:'ended'},{feeCents:null},{agreementId:''},{paypalPlanId:'https://phishing.test'}])assert.equal(paypalHostingLink({...record,...patch},true),'');
  assert.equal(paypalHostingLink(record,false),'');assert.throws(()=>hostingInput({...raw,agreementNumber:''}));assert.throws(()=>hostingInput({...raw,agreementNumber:'../another-client'}));
  assert.equal((await hostingAgreementId('1001')).length,64);
});
test('renewals flag overdue and upcoming records without counting ended or distant services',()=>{
  const now=new Date('2026-10-28T12:00:00');
  assert.equal(hostingDue({status:'active',nextRenewal:'2026-10-27'},now).overdue,true);
  assert.equal(hostingDue({status:'active',nextRenewal:'2026-11-12'},now).overdue,false);
  assert.equal(hostingDue({status:'active',nextRenewal:'2027-01-01'},now),null);
  assert.equal(hostingDue({status:'ended',nextRenewal:'2026-10-27'},now),null);
});

test('domain details round-trip independently of hosting and reject invalid names or unsafe registrar links',()=>{
  const input=hostingInput({...values(),domainName:'SHOP.Example.COM',domainRegistrar:'Example registrar',domainRenewal:'2028-02-29',domainManageUrl:'https://registrar.example/account'});
  assert.equal(input.domainName,'shop.example.com');assert.equal(input.domainRegistrar,'Example registrar');assert.equal(hostingValues(input).domainRenewal,'2028-02-29');
  for(const patch of [{domainName:'https://example.com'},{domainName:'example.com/path'},{domainName:'bad-.com'},{domainName:'127.0.0.1'},{domainName:'a'.repeat(64)+'.com'},{domainRenewal:'2027-02-29'},{domainManageUrl:'javascript:alert(1)'},{domainManageUrl:'https://user:secret@registrar.example'}])assert.throws(()=>hostingInput({...values(),...patch}));
  assert.equal(hostingInput({...values(),domainName:'xn--bcher-kva.de'}).domainName,'xn--bcher-kva.de');
  assert.equal(hostingValues({plan:'Old hosting record'}).domainName,'');assert.equal(hostingInput(values()).domainRenewal,'');
  assert.equal(domainDue({status:'ended',domainRenewal:'2026-10-27'},new Date('2026-10-28T12:00:00Z')).overdue,true);
});
