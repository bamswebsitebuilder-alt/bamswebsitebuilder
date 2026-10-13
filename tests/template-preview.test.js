import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { websiteURL, publicIPv4, extractDetails, readWebsite } from '../api/template-preview.js';

test('accepts bare domains and rejects private networks and alternate protocols', () => {
  assert.equal(websiteURL('www.example.com').href, 'https://www.example.com/');
  for (const url of ['https://127.0.0.1', 'http://10.0.0.1', 'http://169.254.169.254', 'http://localhost', 'http://[::1]', 'file:///secret', 'https://user:pass@example.com', 'https://example.com:8080', 'http://2130706433']) {
    assert.throws(() => websiteURL(url), url);
  }
  assert.equal(publicIPv4('8.8.8.8'), true);
  for (const ip of ['172.16.1.1', '192.168.1.1', '100.64.0.1', '198.18.0.1', '224.1.1.1', '::ffff:127.0.0.1']) assert.equal(publicIPv4(ip), false);
});

test('rejects private fetch targets even when called directly', async () => {
  await assert.rejects(readWebsite(new URL('http://127.0.0.1/')));
});

test('extracts plain metadata independent of attribute order and bounds text', () => {
  const data = extractDetails(`<title>Fallback</title><meta content='Acme &amp; Sons' property='og:site_name'><meta content="<b>Great service</b>" name="description">`);
  assert.deepEqual(data, { name: 'Acme & Sons', description: 'Great service' });
  assert.equal(extractDetails(`<title>${'x'.repeat(300)}</title>`).name.length, 100);
});

test('handler refuses non-POST requests and returns a manual-entry fallback', async () => {
  const response = () => ({ headers: {}, code: 0, body: null, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
  const get = response();
  await handler({ method: 'GET' }, get);
  assert.equal(get.code, 405);
  assert.equal(get.headers.Allow, 'POST');
  const post = response();
  await handler({ method: 'POST', body: { url: 'http://127.0.0.1' } }, post);
  assert.equal(post.code, 422);
  assert.match(post.body.error, /enter your business details/);
});
