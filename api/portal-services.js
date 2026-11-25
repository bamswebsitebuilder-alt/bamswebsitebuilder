import { PortalError, portalActor, portalTenant, requireValue } from '../lib/portal-access.js';
import { publicSiteId, websiteEditor } from '../lib/site-editor.js';
import { hostingBilling, hostingMetrics, paypalSandbox, paypalWebhook } from '../lib/hosting-paypal.js';

async function firebaseServices() {
  requireValue(process.env.BAM_PORTAL_FIREBASE_SERVICE_ACCOUNT, 'Portal services are not configured.', 503);
  const [{ cert, getApps, initializeApp }, { getAuth }, { getFirestore }] = await Promise.all([
    import('firebase-admin/app'), import('firebase-admin/auth'), import('firebase-admin/firestore')
  ]);
  const app = getApps().find(app => app.name === 'bam-portal-services');
  if (app) return { auth: getAuth(app), db: getFirestore(app) };
  let credential;
  try {
    credential = JSON.parse(process.env.BAM_PORTAL_FIREBASE_SERVICE_ACCOUNT);
  } catch {
    throw new PortalError(503, 'Portal services are not configured.');
  }
  const projectId = process.env.BAM_PORTAL_FIREBASE_PROJECT || 'bam-client-portal';
  requireValue(credential?.project_id === projectId, 'Portal services are not configured for this project.', 503);
  const named = initializeApp({ projectId, credential: cert(credential) }, 'bam-portal-services');
  return { auth: getAuth(named), db: getFirestore(named) };
}

async function webhookBody(req) {
  const chunks = [];
  let size = 0;
  for await (const data of req) {
    const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data);
    size += chunk.length;
    requireValue(size <= 262144, 'Request too large.', 413);
    chunks.push(chunk);
  }
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(Buffer.concat(chunks));
  } catch {
    throw new PortalError(400, 'Invalid webhook encoding.');
  }
}

export function portalServices(services = firebaseServices, paypalFactory = paypalSandbox) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      // Public JSON exposes only the last published snapshot. It carries no credentials.
      if (req.method === 'GET' && publicSiteId(req.query?.site)) {
        const snapshot = await (await services()).db.doc('portalPublishedSites/' + req.query.site).get();
        res.setHeader('Access-Control-Allow-Origin', '*');
        if (!snapshot.exists) return res.status(404).end();
        return res.status(200).json(snapshot.data().content);
      }
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'GET, POST');
        return res.status(405).end();
      }
      requireValue(/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || ''), 'Send JSON.', 415);
      const webhook = req.query?.webhook === 'paypal-hosting';
      // Vercel parses req.body lazily. Read the incoming stream before accessing it on webhook requests.
      const raw = webhook ? await webhookBody(req) : null;
      const input = webhook ? raw : req.body;
      const body = typeof input === 'string' ? JSON.parse(input) : input;
      requireValue(body && typeof body === 'object' && !Array.isArray(body), 'Invalid request.');
      if (!webhook) requireValue(Buffer.byteLength(JSON.stringify(body)) <= 16384, 'Request too large.', 413);
      const { auth, db } = await services();
      if (webhook) {
        await paypalWebhook(db, paypalFactory(), req.headers, body, raw);
        return res.status(204).end();
      }

      const actor = await portalActor(req, auth, db);
      const action = body.action;
      if (action === 'billing-metrics') {
        requireValue(actor.role === 'admin', 'Access denied.', 403);
        return res.status(200).json(await hostingMetrics(db));
      }
      const uid = await portalTenant(db, actor, body.uid);
      if (['billing-read', 'billing-create', 'billing-refresh'].includes(action)) {
        requireValue(action !== 'billing-create' || actor.role === 'client', 'Access denied.', 403);
        const result = await hostingBilling(db, paypalFactory(), uid, action, body.language === 'es');
        if (actor.role === 'admin') delete result.checkout;
        return res.status(200).json(result);
      }
      requireValue(typeof action === 'string' && action.startsWith('editor-'), 'Unknown portal action.');
      return res.status(200).json(await websiteEditor(db, actor, uid, body));
    } catch (error) {
      if (error instanceof PortalError) return res.status(error.status).json({ error: error.message });
      if (error instanceof SyntaxError) return res.status(400).json({ error: 'Invalid request.' });
      console.error('Portal services request failed', error.code || error.name);
      return res.status(500).json({ error: 'Portal services are temporarily unavailable.' });
    }
  };
}

export default portalServices();
