import {safeHostingUrl,paypalHostingLink,hostingDue} from './hosting-model.js?v=1';
export function hostingLabels(es=false){return es?{
  setup:'En preparación',active:'Activo',attention:'Requiere atención',paused:'Pausado',ending:'Finalizando',ended:'Finalizado',
  'not-configured':'Sin configurar','awaiting-approval':'Pendiente de autorización', 'past-due':'Pago pendiente',cancelled:'Cancelado',
  client:'Cliente',bam:'BAM',other:'Otro titular',unconfirmed:'Por confirmar',monthly:'al mes',yearly:'al año',direct:'Pago directo al proveedor',invoice:'Factura de BAM',paypal:'Suscripción de PayPal'
}:{setup:'Setting up',active:'Active',attention:'Needs attention',paused:'Paused',ending:'Ending',ended:'Ended','not-configured':'Not configured','awaiting-approval':'Awaiting authorization','past-due':'Past due',cancelled:'Cancelled',client:'Client',bam:'BAM',other:'Other owner',unconfirmed:'To be confirmed',monthly:'per month',yearly:'per year',direct:'Paid directly to provider',invoice:'BAM invoice',paypal:'PayPal subscription'};}
export function node(tag,text,cls){const el=document.createElement(tag);if(text!=null)el.textContent=text;if(cls)el.className=cls;return el;}
export function renderHosting(host,record,{es=false,accepted=false}={}){
  host.replaceChildren();const t=hostingLabels(es);
  if(!record){host.append(node('h3',es?'Tu alojamiento, en un solo lugar':'Your hosting, in one place'),node('p',es?'Cuando acuerdes un servicio con BAM, aquí verás el proveedor, la tarifa, las renovaciones y el soporte incluido.':'Once you agree on a service with BAM, your provider, fee, renewals, and included support will appear here.'));const link=node('a',es?'Solicitar cotización de alojamiento':'Request a hosting quote','hosting-button');link.href=(es?'/es':'')+'/contact?service=Managed%20hosting';host.append(link);return;}
  const title=node('div',null,'hosting-card-head');title.append(node('h3',record.plan),node('span',t[record.status]||record.status,'hosting-badge'));host.append(title);
  host.append(node('p',es?'Estado del servicio registrado por BAM; no es un monitor automático de disponibilidad.':'Service status recorded by BAM; this is not an automatic uptime monitor.','hosting-muted'));
  const grid=node('dl',null,'hosting-details');
  const row=(label,value)=>{grid.append(node('dt',label),node('dd',value|| (es?'Por confirmar':'To be confirmed')));};
  row(es?'Proveedor':'Provider',record.provider);
  const url=safeHostingUrl(record.siteUrl);if(url){const dd=node('dd');const a=node('a',url);a.href=url;a.target='_blank';a.rel='noopener noreferrer';dd.append(a);grid.append(node('dt',es?'Sitio web':'Website'),dd);}
  row(es?'Tarifa acordada (USD)':'Agreed fee (USD)',record.feeCents==null?(es?'Según cotización':'As quoted'):new Intl.NumberFormat(es?'es-US':'en-US',{style:'currency',currency:'USD'}).format(record.feeCents/100)+' '+(t[record.cadence]||''));
  if(record.agreementNumber)row(es?'Cotización de referencia':'Quote reference',record.agreementNumber);
  row(es?'Forma de pago':'Billing arrangement',t[record.billingMode]);
  row(es?'Estado de facturación registrado':'Recorded billing status',t[record.billingStatus]);
  row(es?'Próxima renovación registrada':'Recorded next renewal',record.nextRenewal);
  row(es?'Titular del dominio':'Domain account owner',t[record.domainOwner]);row(es?'Titular del alojamiento':'Hosting account owner',t[record.hostingOwner]);
  if(record.serviceEnds)row(es?'Fecha de fin':'Service end date',record.serviceEnds);
  if(record.lastReviewed)row(es?'Última revisión manual':'Last manual review',record.lastReviewed);
  host.append(grid);
  const due=hostingDue(record);if(due)host.append(node('p',es?(due.overdue?'La renovación registrada está vencida. Confirma el estado con BAM.':'La renovación registrada está próxima. Confirma el importe y la fecha con BAM.'):(due.overdue?'The recorded renewal is overdue. Confirm the status with BAM.':'The recorded renewal is coming up. Confirm the amount and date with BAM.'),'hosting-notice'));
  for(const [key,en,label] of [['supportDetails','Included support','Soporte incluido'],['issues','Service update','Actualización del servicio'],['handoverDetails','Ownership, cancellation & handover','Propiedad, cancelación y entrega']])if(record[key]){host.append(node('h4',es?label:en),node('p',record[key],'hosting-prewrap'));}
  host.append(node('p',es?'La tarifa, el alcance y las condiciones se definen en tu acuerdo aceptado. Estos datos se actualizan manualmente; confirma los pagos y cargos futuros directamente con el proveedor de pagos. Guardar datos aquí no inicia, modifica ni cancela cobros.':'Your accepted agreement defines the fee, scope, and terms. These details are updated manually; confirm payments and future charges directly with the payment provider. Saving details here does not start, change, or cancel charges.','hosting-muted'));
  const checkout=paypalHostingLink(record,accepted);if(checkout){const a=node('a',es?'Revisar pago recurrente en PayPal':'Review recurring payment in PayPal','hosting-button');a.href=checkout;a.target='_blank';a.rel='noopener noreferrer';host.append(a,node('p',es?'Revisa en PayPal el vendedor, importe, frecuencia y condiciones antes de autorizar. Volver a este sitio no confirma un pago.':'Review the merchant, amount, frequency, and terms in PayPal before authorizing. Returning to this site does not confirm payment.','hosting-muted'));}
  const links=node('div',null,'hosting-actions');for(const [href,en,label]of [['#agreements','View agreements','Ver acuerdos'],['#invoices','View invoices','Ver facturas'],['#support','Ask about hosting or cancellation','Consultar alojamiento o cancelación']]){const a=node('a',es?label:en);a.href=href;links.append(a);}host.append(links);
}
