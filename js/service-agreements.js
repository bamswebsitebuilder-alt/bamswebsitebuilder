import {auth,db} from './firebase-config.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import {collection,doc,getDoc,onSnapshot,runTransaction,serverTimestamp,Bytes} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';
import {JOTFORM_ASSIGNMENT_VERSION,JOTFORM_ASSIGNMENT_NOTICE,STATUS_LABELS,signingUrl,canTransition,pdfBytes} from './service-agreement-model.js?v=20261105-form-only-1';
import {serviceAgreementConfig as config} from './service-agreement-config.js';
import {showJotformConnection,addJotformReview} from './jotform-admin.js?v=1';

const adminHost=document.getElementById('service-agreement-admin');
const clientHost=document.getElementById('service-agreement-client');
const notices=document.getElementById('service-agreement-notices');
const assignmentForm=document.getElementById('service-agreement-form');
if(assignmentForm)assignmentForm.onsubmit=event=>event.preventDefault();
let generation=0,stops=[],currentUser=null;
const activityByClient=new Map();
const publishActivity=()=>window.dispatchEvent(new CustomEvent('bam:service-agreements-updated',{detail:[...activityByClient.values()].flat()}));
const element=(tag,text,className)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node;};
const message=(host,text)=>{host.replaceChildren(element('p',text));};
function button(host,label,action){const b=element('button',label,'admin-small-button portal-secondary-button');b.type='button';host.append(b);b.addEventListener('click',async()=>{b.disabled=true;try{await action();}catch(error){let status=host.querySelector('.service-error');if(!status){status=element('p','','service-error');status.setAttribute('role','alert');host.append(status);}status.textContent=error.message||'This action could not be completed.';}finally{b.disabled=false;}});return b;}
function download(bytes,name,type){const url=URL.createObjectURL(new Blob([bytes],{type}));const link=element('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function userStillActive(user){if(auth.currentUser?.uid!==user.uid||currentUser?.uid!==user.uid)throw new Error('Please sign in again.');}

function renderCard(host,record,user,admin){
  const card=element('article','','agreement-card');host.append(card);
  card.append(element('h3',record.title));const summary=element('div','','service-agreement-summary');summary.append(element('span',record.clientName,'service-client-name'),element('span',STATUS_LABELS[record.status] || 'Unknown status','service-status-pill'));card.append(summary);if(record.projectPricing){const price=element('div','','service-price-summary');for(const [label,value] of [['Project total',record.projectPricing.total],['Initial payment',record.projectPricing.initial],['Remaining balance',record.projectPricing.remaining],['Recurring fee',record.projectPricing.recurring]]){if(value===null||value===undefined)continue;const item=element('div','','service-price-item');item.append(element('span',label),element('strong',new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value)));price.append(item);}card.append(price);}
  const updated=record.updatedAt?.toDate?.();
  card.append(element('p',`${updated?'Updated '+updated.toLocaleDateString()+'. ':''}Signing status is confirmed after BAM verifies the signatures.`,'service-muted'));
  if(record.evidence)card.append(element('p','Signing reference: '+record.evidence));
  if(record.assignmentType!=='jotform'){
    const details=element('details');details.append(element('summary','Read agreement and project details'),element('pre',record.termsText,'service-agreement-text'));card.append(details);
    button(card,'Download agreement text',()=>download(record.termsText,`BAM-agreement-${record.id}.txt`,'text/plain;charset=utf-8'));
  }
  if(['assigned','client_signed'].includes(record.status)){
    let url='';try{url=signingUrl(record.signingUrl);}catch{}
    if(url){
      const showSigningDocument=()=>{
        if(card.querySelector('iframe'))return;
        const frame=element('iframe');frame.id='JotFormIFrame-'+record.id;frame.src=url;frame.title="Bam's Website Builder Agreement";frame.referrerPolicy='no-referrer';frame.className='service-sign-frame';
        frame.loading='lazy';
        // Keep form submission, its thank-you screen and links inside the portal.
        // The frame cannot navigate the parent page or open another browser tab.
        frame.setAttribute('sandbox','allow-forms allow-scripts allow-same-origin allow-downloads');card.append(frame);
      };
      if(admin){
        const link=element('a','Open agreement in Jotform','portal-secondary-button');link.href=url;link.target='_blank';link.rel='noopener noreferrer';card.append(link);
        // Show the same assigned Jotform inside the admin portal as in the client portal.
        // An external Jotform review link remains available for staff.
        if(config.displayMode==='embed')showSigningDocument();
      }else{
        card.append(element('h4','Review and sign'),element('p','Review the agreement and sign below. BAM will verify the signatures before marking it complete.'));
        showSigningDocument();
      }
    }else card.append(element('p','Signing is not configured for this agreement. Contact BAM for your signing invitation.'));
    card.append(element('p','BAM reviews submitted signatures and publishes the completed copy after confirming both parties signed.'));
  }
  const reference=doc(db,'users',record.uid,'serviceAgreements',record.id);
  if(record.status==='completed')button(card,'Download signed PDF',async()=>{
    userStillActive(user);
    const snapshot=await getDoc(doc(reference,'documents','signed'));
    if(!snapshot.exists())throw new Error('The signed PDF is unavailable. Contact BAM.');
    userStillActive(user);
    download(snapshot.data().content.toUint8Array(),`BAM-signed-${record.id}.pdf`,'application/pdf');
  });
  if(admin && ['assigned','client_signed'].includes(record.status)){
    const form=element('form','','service-status-form');
    const label=element('label','Update signing status');const select=element('select');
    for(const [value,text] of Object.entries(STATUS_LABELS)){if(canTransition(record.status,value)){const o=element('option',text);o.value=value;select.append(o);}}label.append(select);
    const evidenceLabel=element('label','Jotform document/reference ID or cancellation reason');const evidence=element('input');evidence.required=true;evidence.maxLength=500;evidenceLabel.append(evidence);
    const fileLabel=element('label','Completed PDF (required for both parties signed; max 700 KiB)');const file=element('input');file.type='file';file.accept='application/pdf,.pdf';fileLabel.append(file);
    const confirmLabel=element('label');const confirm=element('input');confirm.type='checkbox';confirm.required=true;confirmLabel.append(confirm,document.createTextNode(' I reviewed the signing record. For completion, I verified both the client and BAM representative signatures, dates, and agreement text.'));
    const submit=element('button','Save reviewed status','admin-primary-button');submit.type='submit';const status=element('p');status.setAttribute('role','status');
    form.append(label,evidenceLabel,fileLabel,confirmLabel,submit,status);card.append(form);
    addJotformReview(form,record,user,evidence,()=>auth.currentUser?.uid===user.uid&&currentUser?.uid===user.uid);
    form.addEventListener('submit',async event=>{
      event.preventDefault();submit.disabled=true;
      try{
        userStillActive(user);if(!confirm.checked||!evidence.value.trim())throw new Error('Review the signing record and enter its reference.');
        const next=select.value;const content=next==='completed'?Bytes.fromUint8Array(await pdfBytes(file.files[0])):null;
        await runTransaction(db,async transaction=>{
          const snapshot=await transaction.get(reference);if(!snapshot.exists()||!canTransition(snapshot.data().status,next))throw new Error('Status changed. Refresh and review this agreement.');
          if(content)transaction.set(doc(reference,'documents','signed'),{content,uploadedAt:serverTimestamp(),uploadedBy:user.uid});
          transaction.update(reference,{status:next,evidence:evidence.value.trim(),updatedAt:serverTimestamp(),updatedBy:user.uid});
        });
        status.textContent='Status saved. The client portal updates automatically.';
      }catch(error){status.textContent=error.message;}finally{submit.disabled=false;}
    });
  }
}

function watchRecords(uid,host,user,admin,epoch){
  let initialized=false;const previous=new Map();
  return onSnapshot(collection(db,'users',uid,'serviceAgreements'),snapshot=>{
    if(epoch!==generation)return;
    host.replaceChildren();
    if(admin){activityByClient.set(uid,snapshot.docs.map(item=>({id:item.id,uid,...item.data()})));publishActivity();}
    if(snapshot.empty)message(host,admin?'No agreements yet.':'No agreements assigned yet. You will see them here when they are ready.');
    snapshot.docs.sort((a,b)=>(b.data().createdAt?.seconds||0)-(a.data().createdAt?.seconds||0)).forEach(item=>{
      const record={...item.data(),id:item.id,uid};
      renderCard(host,record,user,admin);
      if(initialized && previous.get(item.id)!==record.status && notices){
        notices.textContent=`${record.clientName}: ${record.title} — ${STATUS_LABELS[record.status]}`;
        if('Notification' in window && Notification.permission==='granted')new Notification('BAM client agreement update',{body:record.title+' — '+STATUS_LABELS[record.status]});
      }
      previous.set(item.id,record.status);
    });
    initialized=true;
  },()=>{if(epoch===generation)message(host,'Agreements could not be loaded. Contact BAM or refresh after signing in.');});
}

async function setupAdmin(user,epoch){
  const form=document.getElementById('service-agreement-form'),select=document.getElementById('service-agreement-assignee'),status=document.getElementById('service-agreement-form-status');
  let clientStops=[];stops.push(()=>clientStops.splice(0).forEach(stop=>stop()));
  void showJotformConnection(form,user,()=>epoch===generation&&currentUser?.uid===user.uid);
  const preview=document.getElementById('service-agreement-preview');
  function refreshPreview(){
    if(!preview)return;
    let url='';try{url=signingUrl(form.elements.signing.value||config.defaultSigningUrl);}catch{message(preview,'Enter a valid HTTPS Jotform invitation link to preview the form.');return;}
    if(!url){message(preview,'Add a Jotform invitation link to display the agreement form.');return;}
    if(preview.querySelector('iframe')?.getAttribute('src')===url)return;
    const frame=element('iframe');frame.src=url;frame.title='Agreement form preview';frame.referrerPolicy='no-referrer';frame.className='service-sign-frame';
    frame.setAttribute('sandbox','allow-forms allow-scripts allow-same-origin allow-downloads');
    preview.replaceChildren(frame);
  }
  refreshPreview();
  form.elements.signing.addEventListener('change',refreshPreview);
  stops.push(()=>{form.elements.signing.removeEventListener('change',refreshPreview);preview?.replaceChildren();});
  document.getElementById('service-agreement-fields').disabled=false;
  stops.push(onSnapshot(collection(db,'users'),snapshot=>{
    if(epoch!==generation)return;
    activityByClient.clear();publishActivity();
    clientStops.splice(0).forEach(stop=>stop());adminHost.replaceChildren();
    const old=select.value;select.replaceChildren(new Option('Choose a client',''));
    snapshot.docs.filter(item=>item.data().role==='client').forEach(item=>{
      const client=item.data();select.append(new Option(client.fullName||client.email||item.id,item.id));
      const group=element('section');adminHost.append(group);group.append(element('h3',client.fullName||client.email||item.id));const records=element('div');group.append(records);
      clientStops.push(watchRecords(item.id,records,user,true,epoch));
    });select.value=old;
  },()=>message(adminHost,'Client list could not be loaded. Check administrator access.')));
  const id=()=>crypto.randomUUID();let assignmentId=id();let issuing=false;
  form.onsubmit=async event=>{
    event.preventDefault();if(issuing)return;issuing=true;
    const controls=[...form.querySelectorAll('input,select,textarea,button')];controls.forEach(c=>c.disabled=true);
    try{
      userStillActive(user);const uid=select.value;if(!uid)throw new Error('Choose a client.');
      const profile=await getDoc(doc(db,'users',uid));if(!profile.exists()||profile.data().role!=='client')throw new Error('Client account is unavailable.');
      const title=form.elements.title.value.trim();
      if(!title)throw new Error('Enter a form title.');
      const signing=signingUrl(form.elements.signing.value||config.defaultSigningUrl);
      if(!signing)throw new Error('Add the Jotform link before assigning.');
      const reference=doc(db,'users',uid,'serviceAgreements',assignmentId);
      const record={assignmentType:'jotform',title,clientName:profile.data().fullName||profile.data().email||uid,projectPricing:null,termsVersion:JOTFORM_ASSIGNMENT_VERSION,termsText:JOTFORM_ASSIGNMENT_NOTICE,signingUrl:signing,status:'assigned',evidence:'',createdBy:user.uid,createdAt:serverTimestamp(),updatedBy:user.uid,updatedAt:serverTimestamp()};
      await runTransaction(db,async transaction=>{
        const existing=await transaction.get(reference);
        if(existing.exists()){
          const saved=existing.data();if(['assignmentType','title','clientName','projectPricing','termsVersion','termsText','signingUrl'].some(key=>JSON.stringify(saved[key])!==JSON.stringify(record[key])))throw new Error('An earlier assignment may have saved. Reload before assigning different details.');
          return;
        }transaction.set(reference,record);
      });
      assignmentId=id();form.reset();refreshPreview();status.textContent='Form assigned. The client can complete it in My Agreements. Signing status requires staff review.';
    }catch(error){status.textContent=error.message;}finally{issuing=false;controls.forEach(c=>c.disabled=false);}
  };
  stops.push(()=>{form.onsubmit=event=>event.preventDefault();document.getElementById('service-agreement-fields').disabled=true;form.reset();});
}

onAuthStateChanged(auth,async user=>{
  const epoch=++generation;stops.splice(0).forEach(stop=>stop());currentUser=user;
  activityByClient.clear();publishActivity();
  if(adminHost)document.getElementById('service-agreement-fields').disabled=true;
  if(adminHost)message(adminHost,'Sign in as an administrator to manage agreements.');
  if(clientHost)message(clientHost,'Sign in with your verified account to view agreements.');
  if(notices)notices.textContent='';
  document.getElementById('jotform-connection-status')?.remove();
  if(!user)return;
  try{
    if(adminHost){const profile=await getDoc(doc(db,'users',user.uid));if(epoch!==generation)return;if(profile.data()?.role==='admin')await setupAdmin(user,epoch);}
    if(clientHost&&user.emailVerified)stops.push(watchRecords(user.uid,clientHost,user,false,epoch));
  }catch{if(epoch===generation)message(adminHost||clientHost,'Agreement access could not be checked. Please sign in again.');}
});
