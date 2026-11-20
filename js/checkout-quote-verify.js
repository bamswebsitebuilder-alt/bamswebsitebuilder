import {auth,db} from './firebase-config.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import {collection,doc,getDoc,getDocs,setDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';

// A payment option never becomes authorized merely because a radio button is selected.
// Original quotes and acceptance receipts remain immutable. Alternate schedules use an
// explicitly accepted, Firestore-validated one-time payment selection addendum.
const $=id=>document.getElementById(id);
const plans={
 starter:{price:250,deposit:125,monthly:20.83},
 business:{price:500,deposit:250,monthly:41.67},
 premium:{price:850,deposit:425,monthly:70.83}
};
const amount=n=>'$'+Number(n).toFixed(2);
const statement='I accept this payment schedule as an amendment to my approved website project quote.';
let loggedIn=null,verified=null,storedChoice=null,saving=false,loadingVersion=0;
function message(value){const node=$('ck-quote-status');if(node)node.textContent=value;}
function announce(){window.dispatchEvent(new Event('bam-quote-verified'));}
function methodForSchedule(schedule){
 const text=String(schedule||'').toLowerCase();
 if(/12\s+(?:monthly\s+)?payments|12\s+pagos\s+mensuales/.test(text))return 'monthly';
 if(/50%|50\/50|half\s+(?:now|upfront)|mitad/.test(text))return 'deposit';
 if(/paid\s+in\s+full|pay\s+in\s+full|one.time\s+payment|single\s+payment|pago\s+[uú]nico/.test(text))return 'full';
 return null;
}
function identify(quote){
 const method=methodForSchedule(quote.paymentSchedule);
 const variations=String(quote.variations||'').trim().toLowerCase();
 if(!method || (variations&&!/^(none\.?|ninguno\.?|n\/a)$/.test(variations)))return null;
 for(const [name,plan] of Object.entries(plans)){
  const expected=method==='monthly'?Number((plan.monthly*12).toFixed(2)):plan.price;
  if(Math.abs(Number(quote.amount)-expected)<0.011)return {package:name,method};
 }
 return null;
}
function amountsFor(name,method){
 const p=plans[name];
 return {
  dueNowCents:Math.round((method==='monthly'?p.monthly:method==='deposit'?p.deposit:p.price)*100),
  totalCents:Math.round((method==='monthly'?p.monthly*12:p.price)*100),
  billingCycles:method==='monthly'?12:method==='deposit'?2:1
 };
}
function reset(){
 window.bamAcceptedQuote=null;window.bamQuoteBase=null;verified=null;storedChoice=null;
 $('ck-quote-details').hidden=true;
 const choice=$('ck-payment-addendum');if(choice)choice.hidden=true;
 announce();
}
function selected(){return {package:document.querySelector('input[name="ck-package"]:checked')?.value,method:document.querySelector('input[name="ck-method"]:checked')?.value};}
function selectedSummary(name,method){
 const pricing=plans[name];
 if(method==='full')return amount(pricing.price)+' paid in full once.';
 if(method==='deposit')return amount(pricing.deposit)+' before work begins, followed by '+amount(pricing.deposit)+' after preview approval and before launch; total '+amount(pricing.price)+'.';
 return '12 payments of '+amount(pricing.monthly)+' each month; total '+amount(pricing.monthly*12)+', with no separate deposit.';
}
function refreshChoice(){
 if(!verified)return;
 const selectedNow=selected();
 const original=verified.original,selectedPack=selectedNow.package,method=selectedNow.method;
 const selectedChoice=storedChoice||original;
 const matches=selectedPack===selectedChoice.package&&method===selectedChoice.method;
 window.bamAcceptedQuote=matches?{...selectedChoice,quoteNumber:verified.quote.quoteNumber,agreementId:verified.id}:null;
 $('ck-payment-addendum').hidden=matches||!!storedChoice||selectedPack!==original.package;
 $('ck-selected-schedule').textContent=selectedPack===original.package?selectedSummary(selectedPack,method):'The selected package does not match your approved quote. Ask BAM for a new quote.';
 $('ck-addendum-checkbox').checked=false;
 $('ck-addendum-save').disabled=true;
 if(storedChoice&&!matches)message('Your payment schedule addendum is already accepted. To change it again, contact BAM for a revised quote.');
 else if(matches)message('Quote '+verified.quote.quoteNumber+' is accepted, and this payment arrangement is authorized. Review the terms checkbox to continue.');
 else if(selectedPack===original.package)message('This schedule differs from your original quote. Read and accept the payment schedule addendum to proceed.');
 else message('Select the website package in your accepted quote, or request a new quote.');
 announce();
}
async function load(user){
 const version=++loadingVersion;reset();loggedIn=user;
 if(!user){message('Sign in to your Client Portal. Your approved quote will be retrieved automatically.');return;}
 if(!user.emailVerified){message('Verify your account email to access your approved quote.');return;}
 message('Checking your accepted quotes in the Client Portal…');
 try{
  const root=['users',user.uid,'agreements'];
  const requested=new URLSearchParams(location.search).get('quote');
  const choices=[];
  if(requested&&/^[a-f0-9]{64}$/.test(requested)){
   const item=await getDoc(doc(db,...root,requested));
   if(item.exists())choices.push({id:item.id,quote:item.data()});
  }else if(!requested){
   const snapshot=await getDocs(collection(db,...root));
   snapshot.docs.forEach(item=>choices.push({id:item.id,quote:item.data()}));
   choices.sort((a,b)=>(b.quote.issuedAt?.seconds||0)-(a.quote.issuedAt?.seconds||0));
  }
  for(const item of choices){
   if(item.quote.state!=='issued')continue;
   const receipt=await getDoc(doc(db,...root,item.id,'acceptances','client'));
   if(!receipt.exists())continue;
   const acceptance=receipt.data();
   if(acceptance.clientUid!==user.uid||acceptance.quoteId!==item.id||acceptance.termsVersion!==item.quote.termsVersion)continue;
   const original=identify(item.quote);
   if(!original)continue;
   const choiceDoc=await getDoc(doc(db,...root,item.id,'paymentSelections','current'));
   if(version!==loadingVersion)return;
   verified={...item,original};storedChoice=null;
   if(choiceDoc.exists()){
    const itemChoice=choiceDoc.data();
    const expected=amountsFor(itemChoice.package,itemChoice.method);
    if(itemChoice.package!==original.package||!['full','deposit','monthly'].includes(itemChoice.method)||
      itemChoice.dueNowCents!==expected.dueNowCents||itemChoice.totalCents!==expected.totalCents||
      itemChoice.billingCycles!==expected.billingCycles){message('Payment addendum needs an administrator review. Contact BAM.');return;}
    storedChoice={package:itemChoice.package,method:itemChoice.method};
   }
   window.bamQuoteBase={quoteNumber:item.quote.quoteNumber,agreementId:item.id,package:original.package,originalMethod:original.method};
   $('ck-quote-number').textContent=item.quote.quoteNumber;
   $('ck-quote-project').textContent=item.quote.projectName||'Website project';
   $('ck-quote-schedule').textContent=item.quote.paymentSchedule;
   $('ck-quote-details').hidden=false;
   const initial=storedChoice||original;
   const packageInput=document.querySelector('input[name="ck-package"][value="'+initial.package+'"]');
   const methodInput=document.querySelector('input[name="ck-method"][value="'+initial.method+'"]');
   if(packageInput)packageInput.checked=true;
   if(methodInput)methodInput.checked=true;
   refreshChoice();return;
  }
  if(version!==loadingVersion)return;
  message(choices.length?'No accepted standard quote is available. Review the agreement in your Client Portal or ask BAM for a revised quote.':'No issued quote found. Ask BAM to issue a quote in your Client Portal.');
 }catch(e){if(version===loadingVersion)message('Unable to verify your quote securely. Sign in again or open your Client Portal.');}
}
const save=$('ck-addendum-save');
if(save){
 $('ck-addendum-checkbox').addEventListener('change',()=>{save.disabled=!$('ck-addendum-checkbox').checked||saving;});
 save.addEventListener('click',async()=>{
  if(saving||!loggedIn?.emailVerified||!verified||storedChoice||!$('ck-addendum-checkbox').checked)return;
  const chosen=selected();if(chosen.package!==verified.original.package||chosen.method===verified.original.method)return;
  saving=true;save.disabled=true;
  const expected=amountsFor(chosen.package,chosen.method);
  try{
   const path=['users',loggedIn.uid,'agreements',verified.id,'paymentSelections','current'];
   await setDoc(doc(db,...path),{
    clientUid:loggedIn.uid,quoteId:verified.id,package:chosen.package,method:chosen.method,
    ...expected,termsVersion:verified.quote.termsVersion,statement,acceptedAt:serverTimestamp()
   });
   storedChoice={...chosen};
   refreshChoice();
   message('Your new payment schedule has been saved and accepted. Review the terms checkbox to proceed to PayPal.');
  }catch(e){
   message('Could not save your payment schedule. The Firebase payment-selection security rules may need deployment. Contact BAM before paying.');
  }finally{saving=false;save.disabled=!!storedChoice||!$('ck-addendum-checkbox').checked;}
 });
}
document.querySelectorAll('input[name="ck-package"],input[name="ck-method"]').forEach(input=>input.addEventListener('change',refreshChoice));
onAuthStateChanged(auth,user=>{load(user);});
