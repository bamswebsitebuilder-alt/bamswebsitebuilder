import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const firstPartyOrigin = 'https://www.bamswebsitebuilder.com';
const cases = [
  ['/afterhours', 'src', '/afterhours/app.js'],
  ['/afterhours-premium', 'href', '/afterhours-premium/style.css'],
  ['/fleetflow', 'src', '/fleetflow/script.js?v=4'],
  ['/es/fleetflow', 'href', '/es/fleetflow/consultation.html'],
  ['/evergreen-lawn-care', 'href', '/evergreen-lawn-care/styles.css'],
  ['/es/evergreen-lawn-care', 'src', '/es/evergreen-lawn-care/app.js'],
  ['/blend-lab/es', 'src', '/blend-lab/js/script.js?v=20260725-2'],
  ['/es/blush-bloom', 'href', '/es/blush-bloom/services'],
  ['/connectsphere', 'src', '/connectsphere/images/connectsphere-logo.png'],
  ['/gulf-coast-pro-wash', 'href', '/gulf-coast-pro-wash/contact.html'],
  ['/titan-athletics', 'href', '/titan-athletics/coach-login'],
  ['/velocity-drive-rentals/es', 'href', '/velocity-drive-rentals/fleet']
];
for (const [route, attribute, expected] of cases) {
  test(`${route} keeps ${expected} on the proper demo after Vercel removes the trailing slash`, () => {
    const html = readFileSync(new URL('..' + route + '/index.html', import.meta.url), 'utf8');
    const urls = [...html.matchAll(new RegExp(`(?:^|\\s)${attribute}\\s*=\\s*(["'])(.*?)\\1`, 'g'))]
      .map((match) => new URL(match[2], firstPartyOrigin + route).href);
    assert.ok(urls.includes(firstPartyOrigin + expected), expected + ' must resolve to the intended demo');
  });
}
