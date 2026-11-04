// Browser interaction checks with isolated Firebase doubles; production permissions
// are exercised separately in service-agreement-rules.test.mjs against the emulator.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const mock=`
export const auth={currentUser:{uid:'admin',emailVerified:true,getIdToken:async()=>'test-id-token'}},db={};
const records=new Map([['users/admin',{role:'admin'}],['users/client',{role:'client',fullName:'Test Client',email:'client@example.test'}]]);
const listeners=new Map();let authCallback;window.__records=records;window.__failOnce=false;
export function onAuthStateChanged(_auth,callback){authCallback=callback;queueMicrotask(()=>callback(auth.currentUser));}
window.__authAs=async uid=>{auth.currentUser=uid?{uid,emailVerified:true}:null;await authCallback(auth.currentUser);};
export const doc=(base,...parts)=>({path:[base.path,...parts].filter(Boolean).join('/')});
export const collection=doc;
const snap=ref=>({id:ref.path.split('/').at(-1),exists:()=>records.has(ref.path),data:()=>records.get(ref.path)});
export const getDoc=async ref=>snap(ref);
function emit(ref,callback){const docs=[...records].filter(([p])=>p.startsWith(ref.path+'/')&&p.split('/').length===ref.path.split('/').length+1).map(([p])=>snap({path:p}));callback({docs,empty:!docs.length});}
export function onSnapshot(ref,callback){const id=crypto.randomUUID();listeners.set(id,{ref,callback});queueMicrotask(()=>{if(listeners.has(id))emit(ref,callback);});return()=>listeners.delete(id);}
export const serverTimestamp=()=>({seconds:Math.floor(Date.now()/1000),toDate:()=>new Date()});
export const Bytes={fromUint8Array:content=>({toUint8Array:()=>content})};
export async function runTransaction(_db,callback){const writes=[];await callback({get:async ref=>snap(ref),set:(ref,data)=>writes.push([ref.path,data]),update:(ref,data)=>writes.push([ref.path,{...records.get(ref.path),...data}])});for(const [p,data] of writes)records.set(p,data);if(window.__failOnce){window.__failOnce=false;throw Error('Connection lost after commit');}for(const {ref,callback} of [...listeners.values()])emit(ref,callback);}
`;
const server=createServer(async(req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  try{
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname==='/api/jotform-agreements'){
      let body='';for await(const chunk of req)body+=chunk;const action=JSON.parse(body).action;
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify(action==='connection'?{connected:true,formEnabled:true,requiresStaffReview:true}:{submissionId:'1234567890123456789',clientSignaturePresent:true,providerSignaturePresent:false,submittedAt:'TEST ONLY',requiresStaffReview:true}));return;
    }
    if(pathname==='/mock-firebase.js'){res.setHeader('Content-Type','text/javascript');res.end(mock);return;}
    if(pathname==='/js/firebase-config.js'){res.setHeader('Content-Type','text/javascript');res.end("export {auth,db} from '/mock-firebase.js';");return;}
    const filename=path.resolve(root,'.'+decodeURIComponent(pathname));if(!filename.startsWith(root))throw Error('bad path');
    let bytes=await readFile(filename);const ext=path.extname(filename);
    res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.txt':'text/plain'})[ext]||'application/octet-stream');
    if(ext==='.html')bytes=bytes.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</body>',`<script type="module" src="/js/service-agreements.js"></script></body>`);
    res.end(bytes);
  }catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{channel:'msedge'})});
try{
  let completed;
  const page=await browser.newPage({viewport:{width:1280,height:1000}});const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({contentType:'text/javascript',body:`export * from '${url}/mock-firebase.js';`}));
  await page.route('https://form.jotform.com/**',route=>route.fulfill({contentType:'text/html',body:route.request().method()==='POST'?'<p>TEST ONLY: Your submission has been received.</p>':'<form method="POST" action="https://form.jotform.com/test-submit"><label>Test name<input name="testName" required></label><button type="submit">Submit test agreement</button></form>'}));
  for(const prefix of ['','/es']){
    await page.goto(url+prefix+'/admin-dashboard.html');
    await page.waitForFunction(()=>document.getElementById('service-agreement-fields').disabled===false);
    await page.evaluate(()=>{document.body.classList.remove('admin-auth-pending');document.querySelectorAll('.admin-panel').forEach(p=>p.classList.toggle('active',p.id==='client-service-agreements'));});
    assert.equal(await page.locator('[data-panel="client-service-agreements"]').count(),1);
    await page.locator('#service-agreement-assignee').selectOption('client');
    await page.locator('#service-details').fill('Nonbinding UI fixture only — no live agreement');
    await page.locator('[name=reviewed]').check();
    await page.getByRole('button',{name:'Assign agreement',exact:true}).click();
    await page.waitForFunction(()=>document.getElementById('service-agreement-form-status').textContent.includes('Complete the client'));
    const draft=await page.locator('#service-terms').inputValue();
    await page.locator('#service-terms').fill(draft.replace(/\[[^\]\n]*[A-Za-z][^\]\n]*\]/g,'TEST ONLY'));
    await page.evaluate(()=>window.__failOnce=true);
    await page.getByRole('button',{name:'Assign agreement',exact:true}).click();
    await page.waitForFunction(()=>document.getElementById('service-agreement-form-status').textContent.includes('Connection lost'));
    await page.getByRole('button',{name:'Assign agreement',exact:true}).click();
    await page.waitForFunction(()=>document.getElementById('service-agreement-form-status').textContent.includes('Agreement assigned'));
    assert.equal(await page.evaluate(()=>[...window.__records.keys()].filter(p=>p.includes('/serviceAgreements/')).length),1,'retry must not duplicate assignment');
    assert.equal(await page.getByRole('link',{name:'Open agreement in Jotform'}).getAttribute('href'),'https://form.jotform.com/263058308288060');
    await page.getByRole('button',{name:'Show signing document'}).click();
    assert.equal(await page.locator('iframe').getAttribute('src'),'https://form.jotform.com/263058308288060');
    await page.getByLabel('Jotform submission ID').fill('1234567890123456789');
    await page.getByRole('button',{name:'Check Jotform submission'}).click();
    await page.waitForFunction(()=>document.querySelector('.service-jotform-review [role=status]').textContent.includes('Submission found'));
    assert.equal(await page.evaluate(()=>[...window.__records].find(([p])=>p.split('/').length===4&&p.includes('/serviceAgreements/'))[1].status),'assigned','API review must not automatically mark the agreement signed');
    const statusForm=page.locator('.service-status-form');await statusForm.locator('select').selectOption('completed');
    await statusForm.locator('input:not([type])').fill('TEST document ID');await statusForm.locator('input[type=checkbox]').check();
    await statusForm.locator('input[type=file]').setInputFiles({name:'invalid.pdf',mimeType:'application/pdf',buffer:Buffer.from('this is not a PDF')});
    await statusForm.getByRole('button',{name:'Save reviewed status'}).click();
    await page.waitForFunction(()=>document.querySelector('.service-status-form [role=status]').textContent.includes('not a PDF'));
    await statusForm.locator('input[type=file]').setInputFiles({name:'test.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7 TEST ONLY')});
    await statusForm.getByRole('button',{name:'Save reviewed status'}).click();
    await page.getByRole('button',{name:'Download signed PDF'}).waitFor();
    completed=await page.evaluate(()=>[...window.__records].find(([p])=>p.split('/').length===4&&p.includes('/serviceAgreements/'))[1]);
    await page.evaluate(()=>window.__authAs(null));
    assert.equal(await page.locator('#service-agreement-assignee').isDisabled(),true);
    assert.equal(await page.locator('#service-agreement-admin .agreement-card').count(),0);
  }
  await page.goto(url+'/client-portal.html');
  await page.waitForFunction(()=>window.__authAs);
  await page.evaluate(async record=>{
    window.__records.set('users/client/serviceAgreements/signed-test',record);
    window.__records.set('users/client/serviceAgreements/signed-test/documents/signed',{content:{toUint8Array:()=>new TextEncoder().encode('%PDF-1.7 TEST ONLY')}});
    await window.__authAs('client');
  },completed);
  await page.waitForFunction(()=>document.getElementById('service-agreement-client').textContent.includes('Both parties signed'));
  await page.evaluate(()=>{document.querySelectorAll('.portal-panel').forEach(p=>p.classList.toggle('active',p.id==='agreements'));});
  assert.equal(await page.locator('#service-agreement-client').count(),1);
  assert.equal(await page.locator('#client-agreements').count(),1,'existing quote host is preserved');
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download signed PDF'}).click();
  const signedCopy=await downloadPromise;assert.equal(signedCopy.suggestedFilename(),'BAM-signed-signed-test.pdf');
  assert.equal((await readFile(await signedCopy.path())).toString(),'%PDF-1.7 TEST ONLY');
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'client view fits mobile width');
  let popups=0;page.on('popup',()=>popups++);
  for(const prefix of ['','/es'])for(const width of [1280,390]){
    await page.setViewportSize({width,height:844});
    await page.goto(url+prefix+'/client-portal.html');await page.waitForFunction(()=>window.__authAs);
    await page.evaluate(async record=>{
      window.__records.set('users/client/serviceAgreements/pending-test',{...record,status:'assigned'});
      await window.__authAs('client');
      document.querySelectorAll('.portal-panel').forEach(p=>p.classList.toggle('active',p.id==='agreements'));
    },completed);
    await page.locator('#service-agreement-client iframe').waitFor();
    assert.equal(await page.getByRole('link',{name:'Open agreement in Jotform'}).count(),0,'clients have no offsite signing link');
    assert.equal(await page.getByRole('button',{name:'Show signing document'}).count(),0,'client forms open inline automatically');
    const frame=page.frameLocator('#service-agreement-client iframe');
    await frame.getByLabel('Test name').fill('TEST ONLY');const portalUrl=page.url();
    const cannotNavigate=await page.locator('iframe').evaluate(async node=>{
      const allowed=node.sandbox;return !allowed.contains('allow-top-navigation')&&!allowed.contains('allow-top-navigation-by-user-activation')&&!allowed.contains('allow-popups');
    });assert.ok(cannotNavigate);
    await frame.getByRole('button',{name:'Submit test agreement'}).click();
    await frame.getByText('TEST ONLY: Your submission has been received.').waitFor();
    assert.equal(page.url(),portalUrl,'submission confirmation stays inside the portal');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'inline form fits the viewport');
  }
  assert.equal(popups,0,'embedded submission never opens another tab');
  assert.deepEqual(errors,[]);
  console.log('PASS: English/Spanish admin assignment and lookup; private PDF completion; automatic client embedding and contained submission/confirmation on desktop/mobile; no offsite client link, new tab or portal navigation. Firebase/Jotform mocked; no real signing or production writes.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
