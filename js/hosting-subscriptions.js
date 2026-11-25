import { button, el, portalRequest, spanish, t } from './portal-services.js';

const statuses = {
  CREATING: ['Preparing checkout', 'Preparando el pago'],
  APPROVAL_PENDING: ['Awaiting PayPal approval', 'Pendiente de autorización de PayPal'],
  APPROVED: ['Approved by PayPal', 'Autorizada por PayPal'],
  ACTIVE: ['Active', 'Activa'],
  SUSPENDED: ['Suspended', 'Suspendida'],
  CANCELLED: ['Cancelled', 'Cancelada'],
  EXPIRED: ['Expired', 'Vencida']
};

const dollars = cents => new Intl.NumberFormat(spanish ? 'es-US' : 'en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
const date = value => value ? new Date(value).toLocaleDateString(spanish ? 'es-US' : 'en-US') : '—';
const dashboard = 'https://www.sandbox.paypal.com/myaccount/autopay/';

export function showSubscription(host, user, { accepted = false, enrollment, adminUid, stillCurrent = () => true } = {}) {
  const status = el('p');
  status.setAttribute('role', 'status');
  const content = el('div');
  host.replaceChildren(el('h3', t('PayPal hosting subscription · Sandbox', 'Suscripción de alojamiento PayPal · Sandbox')), status, content);
  const selected = adminUid ? { uid: adminUid } : {};
  let enabled = false;
  let checkout = '';

  function render(billing) {
    content.replaceChildren();
    if (billing) {
      const info = el('dl');
      const rows = [
        [t('PayPal status', 'Estado de PayPal'), t(...statuses[billing.status])],
        [t('Recurring fee', 'Tarifa recurrente'), dollars(billing.feeCents) + (billing.cadence === 'yearly' ? t(' per year', ' al año') : t(' per month', ' al mes'))],
        [t('Next billing date', 'Próximo cobro'), date(billing.nextBillingTime)],
        [t('Last payment', 'Último pago'), date(billing.lastPayment)]
      ];
      for (const [label, value] of rows) info.append(el('dt', label), el('dd', value));
      content.append(info);
      const nextBilling = Date.parse(billing.nextBillingTime);
      if (billing.status === 'ACTIVE' && nextBilling >= Date.now() && nextBilling <= Date.now() + 7 * 86400000) {
        content.append(el('p', t('Your next PayPal renewal is within seven days.', 'Tu próxima renovación en PayPal es dentro de siete días.'), 'hosting-notice'));
      }
      if (billing.paymentAttention) content.append(el('p', t('A PayPal payment needs attention.', 'Un pago de PayPal requiere atención.'), 'hosting-notice'));
    }
    if (!billing && adminUid) content.append(el('p', t('No automated subscription on file.', 'No hay una suscripción automatizada.')));
    if (!adminUid && enrollment && !enabled && !billing) content.append(el('p',
      t('BAM has not enabled sandbox checkout for this plan.', 'BAM aún no ha habilitado el pago de prueba para este plan.')));
    if (!adminUid && enabled && !accepted && !billing) content.append(el('p',
      t('Accept your hosting quote in Agreements to continue.', 'Acepta tu cotización de alojamiento en Acuerdos para continuar.')));

    const actions = el('div', '', 'hosting-actions');
    if (billing && billing.status !== 'CREATING') actions.append(button(t('Refresh PayPal status', 'Actualizar estado de PayPal'), () => request('billing-refresh')));
    if (!adminUid && enabled && accepted && (!billing || billing.status === 'CREATING')) actions.append(button(
      t('Set up sandbox subscription', 'Configurar suscripción de prueba'), () => request('billing-create'), true));
    if (!adminUid && enabled && accepted && checkout && billing?.status === 'APPROVAL_PENDING') {
      const link = el('a', t('Approve on PayPal Sandbox', 'Autorizar en PayPal Sandbox'), 'hosting-button');
      link.href = checkout;
      link.rel = 'noreferrer';
      actions.append(link);
    }
    if (!adminUid && billing && ['ACTIVE', 'APPROVED', 'SUSPENDED'].includes(billing.status)) {
      const link = el('a', t('Manage in PayPal Sandbox', 'Administrar en PayPal Sandbox'));
      link.href = dashboard;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      actions.append(link);
    }
    content.append(actions);
  }

  async function request(action) {
    const controls = content.querySelectorAll('button');
    for (const control of controls) control.disabled = true;
    status.textContent = t('Checking PayPal billing…', 'Consultando la facturación de PayPal…');
    try {
      const result = await portalRequest(user, action, { ...selected, language: spanish ? 'es' : 'en' });
      if (!stillCurrent()) return;
      enabled = result.enabled ?? enabled;
      checkout = result.checkout ?? checkout;
      status.textContent = '';
      render(result.billing);
      if (action === 'billing-read' && !adminUid && result.billing && new URLSearchParams(location.search).has('hostingReturn')) {
        const clean = new URL(location.href);
        for (const param of ['hostingReturn', 'subscription_id', 'ba_token', 'token']) clean.searchParams.delete(param);
        history.replaceState(history.state, '', clean);
        await request('billing-refresh');
      }
    } catch (error) {
      if (stillCurrent()) {
        status.textContent = error.message;
        if (!content.childElementCount) content.append(button(t('Retry', 'Reintentar'), () => request(action)));
      }
    } finally {
      for (const control of controls) control.disabled = false;
    }
  }

  return request('billing-read');
}

export function createAdminBilling(host, getAdmin, clientSelect) {
  const metrics = el('div', '', 'hosting-summary');
  const account = el('div', '', 'bam-billing');
  const status = el('p');
  status.setAttribute('role', 'status');
  host.replaceChildren(el('h2', t('Automated hosting billing · PayPal Sandbox', 'Facturación automatizada · PayPal Sandbox')),
    button(t('Load billing metrics', 'Consultar métricas de facturación'), loadMetrics), status, metrics, account);
  let request = 0;

  async function loadMetrics() {
    const admin = getAdmin();
    if (!admin) return;
    const current = ++request;
    status.textContent = t('Loading metrics…', 'Cargando métricas…');
    try {
      const summary = await portalRequest(admin, 'billing-metrics');
      if (current !== request || getAdmin()?.uid !== admin.uid) return;
      status.textContent = '';
      metrics.replaceChildren();
      const items = [
        [t('Active subscriptions', 'Suscripciones activas'), String(summary.active)],
        [t('Monthly recurring revenue', 'Ingresos recurrentes mensuales'), dollars(summary.monthlyCents)],
        [t('Renewals in 30 days', 'Renovaciones en 30 días'), String(summary.renewals)],
        [t('Payments or accounts needing attention', 'Pagos o cuentas que requieren atención'), String(summary.attention)]
      ];
      for (const [label, value] of items) {
        const card = el('article', '', 'hosting-summary-card');
        card.append(el('span', label), el('strong', value));
        metrics.append(card);
      }
    } catch (error) {
      if (current === request && getAdmin()?.uid === admin.uid) status.textContent = error.message;
    }
  }

  let accountRequest = 0;
  function loadAccount() {
    const current = ++accountRequest;
    account.replaceChildren();
    const admin = getAdmin();
    const uid = clientSelect.value;
    if (!uid || !admin) return;
    showSubscription(account, admin, {
      adminUid: uid, stillCurrent: () => current === accountRequest && getAdmin()?.uid === admin.uid
    });
  }
  return { loadAccount, reset() { request++; accountRequest++; metrics.replaceChildren(); account.replaceChildren(); status.textContent = ''; } };
}
