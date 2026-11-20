document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const spanish = document.documentElement.lang.toLowerCase().startsWith('es');
  const message = document.getElementById('message');
  const packageChoice = document.getElementById('package');
  const paymentOption = document.getElementById('payment-option');
  const templateChoice = document.getElementById('template-choice') || document.getElementById('website-template');
  const plan = (params.get('plan') || '').trim().toLowerCase();
  const packages = spanish
    ? {starter: 'Sitio inicial', business: 'Sitio empresarial', premium: 'Sitio premium'}
    : {starter: 'Starter Website', business: 'Business Website', premium: 'Premium Website'};
  const monthlyValues = {
    'starter-monthly': 'Starter Monthly - $20.83/month for 12 months',
    'business-monthly': 'Business Monthly - $41.67/month for 12 months',
    'premium-monthly': 'Premium Monthly - $70.83/month for 12 months'
  };
  const setOption = (select, value) => {
    if (!select || !value) return;
    const match = Array.from(select.options).find(option => option.value.trim().toLowerCase() === value.trim().toLowerCase());
    if (match) select.value = match.value;
  };
  // Preferences prefill an inquiry only; they never authorize a payment.
  const validPackage = value => /^(starter|business|premium)$/.test(value);
  const requestedPackage = (params.get('package') || '').trim().toLowerCase();
  const legacyPackage = /^(starter|business|premium)-monthly$/.test(plan) ? plan.split('-')[0] : '';
  const packageKey = validPackage(requestedPackage) ? requestedPackage : legacyPackage;
  const payment = (params.get('payment') || '').trim().toLowerCase();
  const monthly = payment === 'monthly' || (!payment && Boolean(legacyPackage));
  setOption(packageChoice, packages[packageKey]);
  if (payment === 'full') setOption(paymentOption, 'One-time payment');
  else if (payment === 'deposit') setOption(paymentOption, '50/50 split');
  else if (monthly && packageKey) setOption(paymentOption, monthlyValues[packageKey + '-monthly']);
  setOption(templateChoice, params.get('template'));
  const details = [];
  const selectedDesign = (params.get('template') || '').trim();
  if (selectedDesign) details.push(`${spanish ? 'Diseño elegido' : 'Selected design'}: ${selectedDesign}`);
  const demo = (params.get('demo') || '').trim();
  if (demo) details.push(spanish ? `Me interesa la demostración web ${demo}.` : `I am interested in the ${demo} website demo.`);
  for (const [key, en, es] of [['service','Requested service','Servicio solicitado'],['domain','Requested domain','Dominio solicitado'],['date','Preferred date','Fecha preferida'],['zip','ZIP code','Código postal']]) {
    const value = (params.get(key) || '').trim();
    if (value) details.push(`${spanish ? es : en}: ${value}`);
  }
  // Do not copy a prefilled choice into Project Details; visitors can still change
  // the actual submitted payment preference in the dropdown.
  if (monthly && !packageKey) details.push(spanish
    ? 'Me interesa una cotización con pagos mensuales.'
    : 'I am interested in a quote with monthly payments.');
  // A return URL is customer-provided information, not proof from PayPal.
  if ((params.get('subscribed') || '').toLowerCase() === 'yes') {
    const id = document.getElementById('paypal-subscription-id');
    const status = document.getElementById('paypal-subscription-status');
    if (id) id.value = (params.get('subscription_id') || '').trim();
    if (status) status.value = 'Customer reported — not verified';
    details.push(spanish
      ? 'Tengo una referencia de suscripción de PayPal. BAM’s debe verificarla directamente en PayPal.'
      : 'I have a PayPal subscription reference. BAM’s must verify it directly in PayPal.');
  }
  if (message && !message.value && details.length) message.value = details.join('\n');
  const preferences = document.getElementById('inquiry-preferences');
  if (preferences && [packageChoice, paymentOption, templateChoice].some(select => select?.value)) preferences.open = true;
});
