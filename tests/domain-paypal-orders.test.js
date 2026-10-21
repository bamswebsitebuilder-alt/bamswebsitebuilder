import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyCompletedCapture} from '../lib/domain-paypal-orders.js';
const quote={id:'quote_12345678',amountCents:2499};
function completed(){return {status:'COMPLETED',purchase_units:[{reference_id:quote.id,amount:{currency_code:'USD',value:'24.99'},payments:{captures:[{id:'CAPTURE123',status:'COMPLETED',amount:{currency_code:'USD',value:'24.99'}}]}}]};}
test('valid completed capture matches stored immutable quote',()=>assert.equal(verifyCompletedCapture(completed(),quote),true));
test('reject pending order',()=>{const x=completed();x.status='APPROVED';assert.equal(verifyCompletedCapture(x,quote),false)});
test('reject incorrect captured amount',()=>{const x=completed();x.purchase_units[0].payments.captures[0].amount.value='2.49';assert.equal(verifyCompletedCapture(x,quote),false)});
test('reject mismatched purchase reference',()=>{const x=completed();x.purchase_units[0].reference_id='otherquote';assert.equal(verifyCompletedCapture(x,quote),false)});
test('reject duplicate captures',()=>{const x=completed();x.purchase_units[0].payments.captures.push({...x.purchase_units[0].payments.captures[0],id:'SECOND'});assert.equal(verifyCompletedCapture(x,quote),false)});
test('reject malformed quote',()=>assert.equal(verifyCompletedCapture(completed(),{id:'bad',amountCents:2499}),false));
