import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {signingUrl,canTransition,pdfBytes,MAX_PDF_BYTES} from '../js/service-agreement-model.js';
test('Jotform URL validation excludes script, lookalike, credential and insecure URLs',()=>{
  assert.equal(signingUrl(''), '');
  for(const url of ['https://www.jotform.com/sign/123','https://eu.jotform.com/sign/123?token=recipient'])assert.equal(signingUrl(url),url);
  for(const url of ['javascript:alert(1)','http://jotform.com/sign/x','https://jotform.com.evil.test/x','https://evil.test/jotform.com','https://user:pass@jotform.com/sign/x','https://jotform.com:8443/sign/x'])assert.throws(()=>signingUrl(url));
});
test('manual signing status is forward only and terminal records remain fixed',()=>{
  assert.ok(canTransition('assigned','client_signed'));assert.ok(canTransition('assigned','completed'));assert.ok(canTransition('client_signed','completed'));assert.ok(canTransition('assigned','cancelled'));
  for(const [from,to] of [['completed','assigned'],['cancelled','completed'],['client_signed','assigned'],['assigned','assigned'],['assigned','accepted']])assert.equal(canTransition(from,to),false);
});
test('PDF validation checks size and magic bytes before persistence',async()=>{
  const bytes=new TextEncoder().encode('%PDF-1.7 test');
  assert.deepEqual(await pdfBytes({size:bytes.length,arrayBuffer:async()=>bytes.buffer}),bytes);
  await assert.rejects(()=>pdfBytes(null));await assert.rejects(()=>pdfBytes({size:MAX_PDF_BYTES+1}));
  await assert.rejects(()=>pdfBytes({size:20,arrayBuffer:async()=>new TextEncoder().encode('<html>not PDF').buffer}));
});
test('the recovered draft retains every section, both signatures and separate portfolio consent',()=>{
  const text=fs.readFileSync(new URL('../js/client-service-agreement-v1.txt',import.meta.url),'utf8');
  for(let section=1;section<=18;section++)assert.match(text,new RegExp('### '+section+'\\.'));
  for(const term of ['BAM’S WEBSITE BUILDER LLC','[Client Signature]','[Provider Signature]','Optional Portfolio Permission','Electronic Records Consent'])assert.ok(text.includes(term));
});
