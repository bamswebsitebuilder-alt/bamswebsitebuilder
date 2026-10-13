// Read-only check. The browser continues through Brevo's form for eligible addresses.
const origins = new Set(['https://www.bamswebsitebuilder.com', 'https://bamswebsitebuilder.com', 'https://bamswebsitebuilder.vercel.app']);
const captchaHosts = new Set(['www.bamswebsitebuilder.com', 'bamswebsitebuilder.com', 'bamswebsitebuilder.vercel.app']);
const normalize = value => value.toLowerCase().replace(/[’']/g, '').replace(/\s+/g, ' ').trim();
const targetListName = normalize('BAM’s Updates & Promotions');

async function brevo(path) {
  const response = await fetch('https://api.brevo.com/v3' + path, {
    headers: { 'api-key': process.env.BREVO_API_KEY, accept: 'application/json' },
    signal: AbortSignal.timeout(8000)
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    // Never log the key, submitted email, or the upstream response body.
    console.error('Newsletter Brevo request failed', { status: response.status });
    throw new Error('Brevo unavailable');
  }
  return response.json();
}

async function listId() {
  const configured = process.env.BREVO_NEWSLETTER_LIST_ID;
  if (configured && /^\d+$/.test(configured) && Number(configured) > 0) return Number(configured);
  const matches = [];
  for (let offset = 0; offset < 500; offset += 50) {
    const page = await brevo('/contacts/lists?limit=50&offset=' + offset);
    if (!page || !Array.isArray(page.lists)) throw new Error('Invalid lists response');
    matches.push(...page.lists.filter(list => normalize(list.name || '') === targetListName));
    if (page.lists.length < 50) {
      if (matches.length !== 1 || !Number.isInteger(matches[0].id)) throw new Error('Newsletter list not unique');
      return matches[0].id;
    }
  }
  throw new Error('Newsletter list not found');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Origin');
  const origin = req.headers.origin;
  if (!origins.has(origin)) return res.status(403).json({ error: 'origin_not_allowed' });
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!process.env.BREVO_API_KEY || !process.env.RECAPTCHA_SECRET_KEY) {
    return res.status(503).json({ error: 'temporarily_unavailable' });
  }
  // Readiness exposes no subscriber information and checks only list configuration.
  if (req.method === 'GET') {
    try { await listId(); return res.status(200).json({ ready: true }); }
    catch { return res.status(503).json({ ready: false }); }
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) {
    return res.status(415).json({ error: 'invalid_content_type' });
  }
  let body = req.body;
  try { if (typeof body === 'string') body = JSON.parse(body); }
  catch { return res.status(400).json({ error: 'invalid_request' }); }
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const token = typeof body?.token === 'string' ? body.token : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !token || token.length > 10000) {
    return res.status(400).json({ error: 'invalid_request' });
  }
  try {
    const verification = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret: process.env.RECAPTCHA_SECRET_KEY, response: token }),
      signal: AbortSignal.timeout(8000)
    });
    if (!verification.ok) throw new Error('Verification unavailable');
    const captcha = await verification.json();
    const age = Date.now() - Date.parse(captcha.challenge_ts);
    if (!captcha.success || captcha.action !== 'newsletter_status' ||
        !captchaHosts.has(captcha.hostname) || !Number.isFinite(captcha.score) ||
        captcha.score < 0.5 || !Number.isFinite(age) || age < -30000 || age > 120000) {
      return res.status(403).json({ error: 'verification_failed' });
    }
    const id = await listId();
    const contact = await brevo('/contacts/' + encodeURIComponent(email) + '?identifierType=email_id');
    if (contact && (!Array.isArray(contact.listIds) || typeof contact.emailBlacklisted !== 'boolean')) {
      throw new Error('Invalid contact response');
    }
    const subscribed = !!contact && contact.listIds.includes(id) &&
      !contact.emailBlacklisted && !(contact.listUnsubscribed || []).includes(id);
    return res.status(200).json({ subscribed });
  } catch {
    console.error('Newsletter subscription check unavailable');
    return res.status(503).json({ error: 'temporarily_unavailable' });
  }
}
