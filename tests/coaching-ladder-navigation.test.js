import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../coaching-ladder/navigation.js', import.meta.url), 'utf8');
function fixture(href = 'https://www.bamswebsitebuilder.com/coaching-ladder/#league') {
  const events = {}, attributes = {}, classes = new Set(), offsets = {};
  const anchor = {addEventListener(type, fn) {this[type] = fn;}};
  const menu = {addEventListener(type, fn) {this[type] = fn;}, setAttribute(k,v) {attributes[k] = v;}, getAttribute(k) {return attributes[k];}, focus() {this.focused = true;}};
  const links = {classList:{toggle(k,on) {on ? classes.add(k) : classes.delete(k);}}, querySelectorAll() {return [anchor];}};
  let redirect;
  const document = {getElementById:id=>({menu,links}[id]), querySelector:()=>({getBoundingClientRect:()=>({height:102})}), documentElement:{style:{setProperty(k,v) {offsets[k] = v;}}}, addEventListener(k,v) {events[k] = v;}};
  // No Firebase imports or history shim: the standalone script must preserve native links.
  vm.runInNewContext(source, {URL, document, window:{location:{href,replace(value) {redirect = value;}}}});
  return {events, attributes, classes, offsets, menu, anchor, get redirect() {return redirect;}};
}
test('mobile menu works without Firebase, closes on selection and supports Escape', () => {
  const f = fixture();
  f.menu.click(); assert.equal(f.attributes['aria-expanded'], 'true'); assert(f.classes.has('open'));
  f.anchor.click(); assert.equal(f.attributes['aria-expanded'], 'false');
  f.menu.click(); f.events.keydown({key:'Escape'});
  assert.equal(f.attributes['aria-expanded'], 'false'); assert.equal(f.menu.focused, true);
  assert.equal(f.offsets['--header-offset'], '118px');
});
test('section fragments stay native and legacy route redirects retain search and fragment', () => {
  assert.equal(fixture().redirect, undefined);
  assert.equal(fixture('https://www.bamswebsitebuilder.com/coaching-ladder/admin-login.html?next=home#help').redirect, '/coaching-ladder/admin-login/?next=home#help');
});
