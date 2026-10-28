import {auth,db} from './firebase-config.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import {doc,getDoc} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';
import {requestStore} from './change-request-store.js?v=1';
import {requestInput,validateScreenshot} from './change-request-model.js?v=1';
import {requestCards,feedback,t} from './change-request-view.js?v=1';

export function mountClientRequests(store=requestStore) {
  const form=document.getElementById('change-request-form');if(!form)return null;
  const host=document.getElementById('client-change-requests'),message=document.getElementById('change-request-status'),button=form.querySelector('button[type="submit"]');
  const field=name=>form.elements.namedItem(name);
  let userId='',stop=()=>{},generation=0,pendingId='',pendingKey='',busy=false;
  const setBusy=value=>{busy=value;Array.from(form.elements).forEach(el=>el.disabled=value||!userId);};setBusy(false);
  const errors={title:t('Use a title between 3 and 150 characters.','Usa un título de entre 3 y 150 caracteres.'),description:t('Describe the change in 10–4,000 characters.','Describe el cambio en 10–4,000 caracteres.'),pageUrl:t('Enter a complete http:// or https:// page URL without a username or password.','Ingresa la URL completa http:// o https:// sin nombre de usuario ni contraseña.'),screenshot:t('Choose a JPG, PNG, or WebP screenshot up to 5 MB.','Elige una captura JPG, PNG o WebP de hasta 5 MB.')};
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!userId)return;
    const uid=userId;const values={title:field('title').value,pageUrl:field('pageUrl').value,description:field('description').value};const file=field('screenshot').files[0];
    try{requestInput(values);validateScreenshot(file);}catch(error){feedback(message,errors[error.message]||t('Check your request.','Revisa tu solicitud.'),true);return;}
    const key=JSON.stringify([values,file?.name,file?.size,file?.lastModified]);if(key!==pendingKey){pendingKey=key;pendingId=store.id();}
    setBusy(true);feedback(message,t('Sending your request…','Enviando tu solicitud…'));
    try{await store.create(uid,values,file,pendingId);if(uid!==userId)return;form.reset();pendingId='';pendingKey='';feedback(message,t('Request submitted. BAM will review the scope and update the status here.','Solicitud enviada. BAM revisará el alcance y actualizará el estado aquí.'));}
    catch{if(uid===userId)feedback(message,t('The request could not be confirmed. Your details are still here; try again. Retrying the same request will not create a duplicate.','No se pudo confirmar la solicitud. Tus datos siguen aquí; inténtalo de nuevo. Reintentar la misma solicitud no creará un duplicado.'),true);}
    finally{if(uid===userId)setBusy(false);}
  });
  return {async connect(user) {
    const version=++generation;stop();userId='';pendingId='';pendingKey='';form.reset();feedback(message,'');host.replaceChildren();setBusy(false);
    if(!user?.emailVerified)return;
    try{const profile=await getDoc(doc(db,'users',user.uid));if(version!==generation)return;
      if(!profile.exists()||profile.data().role!=='client'){feedback(message,t('Change requests are available in client accounts.','Las solicitudes de cambio están disponibles en las cuentas de clientes.'));return;}
      userId=user.uid;setBusy(false);feedback(message,'');
      stop=store.watch(userId,records=>{if(version===generation)requestCards(host,records,{store,onCancel:r=>store.cancel(r)});},()=>{if(version===generation){host.textContent=t('Requests could not load. Refresh to retry.','No se pudieron cargar las solicitudes. Actualiza para reintentar.');}});
    }catch{if(version===generation)feedback(message,t('Unable to verify your account. Refresh to retry.','No se pudo verificar tu cuenta. Actualiza para reintentar.'),true);}
  },disconnect(){generation++;stop();userId='';setBusy(false);host.replaceChildren();}};
}
const ui=mountClientRequests();
if(ui){onAuthStateChanged(auth,user=>ui.connect(user));window.addEventListener('beforeunload',()=>ui.disconnect());}
