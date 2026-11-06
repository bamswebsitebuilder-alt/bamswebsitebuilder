import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

for (const prefix of ['', 'es/']) {
  test(`${prefix || 'en/'}client menu selects sections, restores focus, and handles Escape and breakpoint changes`, () => {
    const dom = new JSDOM(read(`${prefix}client-portal.html`), { url: 'https://example.test/client-portal#dashboard', runScripts: 'outside-only' });
    const { window } = dom;
    let breakpointChange;
    window.matchMedia = () => ({ matches: true, addEventListener(_type, fn) { breakpointChange = fn; } });
    window.eval(read('js/portal.js'));
    window.eval(read('js/workspace-menu.js'));
    window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
    const doc = window.document;
    const toggle = doc.querySelector('.workspace-menu-toggle');
    const menu = doc.getElementById(toggle.getAttribute('aria-controls'));
    assert.ok(menu);
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    toggle.click();
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    menu.querySelector('[data-panel="files"]').click();
    assert.equal(window.location.hash, '#files');
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(doc.activeElement, toggle);
    assert.ok(doc.getElementById('files').classList.contains('active'));
    assert.equal(menu.querySelector('[data-panel="files"]').getAttribute('aria-current'), 'page');
    toggle.click();
    menu.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    toggle.click(); breakpointChange();
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    // Unread counts must not become part of the current section's name.
    const badge = doc.createElement('span');
    badge.textContent = '8';
    menu.querySelector('[data-panel="messages"]').append(badge);
    menu.querySelector('[data-panel="messages"]').click();
    assert.ok(!toggle.textContent.includes('8'));
    assert.match(toggle.textContent, prefix ? /^Menú/ : /^Menu/);
    dom.window.close();
  });
}

test('admin navigation preserves section links and ignores invalid targets', () => {
  const dom = new JSDOM(read('admin-dashboard.html'), { url: 'https://example.test/admin-dashboard', runScripts: 'outside-only' });
  const { window } = dom;
  window.scrollTo = () => {};
  const source = read('js/admin-dashboard.js').replace(/\r\n/g, '\n');
  const navigation = source.slice(source.indexOf('const setActivePanel ='), source.indexOf('navigationButtons.forEach((button) => {\n  button.addEventListener'));
  window.eval(`const panels = [...document.querySelectorAll('.admin-panel')];
    const navigationButtons = [...document.querySelectorAll('.admin-nav-button')];
    const markNotificationsSeen = () => {};
    ${navigation}
    window.selectPanel = setActivePanel;`);
  window.selectPanel('projects');
  assert.equal(window.location.hash, '#projects');
  assert.equal(window.document.querySelector('.admin-nav-button.active').getAttribute('aria-current'), 'page');
  assert.equal(window.document.querySelector('.admin-panel.active').id, 'projects');
  window.selectPanel('missing');
  assert.equal(window.document.querySelector('.admin-panel.active').id, 'projects');
  window.selectPanel('notifications');
  assert.equal(window.location.hash, '#notifications');
  dom.window.close();
});
