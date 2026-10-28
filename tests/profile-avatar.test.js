import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function setup() {
  const images = [];
  const target = {
    textContent: '', children: [], classes: new Set(),
    replaceChildren(...children) { this.children = children; this.textContent = ''; }
  };
  target.classList = {
    add: value => target.classes.add(value),
    remove: value => target.classes.delete(value)
  };
  const context = vm.createContext({ document: { createElement: () => {
    const image = {}; images.push(image); return image;
  } } });
  const source = readFileSync(new URL('../js/profile-avatar.js', import.meta.url), 'utf8');
  vm.runInContext(source.replace('export const renderProfileAvatar', 'globalThis.renderProfileAvatar'), context);
  return { target, images, render: (sources, name = 'Braion') => context.renderProfileAvatar(target, sources, name) };
}

test('initials stay visible until a working photo loads', () => {
  const app = setup();
  app.render(['photo.jpg']);
  assert.equal(app.target.textContent, 'B');
  assert.equal(app.target.children.length, 0);
  app.images[0].onload();
  assert.equal(app.target.children[0], app.images[0]);
  assert.ok(app.target.classes.has('has-photo'));
});

test('expired saved sources fall through to the working auth photo', () => {
  const app = setup();
  app.render(['broken-data', 'expired.jpg', 'auth.jpg']);
  app.images[0].onerror();
  assert.equal(app.images[1].src, 'expired.jpg');
  app.images[1].onerror();
  assert.equal(app.images[2].src, 'auth.jpg');
  app.images[2].onload();
  assert.equal(app.target.children[0].src, 'auth.jpg');
});

test('all failed photos leave initials without a broken image', () => {
  const app = setup();
  app.render([null, '', 'missing.jpg', 'missing.jpg']);
  app.images[0].onerror();
  assert.equal(app.images.length, 1);
  assert.equal(app.target.textContent, 'B');
  assert.equal(app.target.children.length, 0);
  assert.equal(app.target.classes.has('has-photo'), false);
});

test('a late old photo cannot overwrite a new upload or sign-out', () => {
  const app = setup();
  app.render(['old.jpg']);
  app.render(['new.jpg']);
  app.images[1].onload();
  app.images[0].onload();
  assert.equal(app.target.children[0].src, 'new.jpg');
  app.render([], 'A');
  app.images[1].onload();
  assert.equal(app.target.textContent, 'A');
  assert.equal(app.target.classes.has('has-photo'), false);
});
