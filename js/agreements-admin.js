import {db} from './firebase-config.js';
import {collection,doc,onSnapshot,runTransaction,serverTimestamp,Timestamp} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';
import {TERMS_VERSION,validateQuote,downloadAgreement} from './agreement-model.js?v=1';
import {renderAgreement} from './agreement-view.js?v=1';

export function createAdminAgreements(getAdmin) {
  const form=document.getElementById('agreement-form');if(!form)return null;
  const select=document.getElementById('agreement-client');const host=document.getElementById('admin-agreements');
  const status=document.getElementById('agreement-form-status');const preview=document.getElementById('agreement-preview');
  const es=document.documentElement.lang.startsWith('es');const t=(en,spanish)=>es?spanish:en;
  let clients=[],stop=()=>{},terms;
  async function readQuote(){
    if(!terms){const response=await fetch('/js/project-terms-v1.json');if(!response.ok)throw new Error('Terms could not be loaded.');terms=await response.json();}
    const client=clients.find(value=>value.id===select.value);if(!client)throw new Error(t('Choose a client first.','Elige un cliente.'));
    const value=id=>document.getElementById('agreement-'+id).value.trim();
    return validateQuote({quoteNumber:value('number'),clientName:client.fullName||[client.firstName,client.lastName].filter(Boolean).join(' ')||client.businessName,clientEmail:client.email,providerName:value('provider'),projectName:value('project'),scope:value('scope'),amount:Number(value('amount')),paymentSchedule:value('payments'),delivery:value('delivery'),revisions:Number(value('revisions')),ongoingCosts:value('costs'),variations:value('variations'),termsVersion:TERMS_VERSION,termsText:terms[value('language')],language:value('language')});
  }
  document.getElementById('agreement-preview-button').addEventListener('click',async()=>{
    try{const quote=await readQuote();renderAgreement(preview,quote,null,{es,download:()=>downloadAgreement(quote,null)});preview.hidden=false;status.textContent=t('Preview only. Issue the quote when all details are correct.','Solo vista previa. Emite la cotización cuando los datos sean correctos.');}catch(error){status.textContent=error.message;}
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();const button=form.querySelector('button[type=submit]');button.disabled=true;
    try{
      const quote=await readQuote();const admin=getAdmin();if(!admin)throw new Error('Please sign in again.');
      const reference=doc(collection(db,'users',select.value,'agreements'));
      const expiresAt=Timestamp.fromDate(new Date(Date.now()+14*86400000));
      await runTransaction(db,async transaction=>{const existing=await transaction.get(reference);if(existing.exists())throw new Error('Quote already exists.');transaction.set(reference,{...quote,state:'issued',issuedAt:serverTimestamp(),issuedBy:admin.uid,expiresAt});});
      status.textContent=t('Quote issued to the client portal. Your issue confirms these terms; the client must accept before payment.','Cotización emitida en el portal. La emisión confirma tus términos; el cliente debe aceptar antes de pagar.');preview.hidden=true;document.getElementById('agreement-number').value='';
    }catch(error){status.textContent=error.message||t('Quote could not be issued.','No se pudo emitir.');}finally{button.disabled=false;}
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
  select.addEventListener('change',watch);
  return {clients(records){clients=records;const selected=select.value;select.replaceChildren(new Option(t('Choose a client','Elige un cliente'),''),...records.map(client=>new Option(client.fullName||client.email,client.id)));select.value=selected;if(!selected)host.textContent=t('Choose a client to prepare and review their agreements.','Elige un cliente para preparar y revisar sus acuerdos.');}};
}
