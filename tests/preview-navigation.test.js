import test from 'node:test';
import assert from 'node:assert/strict';
import { previewDestination, sourceWebsite } from '../js/preview-navigation.js';
const home = 'https://www.bamswebsitebuilder.com/bams-original/';

test('keeps section links in the preview and recognizes clean home aliases', () => {
  assert.deepEqual(previewDestination('#services', home, home), {kind:'section', hash:'#services'});
  assert.deepEqual(previewDestination('index.html#services', home, home), {kind:'section', hash:'#services'});
});
test('follows template pages within the selected demo and sends quote actions to the selected design', () => {
  assert.deepEqual(previewDestination('services.html', home, home), {kind:'page', href:home+'services.html'});
  assert.equal(previewDestination('/contact', home, home).kind, 'quote');
  assert.equal(previewDestination('/api/template-preview', home, home).kind, 'quote');
});
test('uses imported contact details instead of the fictional demo contacts', () => {
  assert.deepEqual(previewDestination('mailto:demo@example.com', home, home, {email:'owner@business.com'}), {kind:'external', href:'mailto:owner@business.com'});
  assert.deepEqual(previewDestination('tel:5555555555', home, home, {phone:'+1 (727) 555-1234'}), {kind:'external', href:'tel:+17275551234'});
  assert.equal(previewDestination('mailto:demo@example.com', home, home).kind, 'unavailable');
});
test('maps external demo destinations to the imported business website and rejects active protocols', () => {
  assert.deepEqual(previewDestination('https://demo-social.example', home, home, {website:'www.business.com'}), {kind:'external', href:'https://www.business.com/'});
  assert.deepEqual(previewDestination('https://www.business.com/about', home, home, {website:'www.business.com'}), {kind:'external', href:'https://www.business.com/about'});
  for (const href of ['javascript:alert(1)', 'data:text/html,hello', 'https://user:pass@business.com/']) assert.equal(previewDestination(href,home,home).kind, 'unavailable');
  assert.equal(sourceWebsite('javascript:alert(1)'), '');
});
