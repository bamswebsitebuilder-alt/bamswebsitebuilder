import {requestStore} from './change-request-store.js?v=1';
import {buildAttentionItems,TERMINAL_STATES,timeOf} from './change-request-model.js?v=1';
import {requestCards,node,feedback,t,stateLabel} from './change-request-view.js?v=1';

export function createAdminRequests(navigate,store=requestStore) {
  const host=document.getElementById('admin-change-requests');if(!host)return null;
  const filter=document.getElementById('request-client-filter'),stateFilter=document.getElementById('request-state-filter'),message=document.getElementById('admin-request-status');
  const attention=document.getElementById('attention-list'),count=document.getElementById('attention-count'),kindFilter=document.getElementById('attention-filter'),loading=document.getElementById('attention-status');
  const streams=new Map(),byClient=new Map(),errors=new Set(),drafts=new Map(),open=new Set();let data={clients:[],projects:[],invoices:[],loading:true},epoch=0;
  const records=()=>[...byClient.values()].flat().sort((a,b)=>timeOf(b.createdAt)-timeOf(a.createdAt));
  function render(){
    const selected=records().filter(r=>(!filter.value||r.userId===filter.value)&&(stateFilter.value==='all'||!TERMINAL_STATES.includes(r.status)));
    requestCards(host,selected,{store,admin:true,clients:data.clients,drafts,open,onSave:async(record,values)=>{await store.review(record,values);drafts.delete(record.userId+'/'+record.id);render();}});
    feedback(message,errors.size?t('Some requests could not load. Refresh to retry; the queue may be incomplete.','Algunas solicitudes no se pudieron cargar. Actualiza para reintentar; la lista puede estar incompleta.'):t('Showing up to the latest 100 requests per client.','Se muestran hasta las últimas 100 solicitudes por cliente.'),errors.size>0);
    renderAttention();
  }
  function renderAttention(){
    const items=buildAttentionItems({...data,requests:records()});const shown=items.filter(item=>!kindFilter.value||item.kind===kindFilter.value);
    count.textContent=String(items.length);attention.replaceChildren();
    const pending=data.loading||errors.size||data.warning||[...streams.keys()].some(id=>!byClient.has(id));
    feedback(loading,pending?t('Some information is still loading or unavailable. The queue may be incomplete.','Hay información cargando o no disponible. La lista puede estar incompleta.'):'',!!(errors.size||data.warning));
    if(!shown.length){attention.append(node('p',pending?t('Waiting for the remaining information…','Esperando la información restante…'):t('Nothing needs your attention in this view.','Nada requiere tu atención en esta vista.')));return;}
    const translations={'Unread client messages':'Mensajes de clientes sin leer','Unpaid invoice':'Factura pendiente','Overdue invoice':'Factura vencida','Overdue — review the deadline and next task.':'Plazo vencido: revisa la fecha y la próxima tarea.','Due within 3 days.':'Vence dentro de 3 días.','Waiting on client materials or approval.':'Esperando materiales o aprobación del cliente.','Check the next client approval task':'Revisa la próxima aprobación del cliente'};
    for(const item of shown){const row=node('li',undefined,'attention-item');const copy=node('div');const detail=item.kind==='requests'?stateLabel(item.detail):t(item.detail,translations[item.detail]||item.detail);copy.append(node('strong',item.clientName),node('p',item.title),node('p',detail,'request-meta'));const button=node('button',t('Open','Abrir'),'request-secondary');button.type='button';button.addEventListener('click',()=>{if(item.kind==='requests'){filter.value=item.userId;stateFilter.value='all';open.add(item.userId+'/'+item.requestId);render();}navigate(item.kind,item.userId,item.requestId);});row.append(copy,button);attention.append(row);}
  }
  filter.addEventListener('change',()=>{drafts.clear();render();});stateFilter.addEventListener('change',render);kindFilter.addEventListener('change',renderAttention);
  return {update(next){data={...data,...next};const keep=filter.value;filter.replaceChildren(node('option',t('All clients','Todos los clientes')));filter.options[0].value='';for(const client of data.clients){const option=node('option',client.businessName||client.fullName||client.email||t('Client','Cliente'));option.value=client.id;filter.append(option);}filter.value=data.clients.some(c=>c.id===keep)?keep:'';
    const ids=new Set(data.clients.map(c=>c.id));for(const [id,stop] of streams)if(!ids.has(id)){stop();streams.delete(id);byClient.delete(id);errors.delete(id);}
    for(const id of ids)if(!streams.has(id)){const version=epoch;streams.set(id,store.watch(id,rows=>{if(version!==epoch)return;byClient.set(id,rows);errors.delete(id);render();},()=>{if(version!==epoch)return;errors.add(id);render();}));}
    render();
  },reset(){epoch++;streams.forEach(stop=>stop());streams.clear();byClient.clear();errors.clear();drafts.clear();data={clients:[],projects:[],invoices:[],loading:true};render();},openClient(uid){filter.value=uid;render();}};
}
