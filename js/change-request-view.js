import {REQUEST_STATES,REQUEST_SCOPES,CANCELLABLE_STATES,canTransition,timeOf} from './change-request-model.js?v=1';
export const spanish=document.documentElement.lang.startsWith('es');
export const t=(en,es)=>spanish?es:en;
const stateNames={submitted:['Submitted','Enviada'],'in-review':['In review','En revisión'],'waiting-on-client':['Waiting on client','Esperando al cliente'],'in-progress':['In progress','En curso'],completed:['Completed','Completada'],declined:['Declined','Rechazada'],cancelled:['Cancelled','Cancelada']};
const scopeNames={unreviewed:['Not reviewed yet','Pendiente de revisión'],included:['Included in project','Incluida en el proyecto'],extra:['Extra — separate quote required','Extra — requiere cotización aparte']};
export const stateLabel=value=>stateNames[value]?t(...stateNames[value]):value;
export const scopeLabel=value=>scopeNames[value]?t(...scopeNames[value]):value;
export function node(tag,text,cls) {const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;}
export function feedback(host,text,error=false){host.textContent=text;host.classList.toggle('request-error',error);}
export function requestCards(host,records,{store,admin=false,clients=[],drafts=new Map(),open=new Set(),onSave,onCancel}={}) {
  host.replaceChildren();
  if(!records.length){host.append(node('p',t('No requests to show.','No hay solicitudes para mostrar.')));return;}
  const names=new Map(clients.map(c=>[c.id,c.businessName||c.fullName||c.email]));
  for(const record of records) {
    const key=record.userId+'/'+record.id,card=node('article',undefined,'request-card');card.id='request-'+record.id;
    const heading=node('div',undefined,'request-heading');heading.append(node('h3',record.title),node('span',stateLabel(record.status),'request-badge'));
    const created=timeOf(record.createdAt);card.append(heading,node('p',`${admin?(names.get(record.userId)||t('Client','Cliente'))+' · ':''}${created?new Date(created).toLocaleString(spanish?'es-US':'en-US'):t('Saving…','Guardando…')}`,'request-meta'));
    const link=node('a',record.pageUrl);link.href=/^https?:\/\//i.test(record.pageUrl||'')?record.pageUrl:'#';link.target='_blank';link.rel='noopener noreferrer';card.append(link,node('p',record.description,'request-description'),node('p',scopeLabel(record.scope),'request-scope'));
    if(record.adminNote)card.append(node('p',t('BAM’s update: ','Actualización de BAM: ')+record.adminNote,'request-note'));
    if(record.scope==='extra')card.append(node('p',t('Extra work needs a separate accepted quote before work starts. Submitting this request does not authorize a charge.','El trabajo adicional requiere una cotización aceptada antes de comenzar. Enviar esta solicitud no autoriza un cobro.'),'request-meta'));
    if(record.screenshotPath) {
      const attachment=node('span',t('Loading screenshot link…','Cargando enlace de captura…'),'request-meta');card.append(attachment);
      if(record.screenshotPath.startsWith(`users/${record.userId}/uploads/change-request_`))store.screenshot(record.screenshotPath).then(url=>{
        if(!attachment.isConnected)return;const a=node('a',t('View screenshot ↗','Ver captura ↗'));a.href=url;a.target='_blank';a.rel='noopener noreferrer';attachment.replaceChildren(a);
      }).catch(()=>{attachment.textContent=t('Screenshot unavailable. Please use Files or contact support.','Captura no disponible. Usa Archivos o contacta soporte.');});
    }
    if(admin) {
      const details=node('details'),summary=node('summary',t('Review request','Revisar solicitud'));details.open=open.has(key);details.addEventListener('toggle',()=>details.open?open.add(key):open.delete(key));details.append(summary);
      const form=node('form',undefined,'request-review-form'),status=node('select'),scope=node('select'),note=node('textarea');
      status.setAttribute('aria-label',t('Request status','Estado de la solicitud'));scope.setAttribute('aria-label',t('Work classification','Clasificación del trabajo'));note.setAttribute('aria-label',t('Update for the client','Actualización para el cliente'));note.maxLength=2000;note.rows=3;
      for(const value of REQUEST_STATES.filter(s=>s!=='cancelled'&&canTransition(record.status,s)||s===record.status)){const o=node('option',stateLabel(value));o.value=value;status.append(o);}
      for(const value of REQUEST_SCOPES){const o=node('option',scopeLabel(value));o.value=value;scope.append(o);}
      const draft=drafts.get(key);status.value=draft?.status||record.status;scope.value=draft?.scope||record.scope;note.value=draft?.adminNote??record.adminNote;
      const remember=()=>drafts.set(key,{base:draft?.base||record,status:status.value,scope:scope.value,adminNote:note.value});[status,scope,note].forEach(el=>el.addEventListener('input',remember));
      for(const [text,el] of [[t('Status','Estado'),status],[t('Scope','Alcance'),scope],[t('Client update','Actualización para el cliente'),note]]){const label=node('label',text);label.append(el);form.append(label);}
      const button=node('button',t('Save review','Guardar revisión'),'request-primary');button.type='submit';button.disabled=record.pending===true;const message=node('p');message.setAttribute('role','status');
      form.addEventListener('submit',async event=>{event.preventDefault();remember();button.disabled=true;try{await onSave(drafts.get(key).base,{status:status.value,scope:scope.value,adminNote:note.value});drafts.delete(key);feedback(message,t('Saved.','Guardado.'));}catch(error){feedback(message,error.message==='conflict'?t('This request changed. Close and reopen the client filter to refresh before saving.','La solicitud cambió. Vuelve a seleccionar el cliente para actualizarla antes de guardar.'):t('Could not save. Your edits are still here. Check the status and try again.','No se pudo guardar. Tus cambios siguen aquí. Revisa el estado e inténtalo de nuevo.'),true);}finally{button.disabled=false;}});
      form.append(button,message);details.append(form);card.append(details);
    } else if(CANCELLABLE_STATES.includes(record.status)) {
      const button=node('button',t('Cancel request','Cancelar solicitud'),'request-secondary');button.type='button';button.disabled=record.pending===true;const message=node('p');message.setAttribute('role','status');
      button.addEventListener('click',async()=>{button.disabled=true;try{await onCancel(record);}catch{feedback(message,t('Could not cancel. The request may have changed; refresh and try again.','No se pudo cancelar. La solicitud puede haber cambiado; actualiza e inténtalo de nuevo.'),true);button.disabled=false;}});card.append(button,message);
    }
    host.append(card);
  }
}
