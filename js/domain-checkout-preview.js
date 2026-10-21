// Development preview only. Loads PayPal SDK only if backend explicitly
// reports that sandbox payment testing is enabled.
import {auth} from './firebase-config.js';
const form=document.getElementById('sandbox-quote-form');
const status=document.getElementById('sandbox-checkout-status');
const summary=document.getElementById('sandbox-quote-summary');
const mount=document.getElementById('sandbox-paypal-buttons');
if(form&&status&&summary&&mount){
  form.addEventListener('submit',async e=>{
    e.preventDefault();summary.textContent='';mount.replaceChildren();
    const button=form.querySelector('button[type=submit]');
    if(!auth.currentUser){status.textContent='Sign in to your client account before requesting a test quote.';return;}
    const values=new FormData(form);
    const domain=String(values.get('domain')||'').trim().toLowerCase();
    const registrant={};
    for(const key of ['name','email','addressLine1','city','country','zipcode','phoneCountryCode','phone'])
      registrant[key]=String(values.get(key)||'').trim();
    const termsAccepted=values.get('termsAccepted')==='on';
    if(!termsAccepted){status.textContent='Registration consent is required.';return;}
    button.disabled=true;status.textContent='Confirming registrar availability and price…';
    try{
      const token=await auth.currentUser.getIdToken();
      const response=await fetch('/api/domain-verified-quote',{method:'POST',
        headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
        body:JSON.stringify({domain,registrant,termsAccepted})});
      const quote=await response.json();
      if(!response.ok)throw Error(quote.error||'Quote unavailable');
      summary.textContent=quote.domain+' — $'+(quote.amountCents/100).toFixed(2)+
        ' USD for one year; renewal estimate $'+(quote.renewalPriceCents/100).toFixed(2)+
        '. Quote expires in 10 minutes and does not reserve the domain.';
      const confResponse=await fetch('/api/domain-paypal-config',{cache:'no-store'});
      const config=await confResponse.json();
      if(!config.enabled){status.textContent='Quote saved in test mode. PayPal purchases and registration are disabled while testing continues.';return;}
      if(!/^[A-Za-z0-9_-]+$/.test(config.clientId||''))throw Error('PayPal is unavailable');
      status.textContent='Sandbox checkout only. No live charges are allowed.';
      const sdk=document.createElement('script');
      sdk.src='https://www.paypal.com/sdk/js?client-id='+encodeURIComponent(config.clientId)+'&currency=USD&intent=capture';
      sdk.onload=()=>{
        if(!window.paypal?.Buttons){status.textContent='PayPal Sandbox failed to load.';return;}
        window.paypal.Buttons({
          createOrder:async()=>{
            const r=await fetch('/api/domain-paypal-create',{
              method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await auth.currentUser.getIdToken()},
              body:JSON.stringify({quoteId:quote.id})});
            const d=await r.json();if(!r.ok)throw Error(d.error||'Could not create PayPal order');
            return d.orderId;
          },
          onApprove:async()=>{
            status.textContent='Checking payment confirmation…';
            const r=await fetch('/api/domain-paypal-capture',{
              method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await auth.currentUser.getIdToken()},
              body:JSON.stringify({quoteId:quote.id})});
            const d=await r.json();
            status.textContent=r.ok?'Sandbox payment verified; domain registration status is pending.':'Payment outcome uncertain. Do not pay again. Contact support.';
            if(r.ok)mount.replaceChildren();
          },
          onCancel:()=>{status.textContent='Payment canceled; no domain registration requested.'},
          onError:()=>{status.textContent='Payment status uncertain. Do not retry until this order is checked.'}
        }).render(mount);
      };
      sdk.onerror=()=>{status.textContent='PayPal Sandbox could not load.'};
      document.head.appendChild(sdk);
    }catch{status.textContent='A verified quote could not be prepared. No payment was made.'}
    finally{button.disabled=false}
  });
}
