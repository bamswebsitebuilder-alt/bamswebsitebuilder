// Defaults come from the owner's published version 1 terms, not from invoices or payments.
export const AGREEMENT_PLANS = {
  starter: {name:'Starter', price:250, monthly:20.83, pages:3, weeks:'2–3', revisions:2},
  business: {name:'Business', price:500, monthly:41.67, pages:6, weeks:'3–4', revisions:2},
  premium: {name:'Premium', price:850, monthly:70.83, pages:10, weeks:'4–6', revisions:3}
};

export function prepareAgreementDraft({project={}, plan='', payment='one-time', language='en', quoteNumber}) {
  const es=language==='es';
  const draft={number:quoteNumber, provider:"BAM's Website Builder", project:project.title === 'Website Project — Onboarding' ? '' : project.title || '', language,
    amount:'', payments:'', delivery:'', revisions:'', scope:'', costs:'', variations:'', plan, payment};
  const standard=AGREEMENT_PLANS[plan];
  if (!standard) return draft;
  const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
  const monthly=payment==='monthly';
  draft.amount=monthly ? Number((standard.monthly*12).toFixed(2)) : standard.price;
  draft.revisions=standard.revisions;
  draft.payments=monthly
    ? es ? `12 pagos mensuales de ${money(standard.monthly)}; total ${money(draft.amount)}. Primer pago tras aceptar el acuerdo; los siguientes cada mes. No se cobra al aceptar aquí.`
      : `12 monthly payments of ${money(standard.monthly)}; total ${money(draft.amount)}. First payment after agreement acceptance; subsequent payments monthly. Accepting here does not collect payment.`
    : es ? `${money(standard.price/2)} (50%) tras aceptar, antes de iniciar; ${money(standard.price/2)} (50%) tras aprobar la vista previa, antes de publicar.`
      : `${money(standard.price/2)} (50%) after acceptance, before work begins; ${money(standard.price/2)} (50%) after preview approval, before launch.`;
  draft.delivery=es ? `${standard.weeks} semanas después de aceptar el acuerdo, recibir el pago inicial y todos los materiales. El plazo puede cambiar por retrasos en materiales o aprobaciones del cliente.`
    : `${standard.weeks} weeks after agreement acceptance, receipt of the initial payment and all required materials. Delays in client materials or approvals can extend this estimate.`;
  return draft;
}

export function quoteMatches(existing, quote) {
  return Object.keys(quote).every(key=>existing[key]===quote[key]);
}
