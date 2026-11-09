// Read-only public production checks. No authentication, form submissions or customer data.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const base = process.env.BAM_SITE_ORIGIN || 'https://www.bamswebsitebuilder.com';
const paths = ['/', '/es/', '/services', '/portfolio', '/reviews', '/contact',
  '/website-review', '/blog', '/privacy-policy', '/cookie-policy',
  '/accessibility', '/sitemap.xml', '/robots.txt'];
async function read(path) {
  const response = await fetch(new URL(path, base), {
    headers: { 'User-Agent': 'BAM-Public-Health-Check/1.0' },
    signal: AbortSignal.timeout(15000),
    redirect: 'follow'
  });
  assert.equal(response.status, 200, path + ' returned HTTP ' + response.status);
  const text = await response.text();
  assert.ok(text.length > 20, path + ' returned an empty response');
  return {response, text};
}
test('public pages and SEO resources respond', { timeout: 180000 }, async () => {
  for (const path of paths) await read(path);
});
test('live site includes defensive response headers', async () => {
  const {response} = await read('/');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
});
test('login is not indexable', async () => {
  const {response, text} = await read('/login');
  const robots = (response.headers.get('x-robots-tag') || '') + ' ' + text;
  assert.match(robots, /noindex/i);
});
test('sitemap is present and references a canonical home page', async () => {
  const {text} = await read('/sitemap.xml');
  assert.ok(text.includes('<urlset'), 'missing sitemap URL set');
  assert.ok(text.includes('https://www.bamswebsitebuilder.com/'), 'missing canonical home URL');
});
test('reviews have a direct Google fallback even if the widget fails', async () => {
  for (const path of ['/', '/reviews']) {
    const {text} = await read(path);
    assert.ok(text.includes('widgets.sociablekit.com/google-reviews/iframe/'), path + ' widget missing');
    assert.ok(text.includes('https://g.page/r/CRUlCdxVT-K3EBM/review'), path + ' fallback link missing');
  }
});
