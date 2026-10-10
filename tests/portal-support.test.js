import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/portal-messages.js', import.meta.url), 'utf8')
  .replace(/import\s+[\s\S]*?from\s+"[^"]+";/g, '');

function setup({ role = 'client', send = async () => {}, summaryFails = false } = {}) {
  const elements = new Map();
  const element = () => ({
    value: '', textContent: '', dataset: {}, children: [], handlers: {}, hidden: false,
    addEventListener(type, handler) { this.handlers[type] = handler; },
    replaceChildren() { this.children = []; },
    appendChild(child) { this.children.push(child); },
    append(...children) { this.children.push(...children); },
    focus() {},
    reset() { for (const id of ['portal-support-subject', 'portal-support-details']) elements.get(id).value = ''; }
  });
  for (const id of ['portal-support-form', 'portal-support-subject', 'portal-support-details', 'portal-support-send', 'portal-support-status', 'portal-support-history']) elements.set(id, element());
  let authChanged;
  const listeners = [];
  const writes = [];
  const summaries = [];
  const context = {
    document: { getElementById: id => elements.get(id), querySelector: () => null, createElement: element },
    window: { addEventListener() {}, setTimeout() {} }, console: { error() {}, warn() {} },
    auth: {}, db: {},
    onAuthStateChanged: (_auth, callback) => { authChanged = callback; },
    getDoc: async () => ({ exists: () => true, data: () => ({ role }) }),
    doc: (_db, ...parts) => parts.join('/'), collection: (_db, ...parts) => parts.join('/'),
    query: ref => ref, orderBy() {}, serverTimestamp: () => 'server-time', increment: n => n,
    onSnapshot: (ref, callback) => { listeners.push({ ref, callback }); return () => {}; },
    addDoc: async (ref, data) => { writes.push({ ref, data }); await send(); },
    updateDoc: async (ref, data) => { summaries.push({ ref, data }); if (summaryFails) throw Error('summary denied'); }
  };
  vm.runInNewContext(source, context);
  const fill = () => {
    elements.get('portal-support-subject').value = ' Fix the home page ';
    elements.get('portal-support-details').value = ' The contact button is broken. ';
  };
  return { elements, writes, summaries, listeners, fill,
    login: user => authChanged(user),
    submit: () => elements.get('portal-support-form').handlers.submit({ preventDefault() {} }) };
}

const client = { uid: 'client-123', email: 'client@example.com' };

test('request uses existing admin inbox schema and only clears after the write succeeds', async () => {
  const app = setup({ summaryFails: true });
  await app.login(client); app.fill(); await app.submit();
  assert.equal(app.writes.length, 1);
  assert.equal(app.writes[0].ref, 'users/client-123/messages');
  assert.deepEqual(Object.keys(app.writes[0].data).sort(), ['createdAt', 'recipientId', 'seen', 'sender', 'senderId', 'text', 'timestamp']);
  assert.equal(app.writes[0].data.text, '[Support request] Fix the home page\n\nThe contact button is broken.');
  assert.equal(app.writes[0].data.senderId, client.uid);
  assert.equal(app.summaries[0].data.unreadByAdmin, 1);
  assert.equal(app.elements.get('portal-support-details').value, '');
  assert.equal(app.elements.get('portal-support-status').dataset.type, 'success');
});

test('failed write retains the draft and allows retry', async () => {
  const app = setup({ send: async () => { throw Error('permission denied'); } });
  await app.login(client); app.fill(); await app.submit();
  assert.match(app.elements.get('portal-support-details').value, /contact button/);
  assert.equal(app.elements.get('portal-support-status').dataset.type, 'error');
  assert.equal(app.elements.get('portal-support-send').disabled, false);
  assert.equal(app.summaries.length, 0);
});

test('repeated submits while a request is pending create one message', async () => {
  let finish;
  const app = setup({ send: () => new Promise(resolve => { finish = resolve; }) });
  await app.login(client); app.fill();
  const pending = app.submit(); await app.submit();
  assert.equal(app.writes.length, 1);
  assert.equal(app.elements.get('portal-support-send').disabled, true);
  finish(); await pending;
  assert.equal(app.elements.get('portal-support-send').disabled, false);
});

test('signed-out and non-client accounts cannot submit, and blank drafts are rejected', async () => {
  for (const role of ['client', 'admin']) {
    const app = setup({ role });
    await app.login(role === 'client' ? null : client); app.fill(); await app.submit();
    assert.equal(app.writes.length, 0);
  }
  const app = setup(); await app.login(client); app.fill();
  app.elements.get('portal-support-details').value = '   '; await app.submit();
  assert.equal(app.writes.length, 0);
});

test('history contains only client support requests and renders user content as text', async () => {
  const app = setup(); await app.login(client);
  const messages = [
    { sender: 'client', text: 'Ordinary message' },
    { sender: 'admin', text: '[Support request] Admin reply' },
    { sender: 'client', text: '[Support request] <img onerror=alert(1)>\n\n<script>bad</script>', seen: true, timestamp: '2026-10-10T12:00:00Z' }
  ];
  app.listeners.find(item => item.ref.endsWith('/messages')).callback({ docs: messages.map(data => ({ data: () => data })) });
  const history = app.elements.get('portal-support-history');
  assert.equal(history.children.length, 1);
  assert.equal(history.children[0].children[0].textContent, '<img onerror=alert(1)>');
  assert.equal(history.children[0].children[1].textContent, '<script>bad</script>');
  assert.match(history.children[0].children[2].textContent, /Seen by/);
  await app.login(null);
  assert.equal(app.elements.get('portal-support-send').disabled, true);
  assert.match(history.textContent, /Sign in/);
});
