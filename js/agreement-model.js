export const TERMS_VERSION = '1-2026-10-10';
export const ACCEPTANCE_STATEMENT = 'I accept this quote and its attached project terms.';
export const QUOTE_FIELDS = ['quoteNumber','clientName','clientEmail','providerName','projectName','scope','paymentSchedule','delivery','ongoingCosts'];

export function validateQuote(quote) {
  for (const field of QUOTE_FIELDS) {
    if (typeof quote[field] !== 'string' || !quote[field].trim()) throw new Error('Complete every required quote field before issuing it.');
    if (quote[field].length > 12000) throw new Error('A quote field is too long.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(quote.clientEmail)) throw new Error('The client needs a valid email address.');
  if (!Number.isFinite(quote.amount) || quote.amount <= 0) throw new Error('Enter the agreed project price in US dollars.');
  if (!Number.isInteger(quote.revisions) || quote.revisions < 0 || quote.revisions > 20) throw new Error('Enter the included revision rounds.');
  if (quote.termsVersion !== TERMS_VERSION || !quote.termsText?.trim()) throw new Error('The attached terms could not be loaded. Please retry.');
  return quote;
}

export function quoteState(quote, acceptance, now = new Date()) {
  if (acceptance) return 'accepted';
  if (quote.state === 'withdrawn') return 'withdrawn';
  const expires = quote.expiresAt?.toDate ? quote.expiresAt.toDate() : new Date(quote.expiresAt);
  return Number.isFinite(expires.getTime()) && expires > now ? 'awaiting' : 'expired';
}

export function validateAcceptance(quote, acceptance, name, checked, now = new Date()) {
  if (quoteState(quote, acceptance, now) !== 'awaiting') throw new Error('This quote is no longer available for acceptance. Ask BAM for an updated quote.');
  if (!checked || name.trim().length < 2 || name.trim().length > 150) throw new Error('Enter your full name and confirm that you accept the quote and attached terms.');
}

export const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const date = value => {
  if (!value) return '—';
  const d = value?.toDate ? value.toDate() : new Date(value);
  return Number.isFinite(d.getTime()) ? d.toLocaleString(undefined,{timeZoneName:'short'}) : '—';
};

export function agreementCopyHtml(quote, acceptance) {
  const spanish = quote.language === 'es';
  const labels = {'Quote number':'Número de cotización','Quote record':'Registro de cotización','Service provider':'Proveedor','Client':'Cliente','Client email':'Correo del cliente','Project':'Proyecto','Total project price (USD)':'Precio total del proyecto (USD)','Payment schedule':'Calendario de pagos','Delivery estimate / target dates':'Plazo estimado / fechas objetivo','Included revision rounds':'Rondas de revisión incluidas','Hosting, domain, and ongoing costs':'Alojamiento, dominio y costos continuos','Scope and deliverables':'Alcance y entregables','Express variations to standard terms':'Variaciones expresas a los términos','Attached terms version':'Versión de términos adjuntos','Issued / provider confirmed':'Emitido / confirmado por proveedor','Quote expires':'Vencimiento','Client acceptance':'Aceptación del cliente','Acceptance statement':'Declaración de aceptación'};
  const rows = [
    ['Quote number',quote.quoteNumber],['Quote record',quote.id || 'Preview'],['Service provider',quote.providerName],
    ['Client',quote.clientName],['Client email',quote.clientEmail],['Project',quote.projectName],
    ['Total project price (USD)',new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(quote.amount)],
    ['Payment schedule',quote.paymentSchedule],['Delivery estimate / target dates',quote.delivery],['Included revision rounds',quote.revisions],
    ['Hosting, domain, and ongoing costs',quote.ongoingCosts],['Scope and deliverables',quote.scope],
    ['Express variations to standard terms',quote.variations || 'None.'],['Attached terms version',quote.termsVersion],
    ['Issued / provider confirmed',quote.issuedAt ? date(quote.issuedAt) : 'Preview — not issued'],['Quote expires',quote.expiresAt ? date(quote.expiresAt) : 'Not issued'],
    ['Client acceptance',acceptance ? `${acceptance.name} (${acceptance.email}) — ${date(acceptance.acceptedAt)}` : 'Not accepted'],
    ['Acceptance statement',acceptance?.statement || 'No client acceptance recorded.']
  ];
  return `<!doctype html><html lang="${spanish ? 'es' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(quote.quoteNumber)} — ${spanish?'Acuerdo del proyecto':'Website Project Agreement'}</title><style>body{max-width:900px;margin:30px auto;padding:24px;font:16px/1.6 Arial,sans-serif;color:#202020}h1{line-height:1.2}dt{font-weight:bold;margin-top:18px}dd{margin:4px 0;white-space:pre-wrap;overflow-wrap:anywhere}.terms{white-space:pre-wrap;overflow-wrap:anywhere}button{padding:12px;font:inherit}@media print{button{display:none}@page{margin:.65in}body{margin:0;padding:0}}</style></head><body><button onclick="window.print()">${spanish?'Imprimir / Guardar PDF':'Print / Save PDF'}</button><h1>${spanish?'Cotización y acuerdo del proyecto web':'Website Quote and Project Agreement'}</h1><dl>${rows.map(([label,value])=>`<dt>${escape(spanish ? labels[label] : label)}</dt><dd>${escape(value)}</dd>`).join('')}</dl><h2>${spanish?'Términos del proyecto adjuntos':'Attached project terms'}</h2><div class="terms">${escape(quote.termsText)}</div></body></html>`;
}

export function downloadAgreement(quote, acceptance) {
  const url=URL.createObjectURL(new Blob([agreementCopyHtml(quote,acceptance)],{type:'text/html;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=`BAM-${String(quote.quoteNumber).replace(/[^a-z0-9_-]/gi,'-')}-${quote.id || 'preview'}.html`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
