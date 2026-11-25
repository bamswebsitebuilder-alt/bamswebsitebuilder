import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable } from 'node:stream';
import { portalServices } from '../api/portal-services.js';
import { paypalSandbox } from '../lib/hosting-paypal.js';

const agreementId = 'a'.repeat(64);
const planId = 'P-SANDBOX123';
const subscriptionId = 'I-SANDBOX123';
const approval = 'https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-TEST';
const project = uid => 'users/' + uid + '/projects/current';
const agreementPath = 'users/alex/agreements/' + agreementId;
const subscriptionPath = 'portalHostingSubscriptions/alex';
const signedHeaders = {
  'paypal-auth-algo': 'SHA256withRSA', 'paypal-cert-url': 'https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT-TEST',
  'paypal-transmission-id': 'transmission', 'paypal-transmission-time': '2026-11-24T11:00:00Z',
  'paypal-transmission-sig': 'signed'
};
const env = {
  PAYPAL_HOSTING_ENV: 'sandbox', PAYPAL_HOSTING_CLIENT_ID: 'sandbox-id', PAYPAL_HOSTING_CLIENT_SECRET: 'sandbox-secret',
  PAYPAL_HOSTING_WEBHOOK_ID: 'sandbox-webhook', PAYPAL_HOSTING_PLAN_IDS: planId,
  PAYPAL_HOSTING_RETURN_ORIGIN: 'https://staging.example'
};

function firestore(initial) {
  const records = new Map(Object.entries(initial));
  const doc = path => ({
    path,
    async get() {
      return { exists: records.has(path), ref: doc(path), data: () => structuredClone(records.get(path)) };
    },
    collection: name => collection(path + '/' + name)
  });
  const collection = path => {
    const snapshots = async (predicate, count) => {
      const docs = [...records.keys()].filter(key =>
        key.startsWith(path + '/') && !key.slice(path.length + 1).includes('/') && predicate(records.get(key)));
      return { docs: await Promise.all(docs.reverse().slice(0, count).map(key => doc(key).get())) };
    };
    return {
      doc: id => doc(path + '/' + id),
      where: (key, op, value) => ({ get: () => snapshots(data => data[key] === value) }),
      orderBy: () => ({ limit: count => ({ get: () => snapshots(() => true, count) }) })
    };
  };
  let pending = Promise.resolve();
  return {
    records, doc, collection,
    runTransaction(callback) {
      const run = pending.then(async () => {
        const writes = [];
        const tx = {
          get: ref => ref.get(),
          set: (ref, data) => writes.push(() => records.set(ref.path, structuredClone(data))),
          update: (ref, data) => writes.push(() => records.set(ref.path, { ...records.get(ref.path), ...structuredClone(data) })),
          create: (ref, data) => {
            assert.equal(records.has(ref.path), false);
            tx.set(ref, data);
          }
        };
        const result = await callback(tx);
        for (const write of writes) write();
        return result;
      });
      pending = run.catch(() => {});
      return run;
    }
  };
}

function sandboxFetch() {
  const requests = [];
  const remote = { id: subscriptionId, plan_id: planId, status: 'ACTIVE', billing_info: {} };
  const plan = {
    id: planId, status: 'ACTIVE',
    billing_cycles: [{ tenure_type: 'REGULAR', total_cycles: 0, frequency: { interval_count: 1, interval_unit: 'MONTH' },
      pricing_scheme: { fixed_price: { currency_code: 'USD', value: '39.00' } } }],
    payment_preferences: { setup_fee: { currency_code: 'USD', value: '0.00' } }, taxes: { percentage: '0' }
  };
  return {
    plan, remote, requests,
    async fetch(url, options) {
      const route = new URL(url);
      const body = options.body?.startsWith('{') ? JSON.parse(options.body) : options.body;
      assert.equal(route.origin, 'https://api-m.sandbox.paypal.com');
      requests.push({ path: route.pathname, body, headers: options.headers });
      switch (route.pathname) {
        case '/v1/oauth2/token': return Response.json({ access_token: 'sandbox-bearer' });
        case '/v1/billing/plans/' + planId: return Response.json(plan);
        case '/v1/billing/subscriptions':
          assert.equal(body.custom_id, options.headers['PayPal-Request-Id']);
          assert.equal(body.plan_id, planId);
          assert.equal(body.quantity, '1');
          assert.equal(body.application_context.return_url, 'https://staging.example/es/client-portal?hostingReturn=1#hosting');
          remote.custom_id = body.custom_id;
          return Response.json({ id: subscriptionId, links: [{ href: approval, method: 'GET', rel: 'approve' }] });
        case '/v1/billing/subscriptions/' + subscriptionId: return Response.json(remote);
        case '/v1/notifications/verify-webhook-signature':
          assert.equal(body.webhook_id, 'sandbox-webhook');
          assert.ok(options.body.endsWith(',"webhook_event":' + JSON.stringify(body.webhook_event, null, 2) + '}'));
          return Response.json({ verification_status: body.transmission_sig === 'signed' ? 'SUCCESS' : 'FAILURE' });
        default: assert.fail('Unexpected PayPal request ' + url);
      }
    }
  };
}

function fixture() {
  const sandbox = sandboxFetch();
  const db = firestore({
    'users/alex': { role: 'client' }, 'users/blair': { role: 'client' }, 'users/bam': { role: 'admin' },
    [project('alex')]: { hosting: { billingMode: 'paypal-automated', billingStatus: 'awaiting-approval',
      status: 'setup', payable: true, paypalPlanId: planId, feeCents: 3900, cadence: 'monthly',
      agreementId, agreementNumber: '1001' } },
    [project('blair')]: {},
    [agreementPath]: { state: 'issued', quoteNumber: '1001', ongoingCosts: 'Managed hosting: USD 39.00 / month via PayPal' }
  });
  const auth = { async verifyIdToken(token, revokeCheck) {
    assert.equal(revokeCheck, true);
    if (!['alex', 'blair', 'bam', 'unverified'].includes(token)) throw new Error('Invalid token');
    return { uid: token === 'unverified' ? 'bam' : token, email_verified: token !== 'unverified' };
  } };
  const handle = portalServices(() => ({ auth, db }), () => paypalSandbox(env, sandbox.fetch));
  const call = async ({ token, body, query = {}, headers = {}, method = 'POST' }) => {
    const result = { headers: {} };
    const raw = JSON.stringify(body, null, 2);
    const req = Object.assign(Readable.from([Buffer.from(raw || '')]), { method, body, query, headers: {
      'content-type': 'application/json', ...(token && { authorization: 'Bearer ' + token }), ...headers
    } });
    if (query.webhook) Object.defineProperty(req, 'body', { get() { assert.fail('Webhook body was parsed by the platform'); } });
    await handle(req, {
      setHeader: (key, value) => { result.headers[key] = value; },
      status(code) {
        result.code = code;
        return this;
      },
      json(data) { result.data = data; },
      end() {}
    });
    return result;
  };
  return { sandbox, db, call, action: (token, action, data = {}) => call({ token, body: { action, ...data } }) };
}

test('editor isolates tenants and publishes only the approved snapshot, with rollback through review', async () => {
  const { action, call } = fixture();
  const draft = { headline: '<b>Bakery</b>', description: 'Baked daily' };
  assert.equal((await action(undefined, 'editor-read')).code, 401);
  assert.equal((await action('revoked', 'editor-read')).code, 401);
  assert.equal((await action('unverified', 'editor-read', { uid: 'alex' })).code, 403);
  assert.equal((await action('blair', 'editor-read', { uid: 'alex' })).code, 403);
  assert.equal((await action('blair', 'editor-config', { uid: 'blair', rev: 0, fields: ['headline'], content: {} })).code, 403);
  assert.equal((await action('bam', 'editor-config', { uid: 'alex', rev: 0, fields: ['headline', 'imageUrl'],
    content: { imageUrl: 'javascript:alert(1)' } })).code, 400);
  assert.equal((await action('bam', 'editor-config', { uid: 'alex', rev: 0, fields: ['headline'], content: draft })).code, 200);
  const initial = await action('alex', 'editor-read');
  const live = () => call({ method: 'GET', query: { site: initial.data.editor.publicId } });
  assert.equal((await live()).code, 404);
  assert.equal((await action('alex', 'editor-save', { rev: 1, content: { description: 'Forbidden' } })).code, 400);
  assert.equal((await action('alex', 'editor-save', { rev: 1, content: { headline: 'Draft only' } })).code, 200);
  assert.equal((await action('alex', 'editor-save', { rev: 1, content: { headline: 'Stale' } })).code, 409);
  assert.equal((await action('alex', 'editor-submit', { rev: 2, content: { headline: draft.headline } })).code, 200);
  assert.equal((await action('alex', 'editor-save', { rev: 3, content: { headline: 'Changed during review' } })).code, 409);
  assert.equal((await action('alex', 'editor-approve', { rev: 3 })).code, 403);
  assert.equal((await action('bam', 'editor-publish', { uid: 'alex', rev: 3 })).code, 409);
  assert.equal((await action('bam', 'editor-approve', { uid: 'alex', rev: 3 })).code, 200);
  assert.equal((await live()).code, 404);
  assert.equal((await action('bam', 'editor-publish', { uid: 'alex', rev: 4 })).code, 200);
  assert.deepEqual((await live()).data, draft);
  assert.equal((await action('alex', 'editor-save', { rev: 5, content: { headline: 'New' } })).code, 200);
  assert.deepEqual((await live()).data, draft);
  assert.equal((await action('alex', 'editor-submit', { rev: 6, content: { headline: 'New' } })).code, 200);
  assert.equal((await action('bam', 'editor-approve', { uid: 'alex', rev: 7 })).code, 200);
  assert.equal((await action('bam', 'editor-publish', { uid: 'alex', rev: 8 })).code, 200);
  assert.equal((await live()).data.headline, 'New');
  assert.equal((await action('bam', 'editor-restore', { uid: 'alex', rev: 9, version: 3 })).code, 200);
  assert.equal((await live()).data.headline, 'New');
  assert.equal((await action('bam', 'editor-approve', { uid: 'alex', rev: 10 })).code, 200);
  assert.equal((await action('bam', 'editor-publish', { uid: 'alex', rev: 11 })).code, 200);
  assert.deepEqual((await live()).data, draft);
  const state = (await action('alex', 'editor-read')).data;
  assert.deepEqual(state.history.map(item => item.revision), [10, 7, 3]);
  assert.ok(state.history.every(item => item.publishedAt));
  assert.equal((await action('blair', 'editor-read')).data.editor, null);
});

test('sandbox checkout binds to the accepted fee and exactly one tenant subscription, including concurrent retries', async () => {
  assert.equal(paypalSandbox({ ...env, PAYPAL_HOSTING_ENV: 'live' }), null);
  const { action, db, sandbox } = fixture();
  assert.equal((await action('bam', 'billing-create', { uid: 'alex' })).code, 403);
  assert.equal((await action('blair', 'billing-create', { uid: 'alex' })).code, 403);
  assert.equal((await action('alex', 'billing-create')).code, 409);
  assert.equal(db.records.has(subscriptionPath), false);
  db.records.set(agreementPath + '/acceptances/client', { clientUid: 'alex', quoteId: agreementId });
  const quote = db.records.get(agreementPath);
  quote.ongoingCosts = 'Hosting TBD';
  assert.equal((await action('alex', 'billing-create')).code, 409);
  quote.ongoingCosts = 'Managed hosting: USD 39.00 / month via PayPal';
  sandbox.plan.billing_cycles[0].pricing_scheme.fixed_price.value = '40.00';
  assert.equal((await action('alex', 'billing-create')).code, 409);
  assert.equal(db.records.has(subscriptionPath), false);
  sandbox.plan.billing_cycles[0].pricing_scheme.fixed_price.value = '39.00';
  const results = await Promise.all([1, 2].map(() => action('alex', 'billing-create', {
    language: 'es', planId: 'P-UNTRUSTED', feeCents: 1, returnUrl: 'https://untrusted.example'
  })));
  for (const result of results) {
    assert.equal(result.code, 200);
    assert.equal(result.data.checkout, approval);
    assert.equal(result.data.billing.status, 'APPROVAL_PENDING');
  }
  const creates = sandbox.requests.filter(request => request.path === '/v1/billing/subscriptions');
  assert.equal(new Set(creates.map(request => request.headers['PayPal-Request-Id'])).size, 1);
  assert.equal((await action('blair', 'billing-read')).data.billing, null);
  assert.equal((await action('bam', 'billing-read', { uid: 'alex' })).data.checkout, undefined);
});

test('verified webhooks reconcile provider ownership and status, deduplicate delivery, and update admin metrics', async () => {
  const { action, db, sandbox, call } = fixture();
  db.records.set(agreementPath + '/acceptances/client', { clientUid: 'alex', quoteId: agreementId });
  assert.equal((await action('alex', 'billing-create', { language: 'es' })).code, 200);

  const webhook = (type, id, headers = signedHeaders, resource = { id: subscriptionId, status: 'CANCELLED' }) =>
    call({ headers, query: { webhook: 'paypal-hosting' }, body: { id: 'WH-' + id, event_type: type, resource,
      create_time: '2026-11-24T10:00:00Z' } });
  assert.equal((await webhook('BILLING.SUBSCRIPTION.ACTIVATED', 'TEST1', {})).code, 401);
  assert.equal((await webhook('BILLING.SUBSCRIPTION.ACTIVATED', 'TEST1', { ...signedHeaders, 'paypal-transmission-sig': 'forged' })).code, 401);
  assert.equal(db.records.get(subscriptionPath).status, 'APPROVAL_PENDING');
  const correctKey = sandbox.remote.custom_id;
  sandbox.remote.custom_id = 'wrong-tenant-key';
  assert.equal((await webhook('BILLING.SUBSCRIPTION.ACTIVATED', 'TEST1')).code, 409);
  sandbox.remote.custom_id = correctKey;
  sandbox.remote.billing_info.next_billing_time = new Date(Date.now() + 86400000).toISOString();
  assert.equal((await webhook('BILLING.SUBSCRIPTION.ACTIVATED', 'TEST1')).code, 204);
  assert.equal(db.records.get(subscriptionPath).status, 'ACTIVE');
  const reads = () => sandbox.requests.filter(request => request.path === '/v1/billing/subscriptions/' + subscriptionId).length;
  const before = reads();
  assert.equal((await webhook('BILLING.SUBSCRIPTION.ACTIVATED', 'TEST1')).code, 204);
  assert.equal(reads(), before);
  assert.equal((await webhook('BILLING.SUBSCRIPTION.PAYMENT.FAILED', 'TEST2')).code, 204);
  assert.equal((await action('alex', 'billing-read')).data.billing.paymentAttention, true);
  assert.equal((await action('alex', 'billing-metrics')).code, 403);
  assert.deepEqual((await action('bam', 'billing-metrics')).data,
    { active: 1, monthlyCents: 3900, attention: 1, renewals: 1 });

  sandbox.remote.billing_info.last_payment = { time: '2026-11-24T12:00:00Z' };
  assert.equal((await webhook('PAYMENT.SALE.COMPLETED', 'TEST3', signedHeaders, { billing_agreement_id: subscriptionId })).code, 204);
  assert.equal((await action('alex', 'billing-read')).data.billing.paymentAttention, false);
  sandbox.remote.status = 'CANCELLED';
  assert.equal((await action('alex', 'billing-refresh', { id: 'I-UNTRUSTED' })).data.billing.status, 'CANCELLED');
  assert.equal((await action('bam', 'billing-metrics')).data.active, 0);
});
