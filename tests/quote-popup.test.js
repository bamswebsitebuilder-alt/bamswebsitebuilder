import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { JSDOM } from 'jsdom';
const source = await fs.readFile(new URL('../js/quote-popup.js', import.meta.url), 'utf8');
function setup(path = '/', lang = 'en', saved = false) {
  const dom = new JSDOM(`<html lang="${lang}"><head></head><body><main><input></main></body></html>`, { url: 'https://bamswebsitebuilder.com' + path, runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  const timers = [];
  window.setTimeout = (fn, delay) => { timers.push({fn, delay}); return timers.length; };
  window.clearTimeout = () => {};
  if (saved) window.sessionStorage.setItem('bam-quote-popup-seen-v1', '1');
  window.eval(source);
  return { window, timers, document: window.document, finish: () => dom.window.close() };
}
test('waits 25 seconds, links to the quote form, and does not steal focus', () => {
  const t = setup();
  assert.equal(t.document.querySelector('.bam-quote-popup'), null);
  assert.equal(t.timers[0].delay, 25000);
  t.timers[0].fn();
  assert.equal(t.document.querySelector('.bam-quote-cta').getAttribute('href'), '/contact');
  assert.equal(t.document.activeElement, t.document.body);
  assert.equal(t.window.sessionStorage.getItem('bam-quote-popup-seen-v1'), '1');
  t.window.eval(source);
  assert.equal(t.document.querySelectorAll('.bam-quote-popup').length, 1);
  t.finish();
});
test('both close buttons and Escape dismiss the popup', () => {
  for (const control of ['.bam-quote-close', '.bam-quote-later', 'Escape']) {
    const t = setup(); t.timers[0].fn();
    if (control === 'Escape') t.document.dispatchEvent(new t.window.KeyboardEvent('keydown', {key: 'Escape'}));
    else { t.document.querySelector(control).focus(); t.document.querySelector(control).click(); }
    assert.equal(t.document.querySelector('.bam-quote-popup'), null);
    assert.equal(t.window.sessionStorage.getItem('bam-quote-popup-seen-v1'), '1');
    t.finish();
  }
});
test('does not repeat on another page in the session', () => {
  const t = setup('/services', 'en', true);
  assert.equal(t.timers.length, 0); t.finish();
});
test('does not restore the popup when using the browser Back button', () => {
  const t = setup(); t.timers[0].fn();
  t.window.dispatchEvent(new t.window.PageTransitionEvent('pagehide'));
  t.window.dispatchEvent(new t.window.PageTransitionEvent('pageshow', {persisted: true}));
  assert.equal(t.document.querySelector('.bam-quote-popup'), null);
  assert.equal(t.timers.length, 1); t.finish();
});
test('excludes accounts, forms, legal pages, and client demo websites', () => {
  for (const path of ['/login', '/es/login.html', '/admin-dashboard', '/client-portal', '/contact', '/booking', '/website-review', '/thank-you', '/privacy-policy', '/kade-mercer/', '/es/kade-mercer/']) {
    const t = setup(path);
    assert.equal(t.timers.length, 0, path); t.finish();
  }
});
test('supports Spanish and clean, html, and portfolio routes', () => {
  for (const path of ['/es/', '/es/index.html', '/es/prices.html', '/es/portfolio/index.html']) {
    const t = setup(path, 'es'); t.timers[0].fn();
    assert.match(t.document.querySelector('aside').textContent, /cotización gratis/);
    assert.equal(t.document.querySelector('.bam-quote-cta').getAttribute('href'), '/es/contact'); t.finish();
  }
});
test('waits for cookie consent, navigation, and typing to finish', () => {
  for (const blocker of ['consent', 'menu', 'input']) {
    const t = setup();
    if (blocker === 'consent') t.document.body.insertAdjacentHTML('beforeend', '<section class="bam-consent-panel is-open" aria-modal="true"></section>');
    if (blocker === 'menu') t.document.body.classList.add('menu-open');
    if (blocker === 'input') t.document.querySelector('input').focus();
    t.timers[0].fn();
    assert.equal(t.document.querySelector('aside'), null);
    assert.equal(t.timers[1].delay, 5000);
    t.document.querySelector('.bam-consent-panel')?.classList.remove('is-open');
    t.document.body.classList.remove('menu-open'); t.document.querySelector('input').blur();
    t.timers[1].fn(); assert.ok(t.document.querySelector('aside')); t.finish();
  }
});
