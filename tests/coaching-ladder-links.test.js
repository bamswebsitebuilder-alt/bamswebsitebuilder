import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('shared URLs become safe links while markup remains literal text', () => {
  const source = readFileSync(new URL('../coaching-ladder/discord-feed.js', import.meta.url), 'utf8');
  const document = {createElement:()=>({}), createTextNode:textContent=>({textContent})};
  const context = {URL, document};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('function link'), source.indexOf('function display')), context);
  const children = [], target = {append(...nodes) {children.push(...nodes);}};
  const text = '<img onerror=alert(1)> https://cfb.fan/playbooks/. javascript:alert(1)';
  context.appendTextLinks(target, text);
  assert.equal(children.map(n=>n.textContent).join(''), text);
  const links = children.filter(n=>n.href);
  assert.equal(links.length, 1);
  assert.equal(links[0].href, 'https://cfb.fan/playbooks/');
  assert.equal(links[0].rel, 'noopener noreferrer');
});
