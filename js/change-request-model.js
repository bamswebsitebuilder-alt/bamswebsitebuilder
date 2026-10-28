import { projectAlerts } from './project-workflow.js?v=1';

export const REQUEST_STATES = ['submitted','in-review','waiting-on-client','in-progress','completed','declined','cancelled'];
export const REQUEST_SCOPES = ['unreviewed','included','extra'];
export const TERMINAL_STATES = ['completed','declined','cancelled'];
export const CANCELLABLE_STATES = ['submitted','in-review','waiting-on-client'];
const transitions = {
  submitted: ['in-review','declined','cancelled'],
  'in-review': ['waiting-on-client','in-progress','declined','cancelled'],
  'waiting-on-client': ['in-review','in-progress','declined','cancelled'],
  'in-progress': ['waiting-on-client','completed'],
  completed: [], declined: [], cancelled: []
};
export const canTransition = (from,to) => from === to || (transitions[from] || []).includes(to);
export const timeOf = value => value?.toMillis?.() || value?.toDate?.().getTime() || (value instanceof Date ? value.getTime() : 0);
export function requestInput(values) {
  const title = String(values.title || '').trim();
  const description = String(values.description || '').trim();
  const raw = String(values.pageUrl || '').trim();
  if (title.length < 3 || title.length > 150) throw Error('title');
  if (description.length < 10 || description.length > 4000) throw Error('description');
  let pageUrl;
  try { const url = new URL(raw); if (!['https:','http:'].includes(url.protocol) || url.username || url.password) throw Error(); pageUrl = url.href; } catch { throw Error('pageUrl'); }
  if (pageUrl.length > 2048) throw Error('pageUrl');
  return { title, description, pageUrl };
}
export function validateScreenshot(file) {
  if (!file) return;
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024) throw Error('screenshot');
}
export function adminRequestPatch(record, values) {
  const {status,scope} = values;
  const adminNote = String(values.adminNote || '').trim();
  if (!REQUEST_SCOPES.includes(scope) || !REQUEST_STATES.includes(status) || !canTransition(record.status,status) || adminNote.length > 2000) throw Error('review');
  if (['in-progress','completed'].includes(status) && scope === 'unreviewed') throw Error('scope');
  return { status, scope, adminNote };
}

export function buildAttentionItems({clients=[],projects=[],invoices=[],requests=[]},now=new Date()) {
  const items=[];
  const names=new Map(clients.map(c=>[c.id,c.businessName||c.fullName||c.email||'Client']));
  const add=(kind,userId,title,detail,priority,extra={})=>items.push({kind,userId,title,detail,priority,clientName:names.get(userId)||'Client',...extra});
  for(const request of requests) if(['submitted','in-review'].includes(request.status)) add('requests',request.userId,request.title,request.status,request.status==='submitted'?1:3,{requestId:request.id});
  for(const client of clients) if(Number(client.unreadByAdmin)>0) add('messages',client.id,'Unread client messages',String(client.unreadByAdmin),2);
  for(const project of projects) {
    for(const alert of projectAlerts(project,now)) add('projects',project.userId,project.title||'Website project',alert,alert.startsWith('Overdue')?0:3);
    const next=project.workflowTasks?.find(task=>!task.done);
    if(project.automationEnabled && next && ['design-approval','launch-approval'].includes(next.id)) add('projects',project.userId,project.title||'Website project','Check the next client approval task',4);
  }
  for(const invoice of invoices) if(!['paid','cancelled','canceled','void','refunded'].includes(String(invoice.status||'').toLowerCase())) {
    const due=timeOf(invoice.dueDate); const overdue=due>0&&due<new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
    add('invoices',invoice.userId,invoice.invoiceNumber||'Unpaid invoice',overdue?'Overdue invoice':'Unpaid invoice',overdue?0:5,{amount:Number(invoice.amount)||0});
  }
  return items.sort((a,b)=>a.priority-b.priority||a.clientName.localeCompare(b.clientName)||a.title.localeCompare(b.title));
}
