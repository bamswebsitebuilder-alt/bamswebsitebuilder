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
  const packageKey = (params.get('package') || (monthlyValues[plan] ? plan.split('-')[0] : '')).toLowerCase();
  setOption(packageChoice, packages[packageKey]);
  setOption(paymentOption, monthlyValues[plan]);
  setOption(templateChoice, params.get('template'));
  const details = [];
  const demo = (params.get('demo') || '').trim();
  if (demo) details.push(spanish ? `Me interesa la demostración web ${demo}.` : `I am interested in the ${demo} website demo.`);
  for (const [key, en, es] of [['service','Requested service','Servicio solicitado'],['date','Preferred date','Fecha preferida'],['zip','ZIP code','Código postal']]) {
    const value = (params.get(key) || '').trim();
    if (value) details.push(`${spanish ? es : en}: ${value}`);
  }
  if (monthlyValues[plan]) details.push(spanish
    ? 'Solicito una cotización escrita para este plan mensual. Quiero revisar el alcance y los términos antes de pagar.'
    : 'Please send a written quote for this monthly plan. I would like to review the scope and terms before paying.');
  const payment = (params.get('payment') || '').trim();
  if (payment) {
    if (payment === 'full') setOption(paymentOption, 'One-time payment');
    const preference = payment === 'full' ? (spanish ? 'pago completo' : 'full payment')
      : payment === 'deposit' ? (spanish ? 'depósito' : 'deposit') : payment;
    details.push(spanish
      ? `Preferencia de pago: ${preference}. Solicito una cotización y un enlace de pago después de acordar el proyecto.`
      : `Payment preference: ${preference}. Please send a written quote and a payment link after we agree on the project.`);
  }
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
