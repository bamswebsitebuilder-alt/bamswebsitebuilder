import {hostingStore} from './hosting-store.js?v=3';
import {HOSTING_FIELDS,HOSTING_STATES,BILLING_STATES,hostingValues,hostingDue,domainDue,hostingInput} from './hosting-model.js?v=3';
import {hostingLabels,node} from './hosting-view.js?v=3';

export function createAdminHosting(getAdmin,store=hostingStore){
  const host=document.getElementById('admin-hosting');if(!host)return null;
  const es=document.documentElement.lang.startsWith('es'),t=hostingLabels(es),tr=(en,spanish)=>es?spanish:en;
  let clients=[],projects=[],busy=false,loaded=false;
  const drafts=new Map();
  host.innerHTML=`<div class="hosting-summary" id="hosting-summary"></div><article class="admin-card"><h2>${tr('Hosting accounts','Cuentas de alojamiento')}</h2><p>${tr('Service and billing statuses below are manually recorded by BAM. Saving a record does not provision hosting or change payments.','Los estados del servicio y de facturación se registran manualmente. Guardar datos no contrata alojamiento ni modifica pagos.')}</p><div class="hosting-filters"><label>${tr('Search clients or websites','Buscar clientes o sitios')}<input id="hosting-search" type="search"></label><label>${tr('Show','Mostrar')}<select id="hosting-filter"><option value="all">${tr('All clients','Todos los clientes')}</option><option value="renewal">${tr('Renewal within 30 days or overdue','Renovación en 30 días o vencida')}</option><option value="attention">${tr('Service issues or past-due billing','Problemas del servicio o pagos pendientes')}</option><option value="missing">${tr('No hosting record','Sin datos de alojamiento')}</option></select></label></div><p id="hosting-load-status" role="status"></p><div id="hosting-account-list" class="hosting-account-list"></div></article><article class="admin-card"><h2>${tr('Manage client hosting and domain','Administrar alojamiento y dominio del cliente')}</h2><p>${tr('Every field is visible to the assigned client. Do not enter passwords, API keys, or private staff notes. Confirm the agreed scope, provider costs, and renewal responsibility before saving.','Todos los campos son visibles para el cliente asignado. No introduzcas contraseñas, claves API ni notas privadas. Confirma el alcance, los costos y la responsabilidad de renovación antes de guardar.')}</p><label class="hosting-client-label">${tr('Choose a client','Elige un cliente')}<select id="hosting-client"><option value="">${tr('Choose a client','Elige un cliente')}</option></select></label><form id="hosting-form" class="hosting-form"><fieldset disabled><legend>${tr('Service details','Datos del servicio')}</legend><p><button class="admin-secondary-button" type="button" id="hosting-standard-plan">${tr("Use $39/month hosting plan","Usar plan de alojamiento de $39/mes")}</button></p><div class="hosting-form-grid" id="hosting-fields"></div><p>${tr('Use the $39/month hosting plan for new clients, or enter a different PayPal P- plan ID for a custom agreement. The standard plan has no setup fee or trial and renews monthly until canceled. Domain registration, email, content updates, and maintenance are separate. Use a quote accepted by this client that explicitly includes the hosting fee and schedule. The amount and frequency entered here must match the PayPal plan. The client authorizes payment in PayPal. Update the recorded status after verifying PayPal directly; this dashboard does not synchronize payments.','Usa el plan de alojamiento de $39/mes para nuevos clientes, o introduce otro ID P- de PayPal para un acuerdo personalizado. El plan estándar no tiene tarifa inicial ni prueba gratuita y se renueva mensualmente hasta cancelarlo. El dominio, correo, cambios de contenido y mantenimiento se cotizan por separado. Usa una cotización aceptada por este cliente que incluya la tarifa y frecuencia de alojamiento. El importe y frecuencia aquí deben coincidir con el plan de PayPal. El cliente autoriza el pago en PayPal. Actualiza el estado tras verificarlo directamente en PayPal; este panel no sincroniza pagos.')}</p><div class="hosting-actions"><button class="admin-primary-button" type="submit">${tr('Save hosting details','Guardar alojamiento')}</button><button class="admin-secondary-button" type="button" id="hosting-reload">${tr('Reload saved details','Recargar datos guardados')}</button></div></fieldset><p id="hosting-save-status" role="status" aria-live="polite"></p></form></article>`;
  const form=document.getElementById('hosting-form'),fields=document.getElementById('hosting-fields'),clientSelect=document.getElementById('hosting-client'),status=document.getElementById('hosting-save-status'),fieldset=form.querySelector('fieldset'),list=document.getElementById('hosting-account-list');
  const addField=(key,en,spanish,{type='text',options,limit=100,wide=false}={})=>{
    const label=node('label',tr(en,spanish),wide?'hosting-wide':'');let input;
    if(options){input=node('select');for(const [value,label] of options){const option=node('option',label);option.value=value;input.append(option);}}
    else {input=node(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;else input.rows=3;input.maxLength=limit;}
    input.name=key;if(['plan','provider'].includes(key))input.required=true;if(key==='fee'){input.min='0.01';input.max='100000';input.step='0.01';}
    label.append(input);fields.append(label);
  };
  addField('plan','Agreed plan name','Nombre del plan acordado');addField('provider','Hosting provider','Proveedor de alojamiento');
  addField('siteUrl','Website URL (https://)','URL del sitio (https://)',{type:'url',limit:2048});addField('status','Service status','Estado del servicio',{options:HOSTING_STATES.map(v=>[v,t[v]])});
  addField('nextRenewal','Next renewal date','Próxima renovación',{type:'date'});addField('lastReviewed','Last manual review','Última revisión manual',{type:'date'});
  addField('fee','Agreed recurring fee (USD; blank if unquoted)','Tarifa recurrente (USD; vacío sin cotización)',{type:'number'});
  addField('cadence','Billing frequency','Frecuencia de pago',{options:[['monthly',tr('Monthly','Mensual')],['yearly',tr('Yearly','Anual')]]});
  addField('billingMode','Billing arrangement','Forma de pago',{options:['direct','invoice','paypal'].map(v=>[v,t[v]])});addField('billingStatus','Recorded billing status','Estado de facturación registrado',{options:BILLING_STATES.map(v=>[v,t[v]])});
  addField('paypalPlanId','PayPal recurring plan ID (optional)','ID del plan recurrente de PayPal (opcional)',{limit:64});addField('agreementNumber','Accepted portal quote number','Número de cotización aceptada');
  const owners=['unconfirmed','client','bam','other'].map(v=>[v,t[v]]);addField('hostingOwner','Hosting account owner','Titular del alojamiento',{options:owners});
  fields.append(node('h3',tr('Domain details','Datos del dominio'),'hosting-wide'));
  addField('domainName','Domain name (example.com; no https://)','Dominio (ejemplo.com; sin https://)',{limit:253});
  addField('domainRegistrar','Domain registrar','Registrador del dominio');
  addField('domainOwner','Domain account owner','Titular del dominio',{options:owners});
  addField('domainRenewal','Domain renewal date','Fecha de renovación del dominio',{type:'date'});
  addField('domainManageUrl','Registrar account URL (https://; no credentials)','URL de la cuenta del registrador (https://; sin credenciales)',{type:'url',limit:2048,wide:true});
  fields.append(node('p',tr('Record the client’s existing or agreed domain here. Registration and renewal costs are separate from the $39 hosting plan. Saving these details does not register, transfer, or renew a domain.','Registra el dominio existente o acordado del cliente. El registro y renovación son independientes del plan de alojamiento de $39. Guardar estos datos no registra, transfiere ni renueva un dominio.'),'hosting-wide hosting-muted'));
  fields.append(node('h3',tr('Support and handover','Soporte y entrega'),'hosting-wide'));
  addField('serviceEnds','Service end date (when ending or ended)','Fin del servicio (si finaliza o finalizó)',{type:'date'});
  addField('supportDetails','Included support and response arrangements','Soporte incluido y plazos de respuesta',{type:'textarea',limit:2000,wide:true});
  addField('handoverDetails','Ownership, cancellation and handover arrangements','Propiedad, cancelación y entrega',{type:'textarea',limit:2000,wide:true});
  addField('issues','Client-visible service issues or update','Problemas o actualización visibles al cliente',{type:'textarea',limit:2000,wide:true});
  const label=client=>client.businessName||client.fullName||client.email||client.id;
  const projectFor=uid=>projects.find(p=>p.userId===uid);
  const values=()=>Object.fromEntries(HOSTING_FIELDS.map(key=>[key,form.elements.namedItem(key).value]));
  const currentDraft=()=>drafts.get(clientSelect.value);
  function loadForm(){
    const uid=clientSelect.value;status.textContent='';fieldset.disabled=!uid||busy;
    if(!uid)return;
    if(!drafts.has(uid)){const record=projectFor(uid)?.hosting;drafts.set(uid,{values:hostingValues(record),revision:record?.revision||0});}
    const draft=currentDraft();for(const key of HOSTING_FIELDS)form.elements.namedItem(key).value=draft.values[key]??'';
  }
  form.addEventListener('input',()=>{if(clientSelect.value&&currentDraft())currentDraft().values=values();});
  clientSelect.addEventListener('change',loadForm);
  document.getElementById('hosting-reload').addEventListener('click',()=>{drafts.delete(clientSelect.value);loadForm();});
  document.getElementById('hosting-standard-plan').addEventListener('click',()=>{
    if(busy||!clientSelect.value||!currentDraft())return;
    // Configure the selected draft only. Do not create a subscription or mark payment active.
    const next={...values(),plan:"BAM’s Managed Website Hosting",fee:'39.00',cadence:'monthly',billingMode:'paypal',paypalPlanId:'P-61X62492NG9864027NLRJU6A'};
    if(next.billingStatus==='not-configured')next.billingStatus='awaiting-approval';
    currentDraft().values=next;
    for(const key of HOSTING_FIELDS)form.elements.namedItem(key).value=next[key]??'';
    status.textContent=tr('Plan added to this draft. Enter the provider and accepted hosting quote number, then save. Existing payments are unchanged.','Plan añadido al borrador. Introduce el proveedor y número de cotización de alojamiento aceptada, y guarda. Los pagos existentes no cambian.');
  });
  function renderList(){
    const search=document.getElementById('hosting-search').value.trim().toLowerCase(),filter=document.getElementById('hosting-filter').value;
    const records=clients.map(client=>({client,hosting:projectFor(client.id)?.hosting}));
    const attention=h=>h?.status==='attention'||h?.billingStatus==='past-due'||Boolean(h?.issues)&&h.status!=='ended';
    const summary=document.getElementById('hosting-summary');summary.replaceChildren();
    for(const [title,count]of [[tr('Active hosting','Alojamientos activos'),records.filter(r=>r.hosting?.status==='active').length],[tr('Renewals to review','Renovaciones para revisar'),records.filter(r=>hostingDue(r.hosting)||domainDue(r.hosting)).length],[tr('Needs attention','Requiere atención'),records.filter(r=>attention(r.hosting)).length]]){const card=node('article',null,'hosting-summary-card');card.append(node('span',title),node('strong',loaded?String(count):'—'));summary.append(card);}
    list.replaceChildren();
    const shown=records.filter(({client,hosting:h})=>(label(client)+' '+(h?.siteUrl||'')+' '+(h?.domainName||'')).toLowerCase().includes(search)&&(filter==='all'||filter==='renewal'&&(hostingDue(h)||domainDue(h))||filter==='attention'&&attention(h)||filter==='missing'&&!h));
    for(const {client,hosting:h}of shown){const item=node('article',null,'hosting-account');const details=node('div');details.append(node('h3',label(client)),node('p',h?`${h.plan} · ${t[h.status]||h.status}`:tr('No hosting record','Sin datos de alojamiento')));if(h?.domainName)details.append(node('p',tr('Domain: ','Dominio: ')+h.domainName));if(h?.domainRenewal)details.append(node('p',tr('Domain renewal: ','Renovación del dominio: ')+h.domainRenewal));if(h?.nextRenewal)details.append(node('p',tr('Renewal: ','Renovación: ')+h.nextRenewal));if(h?.issues)details.append(node('p',h.issues,'hosting-prewrap'));const open=node('button',tr('Manage hosting','Administrar alojamiento'),'admin-small-button');open.type='button';open.disabled=busy;open.addEventListener('click',()=>{clientSelect.value=client.id;loadForm();clientSelect.focus();form.scrollIntoView({behavior:'smooth',block:'start'});});item.append(details,open);list.append(item);}
    if(!shown.length)list.append(node('p',tr('No clients match this view.','No hay clientes que coincidan.')));
  }
  document.getElementById('hosting-search').addEventListener('input',renderList);document.getElementById('hosting-filter').addEventListener('change',renderList);
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!clientSelect.value||!getAdmin())return;
    const uid=clientSelect.value,draft=currentDraft(),admin=getAdmin();draft.values=values();
    try{hostingInput(draft.values);}catch(error){status.textContent=tr('Check the required fields, domain name (without https://), dates, HTTPS URLs, fee, and PayPal/accepted agreement details.','Revisa los campos obligatorios, dominio (sin https://), fechas, URL HTTPS, tarifa y datos de PayPal/acuerdo aceptado.');return;}
    busy=true;fieldset.disabled=true;clientSelect.disabled=true;renderList();status.textContent=tr('Saving…','Guardando…');
    try{
      const revision=await store.save(uid,draft.values,draft.revision,admin.uid);
      if(getAdmin()?.uid!==admin.uid)return;
      draft.revision=revision;status.textContent=tr('Hosting details saved. No payment or hosting account was changed.','Datos guardados. No se modificó ningún pago ni cuenta de alojamiento.');
    }catch(error){
      const messages={conflict:tr('Another update was saved first. Your draft is still here. Use Reload saved details before trying again.','Se guardó otra actualización primero. Tu borrador sigue aquí. Recarga los datos guardados antes de reintentar.'),'no-project':tr('Save a project for this client first, then reload this page.','Guarda primero un proyecto para este cliente y recarga la página.'),'not-accepted':tr('This client must accept the specified portal quote before a PayPal plan can be linked. Enter the quote number shown in Agreements.','El cliente debe aceptar la cotización indicada antes de vincular PayPal. Introduce el número que aparece en Acuerdos.')};
      if(getAdmin()?.uid===admin.uid)status.textContent=messages[error.message]||tr('Could not save. Your draft is still here; check your connection and try again.','No se pudo guardar. Conservamos tu borrador; revisa la conexión y reintenta.');
    }finally{busy=false;clientSelect.disabled=false;fieldset.disabled=!clientSelect.value;renderList();}
  });
  return {
    update(nextClients,nextProjects,{loading=false,error=false}={}){
      clients=nextClients;projects=nextProjects;loaded=!loading;
      const selected=clientSelect.value;clientSelect.replaceChildren();const empty=node('option',tr('Choose a client','Elige un cliente'));empty.value='';clientSelect.append(empty);
      for(const client of clients){const option=node('option',label(client));option.value=client.id;clientSelect.append(option);}
      clientSelect.value=clients.some(c=>c.id===selected)?selected:'';
      for(const uid of drafts.keys())if(!clients.some(c=>c.id===uid))drafts.delete(uid);
      if(!clientSelect.value)fieldset.disabled=true;
      document.getElementById('hosting-load-status').textContent=error?tr('Some records could not be loaded. Refresh before relying on these totals.','No se pudieron cargar algunos datos. Recarga antes de usar estos totales.'):loading?tr('Loading hosting records…','Cargando alojamiento…'):'';
      renderList();
    },
    reset(){clients=[];projects=[];drafts.clear();loaded=false;clientSelect.replaceChildren();form.reset();fieldset.disabled=true;status.textContent='';list.replaceChildren();document.getElementById('hosting-summary').replaceChildren();}
  };
}
