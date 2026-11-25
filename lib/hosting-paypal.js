import { randomUUID } from 'node:crypto';
import { hasAgreedHostingTerms } from '../js/hosting-model.js';
import { PortalError, requireValue } from './portal-access.js';

const API = 'https://api-m.sandbox.paypal.com';
const planId = value => typeof value === 'string' && /^P-[A-Z0-9]{5,60}$/.test(value);
const subscriptionId = value => typeof value === 'string' && /^I-[A-Z0-9]{5,60}$/.test(value);
const STATUS = new Set(['APPROVAL_PENDING', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'EXPIRED']);
const EVENTS = new Set([
  'BILLING.SUBSCRIPTION.CREATED', 'BILLING.SUBSCRIPTION.ACTIVATED', 'BILLING.SUBSCRIPTION.UPDATED',
  'BILLING.SUBSCRIPTION.SUSPENDED', 'BILLING.SUBSCRIPTION.CANCELLED', 'BILLING.SUBSCRIPTION.EXPIRED',
  'BILLING.SUBSCRIPTION.PAYMENT.FAILED', 'PAYMENT.SALE.COMPLETED'
]);

export function paypalSandbox(env = process.env, request = fetch) {
  const { PAYPAL_HOSTING_ENV: mode, PAYPAL_HOSTING_CLIENT_ID: id, PAYPAL_HOSTING_CLIENT_SECRET: secret,
    PAYPAL_HOSTING_WEBHOOK_ID: webhook, PAYPAL_HOSTING_RETURN_ORIGIN: returnOrigin } = env;
  const planIds = new Set((env.PAYPAL_HOSTING_PLAN_IDS || '').split(',').map(value => value.trim()).filter(planId));
  const origin = URL.canParse(returnOrigin) ? new URL(returnOrigin) : null;
  if (mode !== 'sandbox' || !id || !secret || !webhook || !planIds.size ||
      origin?.protocol !== 'https:' || origin.origin !== returnOrigin) return null;

  async function fetchJson(url, options) {
    const response = await request(API + url, { ...options, signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new PortalError(502, 'PayPal could not confirm the request. Try again shortly.');
    return response.json();
  }

  let access;
  async function api(path, data, headers) {
    access ??= fetchJson('/v1/oauth2/token', {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(id + ':' + secret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials'
    });
    const { access_token } = await access;
    requireValue(typeof access_token === 'string' && access_token, 'PayPal authorization is unavailable.', 502);
    return fetchJson(path, {
      method: data === undefined ? 'GET' : 'POST',
      headers: { Authorization: 'Bearer ' + access_token, 'Content-Type': 'application/json', ...headers },
      ...(data === undefined ? {} : { body: typeof data === 'string' ? data : JSON.stringify(data) })
    });
  }

  return {
    planIds,
    plan: id => api('/v1/billing/plans/' + id),
    create(attempt, spanish) {
      const portal = returnOrigin + (spanish ? '/es' : '') + '/client-portal?hostingReturn=1#hosting';
      return api('/v1/billing/subscriptions', {
        plan_id: attempt.planId, custom_id: attempt.key, quantity: '1',
        application_context: {
          brand_name: 'BAM’s Website Builder', shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW', return_url: portal, cancel_url: portal
        }
      }, { 'PayPal-Request-Id': attempt.key, Prefer: 'return=representation' });
    },
    subscription: id => api('/v1/billing/subscriptions/' + id),
    async verify(headers, rawEvent) {
      const mapping = {
        auth_algo: 'paypal-auth-algo', cert_url: 'paypal-cert-url', transmission_id: 'paypal-transmission-id',
        transmission_sig: 'paypal-transmission-sig', transmission_time: 'paypal-transmission-time'
      };
      const data = Object.fromEntries(Object.entries(mapping).map(([key, header]) => [key, headers[header]]));
      if (!Object.values(data).every(value => typeof value === 'string' && value.length > 0 && value.length <= 4096)) return false;
      // PayPal verifies the event bytes as sent, including whitespace and the original key order.
      const cert = URL.canParse(data.cert_url) ? new URL(data.cert_url) : null;
      if (data.auth_algo !== 'SHA256withRSA' || !cert || cert.username || cert.password
        || !['https://api-m.sandbox.paypal.com', 'https://api.sandbox.paypal.com'].includes(cert.origin)
        || !/^\/v1\/notifications\/certs\/[A-Za-z0-9-]+$/.test(cert.pathname) || cert.search || cert.hash) return false;
      const envelope = JSON.stringify({ ...data, webhook_id: webhook });
      const payload = envelope.slice(0, -1) + ',"webhook_event":' + rawEvent + '}';
      const result = await api('/v1/notifications/verify-webhook-signature', payload);
      return result.verification_status === 'SUCCESS';
    }
  };
}

function cents(money) {
  return money?.currency_code === 'USD' && /^\d{1,6}(\.\d{1,2})?$/.test(money.value)
    ? Math.round(Number(money.value) * 100) : null;
}

export function matchesPlan(plan, attempt) {
  const cycle = plan.billing_cycles?.[0];
  const setupFee = plan.payment_preferences?.setup_fee;
  return plan.id === attempt.planId && plan.status === 'ACTIVE'
    && plan.billing_cycles?.length === 1 && cycle.tenure_type === 'REGULAR' && cycle.total_cycles === 0
    && cycle.frequency?.interval_count === 1
    && cycle.frequency.interval_unit === (attempt.cadence === 'yearly' ? 'YEAR' : 'MONTH')
    && cents(cycle.pricing_scheme?.fixed_price) === attempt.feeCents
    && (!setupFee || cents(setupFee) === 0) && Number(plan.taxes?.percentage ?? 0) === 0;
}

function approvalLink(response) {
  const value = response.links?.find(link => link.rel === 'approve' && link.method === 'GET')?.href;
  const url = URL.canParse(value) ? new URL(value) : null;
  return url?.origin === 'https://www.sandbox.paypal.com' && !url.username && !url.password ? url.href : '';
}

function customerStatus(record) {
  if (!record) return null;
  const { status, nextBillingTime, lastPayment, failedPayments, paymentAttention, feeCents, cadence } = record;
  return { status, nextBillingTime, lastPayment, failedPayments, paymentAttention, feeCents, cadence };
}

function sameEnrollment(record, hosting) {
  return record.planId === hosting.paypalPlanId && record.agreementId === hosting.agreementId
    && record.feeCents === hosting.feeCents && record.cadence === hosting.cadence;
}

function eligibleHosting(paypal, hosting) {
  return hosting?.billingMode === 'paypal-automated' && hosting.billingStatus === 'awaiting-approval'
    && ['setup', 'active'].includes(hosting.status) && paypal?.planIds.has(hosting.paypalPlanId)
    && Number.isSafeInteger(hosting.feeCents) && hosting.feeCents > 0 && ['monthly', 'yearly'].includes(hosting.cadence)
    && /^[a-f0-9]{64}$/.test(hosting.agreementId || '');
}

export async function hostingBilling(db, paypal, uid, action, spanish = false) {
  const ref = db.doc('portalHostingSubscriptions/' + uid);
  const projectRef = db.doc('users/' + uid + '/projects/current');
  if (action === 'billing-read') {
    const [billing, project] = await Promise.all([ref.get(), projectRef.get()]);
    const hosting = project.data()?.hosting;
    const record = billing.data();
    const enabled = Boolean(eligibleHosting(paypal, hosting));
    const canResume = enabled && record?.status === 'APPROVAL_PENDING' && sameEnrollment(record, hosting);
    return { billing: customerStatus(record), enabled, checkout: canResume ? record.approval : '' };
  }

  requireValue(paypal, 'Sandbox billing is not configured.', 503);
  if (action === 'billing-refresh') {
    const saved = (await ref.get()).data();
    if (!saved?.id) return { billing: customerStatus(saved) };
    return { billing: customerStatus(await syncSubscription(db, paypal, ref, saved.id)) };
  }

  const preflight = (await projectRef.get()).data()?.hosting;
  requireValue(eligibleHosting(paypal, preflight), 'An approved hosting setup is required.', 409);
  const plan = await paypal.plan(preflight.paypalPlanId);

  const attempt = await db.runTransaction(async tx => {
    const [snapshot, project, profile] = await Promise.all([tx.get(ref), tx.get(projectRef), tx.get(db.doc('users/' + uid))]);
    requireValue(profile.data()?.role === 'client', 'Access denied.', 403);
    const previous = snapshot.data();
    const hosting = project.data()?.hosting;
    requireValue(eligibleHosting(paypal, hosting), 'An approved hosting setup is required.', 409);
    requireValue(matchesPlan(plan, { planId: hosting.paypalPlanId, feeCents: hosting.feeCents, cadence: hosting.cadence }),
      'The PayPal plan does not match the agreed hosting terms.', 409);
    const agreementRef = db.doc('users/' + uid + '/agreements/' + hosting.agreementId);
    const [agreement, acceptance] = await Promise.all([tx.get(agreementRef), tx.get(agreementRef.collection('acceptances').doc('client'))]);
    requireValue(agreement.data()?.state === 'issued' && acceptance.data()?.clientUid === uid,
      'Accept the hosting agreement first.', 409);
    requireValue(agreement.data().quoteNumber === hosting.agreementNumber && acceptance.data().quoteId === hosting.agreementId
      && hasAgreedHostingTerms(agreement.data(), hosting.feeCents, hosting.cadence),
      'The accepted quote does not match the recurring hosting terms.', 409);
    if (previous) {
      requireValue(sameEnrollment(previous, hosting),
      'Contact BAM to review the existing subscription before changing plans.', 409);
      requireValue(previous.id || Date.now() - previous.createdAt < 86400000,
        'Contact BAM to reconcile the existing PayPal request.', 409);
      return previous;
    }
    const next = { key: randomUUID(), status: 'CREATING', createdAt: Date.now(), agreementId: hosting.agreementId,
      planId: hosting.paypalPlanId, feeCents: hosting.feeCents, cadence: hosting.cadence, mode: 'sandbox', spanish };
    tx.create(ref, next);
    return next;
  });
  if (attempt.id) return { billing: customerStatus(attempt), checkout: attempt.status === 'APPROVAL_PENDING' ? attempt.approval : '' };
  const response = await paypal.create(attempt, attempt.spanish);
  const approval = approvalLink(response);
  requireValue(subscriptionId(response.id) && approval, 'PayPal did not return a usable approval link.', 502);
  const saved = await db.runTransaction(async tx => {
    const current = (await tx.get(ref)).data();
    requireValue(current?.key === attempt.key && (!current.id || current.id === response.id), 'Subscription changed. Contact BAM.', 409);
    if (current.id) return current;
    const next = { ...current, id: response.id, status: 'APPROVAL_PENDING', approval };
    tx.set(ref, next);
    tx.create(db.doc('portalPayPalSubscriptions/' + response.id), { uid });
    return next;
  });
  return { billing: customerStatus(saved), checkout: saved.status === 'APPROVAL_PENDING' ? saved.approval : '' };
}

async function syncSubscription(db, paypal, ref, id, event) {
  const readStarted = Date.now();
  const eventRef = event && db.doc('portalPayPalEvents/' + event.id);
  if (eventRef && (await eventRef.get()).exists) return;
  const remote = await paypal.subscription(id);
  return db.runTransaction(async tx => {
    const [snapshot, handled] = await Promise.all([tx.get(ref), eventRef && tx.get(eventRef)]);
    const current = snapshot.data();
    if (handled?.exists) return current;
    requireValue(current?.id === id && current.mode === 'sandbox' && remote.id === id
      && remote.plan_id === current.planId && remote.custom_id === current.key
      && STATUS.has(remote.status), 'PayPal subscription ownership could not be verified.', 409);

    const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
    const info = remote.billing_info || {};
    const next = { ...current };
    if (readStarted >= (current.syncedAt || 0)) {
      Object.assign(next, { syncedAt: readStarted, status: remote.status, nextBillingTime: date(info.next_billing_time),
        lastPayment: date(info.last_payment?.time),
        failedPayments: Number.isSafeInteger(info.failed_payments_count) ? Math.max(0, info.failed_payments_count) : 0 });
    }
    const eventAt = date(event?.create_time);
    if (event?.event_type === 'BILLING.SUBSCRIPTION.PAYMENT.FAILED' && eventAt && eventAt > (next.attentionAt || '')) {
      next.attentionAt = eventAt;
    }
    next.paymentAttention = Boolean(next.failedPayments || (next.attentionAt && (!next.lastPayment || next.lastPayment <= next.attentionAt)));
    tx.set(ref, next);
    if (eventRef) tx.create(eventRef, { subscriptionId: id, type: event.event_type, processedAt: new Date().toISOString() });
    return next;
  });
}

export async function paypalWebhook(db, paypal, headers, event, rawEvent) {
  requireValue(paypal, 'Sandbox billing is not configured.', 503);
  requireValue(typeof event?.id === 'string' && /^WH-[A-Z0-9-]{5,100}$/.test(event.id)
    && typeof event.event_type === 'string', 'Invalid PayPal event.');
  requireValue(await paypal.verify(headers, rawEvent), 'PayPal signature rejected.', 401);
  if (!EVENTS.has(event.event_type)) return;
  const id = event.event_type.startsWith('PAYMENT.SALE.')
    ? event.resource?.billing_agreement_id
    : event.resource?.id;
  if (!subscriptionId(id)) return;
  const index = (await db.doc('portalPayPalSubscriptions/' + id).get()).data();
  // A creation webhook can arrive before the idempotent create request saves the index.
  if (!index && event.event_type.startsWith('BILLING.SUBSCRIPTION.')) {
    const remote = await paypal.subscription(id);
    if (paypal.planIds.has(remote.plan_id) && /^[a-f0-9-]{36}$/.test(remote.custom_id || '')) {
      throw new PortalError(503, 'Subscription registration is pending.');
    }
  }
  if (index) await syncSubscription(db, paypal, db.doc('portalHostingSubscriptions/' + index.uid), id, event);
}

export async function hostingMetrics(db, now = new Date()) {
  const records = await db.collection('portalHostingSubscriptions').where('mode', '==', 'sandbox').get();
  const totals = { active: 0, monthlyCents: 0, attention: 0, renewals: 0 };
  const cutoff = now.getTime() + 30 * 86400000;
  for (const record of records.docs) {
    const billing = record.data();
    if (billing.paymentAttention || billing.status === 'SUSPENDED') totals.attention++;
    if (billing.status !== 'ACTIVE') continue;
    totals.active++;
    totals.monthlyCents += billing.cadence === 'yearly' ? billing.feeCents / 12 : billing.feeCents;
    const renewal = Date.parse(billing.nextBillingTime);
    if (renewal >= now.getTime() && renewal <= cutoff) totals.renewals++;
  }
  totals.monthlyCents = Math.round(totals.monthlyCents);
  return totals;
}
