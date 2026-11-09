import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { JSDOM } from 'jsdom';
const source = await fs.readFile(new URL('../js/home-glow.js', import.meta.url), 'utf8');
function setup(reduced = false, legacy = false, lang = 'en') {
  const dom = new JSDOM(`<html lang="${lang}"><body><section class="hero-gold-motion"><button class="hero-motion-toggle" hidden></button></section></body></html>`, {runScripts: 'outside-only'});
  let change;
  const preference = {matches: reduced, [legacy ? 'addListener' : 'addEventListener']: (...args) => { change = args.at(-1); }};
  dom.window.matchMedia = () => preference;
  dom.window.eval(source);
  return {dom, preference, change: () => change(), hero: dom.window.document.querySelector('section'), button: dom.window.document.querySelector('button')};
}
test('gold motion starts normally and can pause and resume', () => {
  const t = setup();
  assert.equal(t.hero.dataset.motionPaused, 'false');
  assert.equal(t.button.hidden, false);
  t.button.click(); assert.equal(t.hero.dataset.motionPaused, 'true');
  assert.equal(t.button.textContent, 'Resume animation');
  t.button.click(); assert.equal(t.hero.dataset.motionPaused, 'false');
  assert.equal(t.button.getAttribute('aria-pressed'), 'false'); t.dom.window.close();
});
test('reduced motion starts still and offers an explicit Resume control', () => {
  const t = setup(true);
  assert.equal(t.hero.dataset.motionPaused, 'true');
  assert.equal(t.button.hidden, false);
  t.button.click(); assert.equal(t.hero.dataset.motionPaused, 'false');
  assert.equal(t.button.textContent, 'Pause animation');
  t.button.click(); assert.equal(t.hero.dataset.motionPaused, 'true'); t.dom.window.close();
});
test('responds to system motion changes until a visitor chooses a setting', () => {
  const t = setup();
  t.preference.matches = true; t.change(); assert.equal(t.hero.dataset.motionPaused, 'true');
  t.button.click(); t.change(); assert.equal(t.hero.dataset.motionPaused, 'false'); t.dom.window.close();
});
test('works with older Safari media listeners and Spanish controls', () => {
  const t = setup(true, true, 'es');
  assert.equal(t.button.textContent, 'Reanudar animación');
  t.button.click(); assert.equal(t.button.textContent, 'Pausar animación');
  t.preference.matches = false; t.change(); assert.equal(t.hero.dataset.motionPaused, 'false'); t.dom.window.close();
});
