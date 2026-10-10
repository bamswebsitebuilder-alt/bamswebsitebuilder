import {quoteState} from './agreement-model.js?v=1';
export function renderAgreement(host,quote,acceptance,actions={}) {
  const t=(en,es)=>actions.es?es:en;
  host.replaceChildren();
  const heading=document.createElement('h3');heading.textContent=`${quote.quoteNumber} — ${quote.projectName}`;
  const state=quoteState(quote,acceptance);
  const status=document.createElement('p');status.className='agreement-status';status.setAttribute('role','status');
  const states={accepted:t('Accepted','Aceptado'),awaiting:t('Awaiting your acceptance','Pendiente de tu aceptación'),expired:t('Expired — request an updated quote','Vencido — solicita otra cotización'),withdrawn:t('Withdrawn — request an updated quote','Retirado — solicita otra cotización')};
  status.textContent=quote.issuedAt?states[state]:t("Preview — not issued","Vista previa — no emitida");host.append(heading,status);
  const details=document.createElement('dl');details.className='agreement-details';
  const values=[
    [t('Service provider','Proveedor'),quote.providerName],[t('Client','Cliente'),`${quote.clientName} · ${quote.clientEmail}`],
    [t('Total (USD)','Total (USD)'),new Intl.NumberFormat(actions.es?'es-US':'en-US',{style:'currency',currency:'USD'}).format(quote.amount)],
    [t('Payment schedule','Calendario de pagos'),quote.paymentSchedule],[t('Delivery and dates','Entrega y fechas'),quote.delivery],
    [t('Included revision rounds','Rondas de revisión'),quote.revisions],[t('Scope and deliverables','Alcance y entregables'),quote.scope],
    [t('Ongoing costs','Costos continuos'),quote.ongoingCosts],[t('Express changes to standard terms','Cambios expresos a los términos'),quote.variations||t('None','Ninguno')],
    [t('Terms version','Versión de los términos'),quote.termsVersion],
    [t('Issued / provider confirmed','Emitido / confirmado por proveedor'),quote.issuedAt?.toDate?.().toLocaleString()||t('Preview — not issued','Vista previa — no emitida')],
    [t('Expires','Vence'),quote.expiresAt?.toDate?.().toLocaleString()||'—']
  ];
  values.forEach(([label,value])=>{const dt=document.createElement('dt');dt.textContent=label;const dd=document.createElement('dd');dd.textContent=value;details.append(dt,dd);});host.append(details);
  const terms=document.createElement('details');const summary=document.createElement('summary');summary.textContent=t('Read the attached project terms','Leer los términos adjuntos');const text=document.createElement('div');text.className='agreement-terms';text.textContent=quote.termsText;terms.append(summary,text);host.append(terms);
  const download=document.createElement('button');download.type='button';download.className='portal-secondary-button admin-small-button';download.textContent=t('Download quote and terms','Descargar cotización y términos');download.addEventListener('click',actions.download);host.append(download);
  if(acceptance){const receipt=document.createElement('p');receipt.textContent=t('Accepted by ','Aceptado por ')+`${acceptance.name} (${acceptance.email}) · ${acceptance.acceptedAt?.toDate?.().toLocaleString()||t('Saving timestamp…','Guardando fecha…')}`;host.append(receipt);return;}
  if(state!=='awaiting'||!actions.accept)return;
  const form=document.createElement('form');form.className='agreement-acceptance';
  const nameLabel=document.createElement('label');nameLabel.textContent=t('Your full name','Tu nombre completo');const name=document.createElement('input');name.type='text';name.autocomplete='name';name.required=true;name.minLength=2;name.maxLength=150;nameLabel.append(name);
  const checkLabel=document.createElement('label');checkLabel.className='agreement-check';const check=document.createElement('input');check.type='checkbox';check.required=true;checkLabel.append(check,document.createTextNode(t('I have reviewed and accept this quote and its attached project terms. I agree to record my acceptance electronically.','He revisado y acepto esta cotización y sus términos adjuntos. Acepto registrar mi aceptación electrónicamente.')));
  const notice=document.createElement('p');notice.textContent=t('Accepting records your agreement; it does not charge you. Download a copy before accepting. Contact BAM if you need changes or prefer to sign a copy.','Aceptar registra tu acuerdo; no genera un cobro. Descarga una copia antes de aceptar. Contacta a BAM si necesitas cambios o prefieres firmar una copia.');
  const button=document.createElement('button');button.type='submit';button.className='portal-primary-button';button.textContent=t('Accept quote and terms','Aceptar cotización y términos');
  const message=document.createElement('p');message.setAttribute('role','status');message.setAttribute('aria-live','polite');
  form.append(nameLabel,checkLabel,notice,button,message);host.append(form);
  form.addEventListener('submit',async event=>{event.preventDefault();if(!form.reportValidity())return;button.disabled=true;message.textContent=t('Saving acceptance…','Guardando aceptación…');try{await actions.accept(name.value,check.checked);message.textContent=t('Acceptance recorded. Download your copy.','Aceptación registrada. Descarga tu copia.');name.disabled=check.disabled=true;}catch(error){message.textContent=actions.es?'No se guardó la aceptación. La cotización puede haber vencido o cambiado; recarga la página o contacta a BAM.':error.message||'Acceptance could not be saved. Please retry.';button.disabled=false;}});
}
