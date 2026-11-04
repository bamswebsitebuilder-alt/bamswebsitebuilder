const PROJECT = 'bam-client-portal';
const API_ORIGIN = 'https://api.jotform.com';
const ORIGINS = new Set(['https://www.bamswebsitebuilder.com','https://bamswebsitebuilder.com','https://bamswebsitebuilder.vercel.app']);
const fail = (status,message) => Object.assign(new Error(message),{status});
const identifier = value => typeof value==='string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const numericId = value => typeof value==='string' && /^\d{10,30}$/.test(value);
const text = field => field?.stringValue || '';

export function submissionSummary(submission,{formId,clientEmail}) {
  if(String(submission?.form_id)!==formId || submission?.status!=='ACTIVE')throw fail(409,'This is not an active submission of the BAM agreement form.');
  const email=submission.answers?.['9']?.answer;
  if(typeof email!=='string' || !clientEmail || email.trim().toLowerCase()!==clientEmail.trim().toLowerCase())throw fail(409,'The submission email does not match this client. Review the original in Jotform.');
  const signature=id=>submission.answers?.[id]?.type==='control_signature' && typeof submission.answers[id].answer==='string' && submission.answers[id].answer.trim().length>0;
  return {
    submissionId:String(submission.id),submittedAt:String(submission.created_at||'').slice(0,40),
    clientSignaturePresent:signature('64'),providerSignaturePresent:signature('68'),
    statusSource:'jotform_api',requiresStaffReview:true,
    // A standard public form does not establish independent recipient identities.
    // These booleans record supplied fields, never proof of two-party completion.
    signingStatus:'staff_review_required'
  };
}

export function createJotformHandler({fetchFn=fetch,env=process.env}={}) {
  async function firestore(documentPath,token) {
    const response=await fetchFn(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${documentPath}`,{
      headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(8000)
    });
    if(response.status===401||response.status===403)throw fail(403,'Administrator access is required.');
    if(response.status===404)throw fail(404,'The client or assigned agreement was not found.');
    if(!response.ok)throw fail(503,'Portal access could not be checked. Try again shortly.');
    return (await response.json()).fields||{};
  }
  async function jotform(resource) {
    const response=await fetchFn(API_ORIGIN+resource,{headers:{APIKEY:env.JOTFORM_API_KEY,accept:'application/json'},signal:AbortSignal.timeout(10000)});
    let data;try{data=await response.json();}catch{throw fail(502,'Jotform returned an unexpected response.');}
    if(response.status===404||data.responseCode===404)throw fail(404,'This Jotform submission was not found.');
    if(!response.ok || data.responseCode!==200)throw fail(503,'Jotform is unavailable or the API connection needs attention.');
    return data.content;
  }
  return async function handler(req,res) {
    res.setHeader('Cache-Control','private, no-store');res.setHeader('Vary','Origin, Authorization');
    if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Use POST.'});}
    if(req.headers.origin && !ORIGINS.has(req.headers.origin))return res.status(403).json({error:'This origin is not allowed.'});
    if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return res.status(415).json({error:'Use JSON.'});
    const authorization=req.headers.authorization||'';
    if(!/^Bearer [A-Za-z0-9._-]{10,8192}$/.test(authorization))return res.status(401).json({error:'Sign in as an administrator.'});
    const token=authorization.slice(7);
    try {
      let subject;
      try{subject=JSON.parse(Buffer.from(token.split('.')[1]||'','base64url').toString()).sub;}catch{}
      if(!identifier(subject))throw fail(401,'Sign in again.');
      // The decoded subject selects a profile path only. Firestore validates the
      // ORIGINAL bearer token and applies existing rules before access is granted.
      // No unverified JWT claim, client-supplied role or service-account bypass is trusted.
      const admin=await firestore('users/'+encodeURIComponent(subject),token);
      if(text(admin.role)!=='admin')throw fail(403,'Administrator access is required.');
      if(!env.JOTFORM_API_KEY || !numericId(env.JOTFORM_FORM_ID))throw fail(503,'The Jotform API connection is not configured.');
      let body=req.body;
      if(typeof body==='string'){if(body.length>2048)throw fail(400,'The request is too large.');try{body=JSON.parse(body);}catch{throw fail(400,'Invalid JSON.');}}
      if(!body || JSON.stringify(body).length>2048)throw fail(400,'Invalid request.');
      if(body.action==='connection'){
        const form=await jotform('/form/'+env.JOTFORM_FORM_ID);
        if(String(form?.id)!==env.JOTFORM_FORM_ID)throw fail(503,'The configured Jotform agreement could not be verified.');
        return res.status(200).json({connected:true,formId:env.JOTFORM_FORM_ID,formType:form.type,formEnabled:form.status==='ENABLED',requiresStaffReview:true});
      }
      if(body.action!=='submission'||!numericId(body.submissionId)||!identifier(body.clientUid)||!identifier(body.agreementId))throw fail(400,'Enter a valid Jotform submission ID for an assigned agreement.');
      const [client,agreement]=await Promise.all([
        firestore('users/'+encodeURIComponent(body.clientUid),token),
        firestore(`users/${encodeURIComponent(body.clientUid)}/serviceAgreements/${encodeURIComponent(body.agreementId)}`,token)
      ]);
      if(text(client.role)!=='client'||text(agreement.termsVersion)!=='bam-client-service-2026-11-02-v1')throw fail(409,'The assigned client agreement could not be verified.');
      const link=text(agreement.signingUrl);
      let formUrl;try{formUrl=new URL(link);}catch{throw fail(409,'This agreement has no Jotform link.');}
      if(formUrl.protocol!=='https:' || !/^(?:[a-z0-9-]+\.)*jotform\.com$/i.test(formUrl.hostname) || !formUrl.pathname.split('/').includes(env.JOTFORM_FORM_ID))throw fail(409,'This agreement uses a different Jotform form.');
      const submission=await jotform('/submission/'+body.submissionId);
      if(String(submission?.id)!==body.submissionId)throw fail(502,'Jotform returned a different submission.');
      return res.status(200).json(submissionSummary(submission,{formId:env.JOTFORM_FORM_ID,clientEmail:text(client.email)}));
    } catch(error) {
      // Never log bearer tokens, the key, submission answers or upstream bodies.
      return res.status(error.status||503).json({error:error.status?error.message:'The agreement lookup is unavailable. Try again shortly.'});
    }
  };
}
