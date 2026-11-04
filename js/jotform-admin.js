async function request(user,body) {
  const token=await user.getIdToken();
  const response=await fetch('/api/jotform-agreements',{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
    body:JSON.stringify(body),cache:'no-store'
  });
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'Jotform could not be checked.');
  return data;
}

export async function showJotformConnection(form,user,isActive) {
  let banner=document.getElementById('jotform-connection-status');
  if(!banner){banner=document.createElement('p');banner.id='jotform-connection-status';banner.setAttribute('role','status');form.before(banner);}
  banner.textContent='Checking the Jotform connection…';
  try{
    const result=await request(user,{action:'connection'});if(!isActive())return;
    banner.textContent=result.formEnabled?'Jotform API connected. Check submission IDs below; staff review is required before updating signing status.':'Jotform API connected, but the agreement form is disabled in Jotform.';
  }catch{if(isActive())banner.textContent='Jotform submission lookup is unavailable. You can still review signing records in Jotform and update agreements here.';}
}

export function addJotformReview(host,record,user,evidence,isActive) {
  const area=document.createElement('div');area.className='service-jotform-review';
  const label=document.createElement('label');label.textContent='Jotform submission ID';
  const input=document.createElement('input');input.type='text';input.inputMode='numeric';input.maxLength=30;input.placeholder='Submission ID from Jotform Inbox';label.append(input);
  const button=document.createElement('button');button.type='button';button.className='admin-small-button';button.textContent='Check Jotform submission';
  const status=document.createElement('p');status.setAttribute('role','status');area.append(label,button,status);host.before(area);
  button.addEventListener('click',async()=>{
    button.disabled=true;status.replaceChildren();
    try{
      if(!isActive())throw new Error('Please sign in again.');
      const submissionId=input.value.trim();if(!/^\d{10,30}$/.test(submissionId))throw new Error('Enter the numeric submission ID from Jotform Inbox.');
      const result=await request(user,{action:'submission',clientUid:record.uid,agreementId:record.id,submissionId});
      if(!isActive()||!area.isConnected)return;
      evidence.value=`Jotform submission ${result.submissionId} — API checked ${new Date().toISOString()}`;
      status.textContent=`Submission found for this client and form. Client signature field: ${result.clientSignaturePresent?'supplied':'missing'}. BAM signature field: ${result.providerSignaturePresent?'supplied':'missing'}. ${result.submittedAt?'Submitted '+result.submittedAt+'. ':''}Review signer identities and the exact agreement text in Jotform before saving a status. `;
      const link=document.createElement('a');link.href='https://www.jotform.com/submission/'+result.submissionId;link.target='_blank';link.rel='noopener noreferrer';link.textContent='View original submission';status.append(link);
    }catch(error){if(isActive())status.textContent=error.message;}finally{button.disabled=false;}
  });
}
