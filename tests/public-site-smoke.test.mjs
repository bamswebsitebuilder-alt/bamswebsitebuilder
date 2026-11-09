// Static checks that do not need production credentials or network access.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../', import.meta.url);
const read = (name) => readFileSync(new URL(name, root), 'utf8');
const critical = ['index.html','about.html','services.html','prices.html','portfolio.html',
  'reviews.html','contact.html','booking.html','website-review.html','project-stories.html',
  'hosting.html','domains.html'];
test('public business pages exist and expose navigable policy links', () => {
  for (const file of critical) {
    const page = read(file);
    assert.match(page, /<footer class="home-footer">/, file + ': common footer missing');
    assert.match(page, /href="\/privacy-policy"/, file + ': privacy policy');
    assert.match(page, /href="\/cookie-policy"/, file + ': cookie policy');
    assert.match(page, /href="\/accessibility"/, file + ': accessibility');
  }
});
test('sitemap and robots file are aligned', () => {
  const sitemap = read('sitemap.xml');
  const robots = read('robots.txt');
  assert.match(sitemap, /<urlset[\\s>]/);
  assert.match(robots, /Sitemap: https:\/\/www\.bamswebsitebuilder\.com\/sitemap\.xml/);
  for (const privateUrl of ['login','client-portal','admin-dashboard','register']) {
    assert.doesNotMatch(sitemap, new RegExp('https://www\\.bamswebsitebuilder\\.com/' + privateUrl + '(?:<|/)'));
  }
});
test('account pages block indexing', () => {
  for (const file of ['login.html','register.html','client-portal.html','admin-dashboard.html']) {
    assert.match(read(file), /noindex/i, file + ': noindex missing');
  }
});
test('production response headers include defensive baseline', () => {
  const cfg = JSON.parse(read('vercel.json'));
  const headers = cfg.headers?.flatMap(x => x.headers || []) || [];
  for (const name of ['X-Content-Type-Options','Referrer-Policy','Permissions-Policy']) {
    assert.ok(headers.some(x => x.key === name), name + ' header missing');
  }
});
test('analytics and consent scripts do not automatically record sensitive portal visits', () => {
  const tracking = read('js/site-analytics.js');
  assert.match(tracking, /admin-dashboard\|client-portal/);
  assert.match(tracking, /BAMCookieConsent/);
  assert.match(tracking, /globalPrivacyControl/);
});
