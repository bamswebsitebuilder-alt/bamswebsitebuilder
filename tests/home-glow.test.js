import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { JSDOM } from 'jsdom';
const source = await fs.readFile(new URL('../js/home-glow.js', import.meta.url), 'utf8');
function setup(reduced = false, lang = 'en') {
  const dom = new JSDOM(`<html lang="${lang}"><body><section class="hero-gold-motion"><button class="hero-motion-toggle" hidden></button></section></body></html>`, {runScripts: 'outside-only'});
  dom.window.matchMedia = () => ({matches: reduced});
  dom.window.eval(source);
  return {dom, hero: dom.window.document.querySelector('section'), button: dom.window.document.querySelector('button')};
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
test('starts automatically even when the device prefers reduced motion', () => {
  const t = setup(true);
  assert.equal(t.hero.dataset.motionPaused, 'false');
  assert.equal(t.button.hidden, false);
  assert.equal(t.button.textContent, 'Pause animation');
  t.button.click(); assert.equal(t.hero.dataset.motionPaused, 'true'); t.dom.window.close();
});
test('a fresh page starts automatically after a previous page was paused', () => {
  const t = setup();
  t.button.click(); assert.equal(t.hero.dataset.motionPaused, 'true'); t.dom.window.close();
  const fresh = setup(); assert.equal(fresh.hero.dataset.motionPaused, 'false'); fresh.dom.window.close();
});
test('Spanish controls start on Pause and can pause and resume', () => {
  const t = setup(true, 'es');
  assert.equal(t.button.textContent, 'Pausar animación');
  t.button.click(); assert.equal(t.button.textContent, 'Reanudar animación');
  t.button.click(); assert.equal(t.hero.dataset.motionPaused, 'false'); t.dom.window.close();
});
