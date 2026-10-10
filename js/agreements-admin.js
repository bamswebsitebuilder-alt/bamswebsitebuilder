import {db} from './firebase-config.js';
import {collection,doc,onSnapshot,runTransaction,serverTimestamp,Timestamp} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';
import {TERMS_VERSION,validateQuote,downloadAgreement} from './agreement-model.js?v=1';
import {renderAgreement} from './agreement-view.js?v=1';
import {prepareAgreementDraft,quoteMatches} from './agreement-draft.js?v=1';

export function createAdminAgreements(getAdmin,getProject=()=>({})) {
  const form=document.getElementById('agreement-form');if(!form)return null;
  const select=document.getElementById('agreement-client');const host=document.getElementById('admin-agreements');
  const status=document.getElementById('agreement-form-status');const preview=document.getElementById('agreement-preview');
  const es=document.documentElement.lang.startsWith('es');const t=(en,spanish)=>es?spanish:en;
  let clients=[],stop=()=>{},terms,activeClient='',previewTimer,previewVersion=0;
  const drafts=new Map();
  const projectTitles=new Map();
  let draftOwner='';
  const fields=['number','provider','project','language','amount','payments','delivery','revisions','scope','costs','variations','plan','payment'];
  const field=id=>document.getElementById('agreement-'+id);
  const issueButton=form.querySelector('button[type=submit]');
  const capture=()=>Object.fromEntries(fields.map(id=>[id,field(id).value]));
  function persist(){try{if(draftOwner)sessionStorage.setItem('bam-agreement-drafts-'+draftOwner,JSON.stringify([...drafts]));}catch{}}
  function remember(){if(activeClient){drafts.set(activeClient,{...capture(),issued:issueButton.dataset.issued==='true'});persist();}}
  function restore(){
    const owner=getAdmin()?.uid||'';if(owner===draftOwner)return;draftOwner=owner;drafts.clear();
    try{const saved=JSON.parse(sessionStorage.getItem('bam-agreement-drafts-'+owner)||'[]');for(const [id,draft] of saved){if(typeof id==='string'&&draft&&fields.every(key=>typeof draft[key]==='string'))drafts.set(id,draft);}}catch{}
  }
  function fill(draft){fields.forEach(id=>{field(id).value=draft[id] ?? '';});}
  function number(){return `BAM-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;}
  function prepare(fresh=false){
    previewVersion++;clearTimeout(previewTimer);preview.hidden=true;
    if(activeClient && !fresh)remember();
    activeClient=select.value;
    const draft=!fresh&&drafts.get(activeClient);
    fill(draft||prepareAgreementDraft({project:getProject(activeClient),language:es?'es':'en',quoteNumber:activeClient?number():''}));
    if(!draft)projectTitles.set(activeClient,field('project').value);
    issueButton.dataset.issued=String(draft?.issued===true);issueButton.disabled=!activeClient||draft?.issued===true;
    remember();
    status.textContent=draft?.issued?t('This draft has been issued. Start a new draft to change the quote.','Este borrador ya se emitió. Crea otro para cambiar la cotización.'):activeClient?t('Draft prepared. Choose a package or enter a custom quote, then confirm the exact scope and outside costs. Approve to place it in the client portal.','Borrador preparado. Elige un paquete o una cotización personalizada y confirma el alcance y los costos externos. Aprueba para publicarlo en el portal.') : t('Choose a client to prepare an agreement.','Elige un cliente para preparar un acuerdo.');
  }
  function applyPlan(){
    const current=capture();
    if(!activeClient)return;
    const draft=prepareAgreementDraft({project:{title:current.project},plan:current.plan,payment:current.payment,language:current.language,quoteNumber:current.number});
    fill({...draft,provider:current.provider,scope:current.scope,costs:current.costs,variations:current.variations});
    automaticPreview();
  }
  function automaticPreview(){
    remember();
    const version=++previewVersion;clearTimeout(previewTimer);
    if(issueButton.dataset.issued==='true')return;
    preview.hidden=true;
    status.textContent=t('Updating the draft preview…','Actualizando la vista previa…');
    previewTimer=setTimeout(async()=>{
      try{const quote=await readQuote();if(version!==previewVersion)return;renderAgreement(preview,quote,null,{es,download:()=>downloadAgreement(quote,null)});preview.hidden=false;status.textContent=t('Draft ready for review. Approve and issue to make it available to this client.','Borrador listo. Revisa y aprueba para emitirlo al cliente.');}
      catch{if(version===previewVersion){preview.hidden=true;status.textContent=t('Complete the quote details to generate the preview automatically. Nothing has been issued.','Completa la cotización para generar la vista previa. No se ha emitido nada.');}}
    },300);
  }
  field('plan').addEventListener('change',applyPlan);
  [field('payment'),field('language')].forEach(control=>control.addEventListener('change',()=>field('plan').value?applyPlan():automaticPreview()));
  form.addEventListener('input',automaticPreview);
  document.getElementById('agreement-new-draft').addEventListener('click',()=>prepare(true));
  function updateProject(project){
    if(project?.userId!==activeClient||issueButton.dataset.issued==='true')return;
    if(!field('project').value||field('project').value===projectTitles.get(activeClient)){
      const title=prepareAgreementDraft({project}).project;field('project').value=title;projectTitles.set(activeClient,title);automaticPreview();
    }
  }
  async function readQuote(){
    if(!terms){const response=await fetch('/js/project-terms-v1.json');if(!response.ok)throw new Error('Terms could not be loaded.');terms=await response.json();}
    const client=clients.find(value=>value.id===select.value);if(!client)throw new Error(t('Choose a client first.','Elige un cliente.'));
    const value=id=>document.getElementById('agreement-'+id).value.trim();
    if(value('revisions')==='')throw new Error(t('Enter the included revision rounds.','Indica las rondas de revisión.'));
    return validateQuote({quoteNumber:value('number'),clientName:client.fullName||[client.firstName,client.lastName].filter(Boolean).join(' ')||client.businessName,clientEmail:client.email,providerName:value('provider'),projectName:value('project'),scope:value('scope'),amount:Number(value('amount')),paymentSchedule:value('payments'),delivery:value('delivery'),revisions:Number(value('revisions')),ongoingCosts:value('costs'),variations:value('variations'),termsVersion:TERMS_VERSION,termsText:terms[value('language')],language:value('language')});
  }
  document.getElementById('agreement-preview-button').addEventListener('click',async()=>{
    const version=++previewVersion;clearTimeout(previewTimer);preview.hidden=true;
    try{const quote=await readQuote();if(version!==previewVersion)return;renderAgreement(preview,quote,null,{es,download:()=>downloadAgreement(quote,null)});preview.hidden=false;status.textContent=t('Preview only. Approve and issue when all details are correct.','Solo vista previa. Aprueba y emite cuando los datos sean correctos.');}catch(error){if(version===previewVersion)status.textContent=error.message;}
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(issueButton.disabled)return;remember();previewVersion++;clearTimeout(previewTimer);
    const controls=[...form.querySelectorAll('input,select,textarea,button')];const previous=controls.map(control=>control.disabled);controls.forEach(control=>control.disabled=true);
    let issued=false;
    try{
      const quote=await readQuote();const admin=getAdmin();if(!admin)throw new Error('Please sign in again.');
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(quote.quoteNumber));
      const id=[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
      const reference=doc(db,'users',select.value,'agreements',id);
      const expiresAt=Timestamp.fromDate(new Date(Date.now()+14*86400000));
      await runTransaction(db,async transaction=>{const existing=await transaction.get(reference);if(existing.exists()){if(existing.data().state==='issued'&&quoteMatches(existing.data(),quote))return;throw new Error(t('This quote number is already used. Start a new draft for changed terms.','El número ya está usado. Crea otro borrador para cambiar términos.'));}transaction.set(reference,{...quote,state:'issued',issuedAt:serverTimestamp(),issuedBy:admin.uid,expiresAt});});
      issued=true;drafts.set(activeClient,{...capture(),issued:true});persist();
      status.textContent=t('Approved and issued automatically to the client portal. The client must accept before payment. Start a new draft for another quote.','Aprobado y emitido automáticamente en el portal. El cliente debe aceptar antes de pagar. Crea otro borrador para otra cotización.');preview.hidden=true;
    }catch(error){status.textContent=error.message||t('Quote could not be issued.','No se pudo emitir.');}finally{controls.forEach((control,index)=>control.disabled=previous[index]);if(issued){issueButton.dataset.issued='true';issueButton.disabled=true;}}
  });
  function watch(){
    stop();host.replaceChildren();preview.hidden=true;
    if(!select.value)return;
    const receipts=[];const unwatch=onSnapshot(collection(db,'users',select.value,'agreements'),snapshot=>{
      receipts.splice(0).forEach(fn=>fn());host.replaceChildren();
      if(snapshot.empty){host.textContent=t('No quotes issued to this client.','Este cliente no tiene cotizaciones.');return;}
      snapshot.docs.sort((a,b)=>(b.data().issuedAt?.seconds||0)-(a.data().issuedAt?.seconds||0)).forEach(item=>{
        const quote={id:item.id,...item.data()};const card=document.createElement('article');card.className='agreement-card';host.append(card);
        const reference=item.ref,receipt=doc(reference,'acceptances','client');
        receipts.push(onSnapshot(receipt,accepted=>{
          const acceptance=accepted.exists()?accepted.data():null;renderAgreement(card,quote,acceptance,{es,download:()=>downloadAgreement(quote,acceptance)});
          if(!acceptance&&quote.state==='issued'){
            const withdraw=document.createElement('button');withdraw.type='button';withdraw.className='admin-small-button';withdraw.textContent=t('Withdraw this quote','Retirar esta cotización');card.append(withdraw);
            withdraw.addEventListener('click',async()=>{withdraw.disabled=true;try{await runTransaction(db,async transaction=>{const q=await transaction.get(reference),r=await transaction.get(receipt);if(r.exists())throw new Error(t('Accepted quotes cannot be withdrawn.','No se pueden retirar cotizaciones aceptadas.'));if(q.data()?.state!=='issued')throw new Error('Quote already withdrawn.');transaction.update(reference,{state:'withdrawn',withdrawnAt:serverTimestamp()});});}catch(error){status.textContent=error.message;withdraw.disabled=false;}});
          }
        },()=>{card.textContent=t('Acceptance could not be loaded.','No se pudo cargar la aceptación.');}));
      });
    },error=>{host.textContent=error.message;});
    stop=()=>{unwatch();receipts.splice(0).forEach(fn=>fn());};
  }
  select.addEventListener('change',()=>{prepare();watch();});
  issueButton.disabled=true;
  return {
    clients(records){restore();clients=records;const selected=select.value;select.replaceChildren(new Option(t('Choose a client','Elige un cliente'),''),...records.map(client=>new Option(client.fullName||client.email,client.id)));select.value=selected;if(!selected)host.textContent=t('Choose a client to prepare and review their agreements.','Elige un cliente para preparar y revisar sus acuerdos.');},
    project:updateProject,
    prepareFor(userId,project){if(!clients.some(client=>client.id===userId))return;if(activeClient!==userId){select.value=userId;prepare();watch();}updateProject({...project,userId});}
  };
}
