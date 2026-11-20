import {auth,db} from './firebase-config.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import {collection,doc,getDoc,getDocs} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';

// The admin portal already issues unique quote numbers and immutable accepted receipts.
// Verify those records before revealing a payment control. A typed number is never authority.
const $=id=>document.getElementById(id);
const prices={starter:250,business:500,premium:850};
const monthly={starter:20.83,business:41.67,premium:70.83};
const money=n=>'$'+Number(n).toFixed(2);
const status=message=>{if($('ck-quote-status'))$('ck-quote-status').textContent=message;};
function identify(quote){
 const price=Number(quote.amount);
 const schedule=String(quote.paymentSchedule||'').toLowerCase();
 const variants=String(quote.variations||'').toLowerCase();
 let pack=null;
 // Avoid presenting fixed PayPal links for a custom-priced quote.
 const isMonthly=/12\s+(?:monthly\s+)?payments|12\s+pagos\s+mensuales/.test(schedule);
 for(const name of Object.keys(prices)){
  if(Math.abs(price-(isMonthly?monthly[name]*12:prices[name]))<0.011){pack=name;break;}
 }
 if(!pack)return null;
 const method=isMonthly?'monthly':(/50%|50\/50|half\s+(?:now|upfront)|mitad/.test(schedule)?'deposit':(/paid\s+in\s+full|pay\s+in\s+full|one.time\s+payment|single\s+payment|pago\s+[uú]nico/.test(schedule)?'full':null));
 if(!method)return null;
 // Explicit quote variations can change the price or schedule; require human review.
 if(variants.trim()&&!/^(none\.?|ninguno\.?|n\/a)$/.test(variants.trim()))return null;
 if(method==='monthly'&&!/12\s+/.test(schedule))return null;
 return {package:pack,method};
}
async function loadForUser(user){
 window.bamAcceptedQuote=null;
 window.dispatchEvent(new Event('bam-quote-verified'));
 $('ck-quote-details').hidden=true;
 if(!user){status('Sign in to your Client Portal first. Your quote number will appear here automatically after acceptance.');return;}
 if(!user.emailVerified){status('Please verify your account email before accessing an accepted project quote.');return;}
 status('Checking accepted quotes in your secure client portal…');
 try{
  const requested=new URLSearchParams(location.search).get('quote');
  const ownerPath=['users',user.uid,'agreements'];
  const choices=[];
  if(requested&&/^[a-f0-9]{64}$/.test(requested)){
   const snapshot=await getDoc(doc(db,...ownerPath,requested));
   if(snapshot.exists())choices.push({id:snapshot.id,data:snapshot.data()});
  }else if(!requested){
   const snapshot=await getDocs(collection(db,...ownerPath));
   snapshot.forEach(item=>choices.push({id:item.id,data:item.data()}));
   choices.sort((a,b)=>(b.data.issuedAt?.seconds||0)-(a.data.issuedAt?.seconds||0));
  }
  for(const item of choices){
   if(item.data.state!=='issued')continue;
   const accepted=await getDoc(doc(db,...ownerPath,item.id,'acceptances','client'));
   if(!accepted.exists())continue;
   const receipt=accepted.data();
   if(receipt.clientUid!==user.uid||receipt.quoteId!==item.id||receipt.termsVersion!==item.data.termsVersion)continue;
   const match=identify(item.data);
   if(!match){status('An accepted quote was found, but its price or payment schedule does not match a standard PayPal button. Contact BAM for a matching secure invoice.');continue;}
   window.bamAcceptedQuote={...match,quoteNumber:item.data.quoteNumber,agreementId:item.id};
   $('ck-quote-number').textContent=item.data.quoteNumber;
   $('ck-quote-project').textContent=item.data.projectName||'Website project';
   $('ck-quote-schedule').textContent=item.data.paymentSchedule;
   $('ck-quote-details').hidden=false;
   const packageRadio=document.querySelector('input[name="ck-package"][value="'+match.package+'"]');
   const methodRadio=document.querySelector('input[name="ck-method"][value="'+match.method+'"]');
   if(packageRadio)packageRadio.checked=true;
   if(methodRadio)methodRadio.checked=true;
   status('Accepted quote '+item.data.quoteNumber+' verified for '+match.package+' / '+match.method+'. Review the agreement checkbox to continue.');
   window.dispatchEvent(new Event('bam-quote-verified'));
   return;
  }
  if(!window.bamAcceptedQuote&&choices.length===0)status('No issued quote found. Ask BAM to issue one in your Client Portal, then accept it to unlock checkout.');
  else if(!window.bamAcceptedQuote)status('No matching accepted standard quote found. Open your Client Portal to review and accept your agreement or request an updated quote.');
 }catch(e){status('We could not securely verify your quote. Open your Client Portal to review your agreement or try again after signing in.');}
}
onAuthStateChanged(auth,user=>{loadForUser(user);});
