import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createInvoicePriceEditor } from '../js/invoice-price-editor.js';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

test('invoice price edits support cancel, validation, save failures and retry without duplicate saves', async () => {
  const dom = new JSDOM('<body></body>');
  globalThis.document = dom.window.document;
  let calls = [], fail = true, finish;
  const editor = createInvoicePriceEditor({amount: 199.99}, async price => {
    calls.push(price);
    if (fail) throw Error('Unable to connect. Please try again.');
    await new Promise(resolve => { finish = resolve; });
  });
  document.body.append(editor);
  const [edit, save, cancel] = editor.querySelectorAll('button');
  const form = editor.querySelector('form');
  const input = editor.querySelector('input');
  const status = editor.querySelector('[role="status"]');
  const submit = () => form.dispatchEvent(new dom.window.Event('submit', {cancelable: true}));
  edit.click();
  assert.equal(input.value, '199.99');
  assert.equal(document.activeElement, input);
  input.value = '150';
  cancel.click();
  assert.equal(form.hidden, true);
  assert.equal(calls.length, 0);
  edit.click();
  assert.equal(input.value, '199.99');
  for (const invalid of ['', '0', '-1', '10.001']) {
    input.value = invalid;
    submit();
  }
  assert.equal(calls.length, 0);
  input.value = '149.95';
  submit();
  await new Promise(setImmediate);
  assert.match(status.textContent, /Unable to connect/);
  assert.equal(form.hidden, false);
  assert.equal(input.value, '149.95');
  assert.equal(save.disabled, false);
  fail = false;
  submit();
  submit();
  assert.deepEqual(calls, [149.95, 149.95]);
  assert.equal(cancel.disabled, true);
  form.dispatchEvent(new dom.window.KeyboardEvent('keydown', {key: 'Escape', cancelable: true}));
  assert.equal(form.hidden, false);
  finish();
  await new Promise(setImmediate);
  assert.equal(form.hidden, true);
  assert.match(status.textContent, /Price saved/);
  edit.click();
  assert.equal(input.value, '149.95');
  form.dispatchEvent(new dom.window.KeyboardEvent('keydown', {key: 'Escape', cancelable: true}));
  assert.equal(form.hidden, true);
  assert.equal(document.activeElement, edit);
  delete globalThis.document;
  dom.window.close();
});

test('Spanish admin invoice controls are translated', () => {
  const dom = new JSDOM('<body></body>');
  globalThis.document = dom.window.document;
  const editor = createInvoicePriceEditor({amount: 25}, () => {}, true);
  assert.match(editor.textContent, /Editar precio/);
  assert.match(editor.textContent, /Guardar/);
  assert.match(editor.textContent, /Cancelar/);
  delete globalThis.document;
  dom.window.close();
});

test('admin saves the existing invoice amount, preserving fields and rejecting stale or missing invoices', async () => {
  const source = await readFile(new URL('../js/admin-dashboard.js', import.meta.url), 'utf8');
  const render = source.slice(source.indexOf('const renderInvoices ='), source.indexOf('const updateStats ='));
  const dom = new JSDOM('<div id="invoices"></div>');
  const invoice = {id: 'invoice-1', userId: 'client-1', amount: 200, status: 'paid', invoiceNumber: 'INV-001'};
  let save, exists = true, writes = 0;
  const stored = {...invoice, description: 'Original scope', pdfUrl: 'https://example.com/invoice.pdf'};
  const context = {
    document: dom.window.document, invoiceList: dom.window.document.getElementById('invoices'),
    invoiceRecords: [invoice], clientRecords: [{id: 'client-1'}], spanish: false,
    currentAdmin: {uid: 'admin'}, db: {}, invoiceFormStatus: null,
    getClientLabel: () => 'Client', formatCurrency: String, formatDate: String, showStatus() {},
    createInvoicePriceEditor: (_invoice, handler) => {save = handler; return dom.window.document.createElement('div');},
    doc: (_db, ...path) => {assert.deepEqual(path, ['users', 'client-1', 'invoices', 'invoice-1']); return 'invoice-ref';},
    serverTimestamp: () => 'server-time',
    runTransaction: async (_db, callback) => callback({
      get: async () => ({exists: () => exists, data: () => stored}),
      update: (ref, patch) => {
        assert.equal(ref, 'invoice-ref');
        assert.deepEqual(Object.keys(patch).sort(), ['amount', 'updatedAt']);
        writes++;
        Object.assign(stored, patch);
      }
    })
  };
  runInNewContext(render + '\nrenderInvoices();', context);
  await save(149.95);
  assert.equal(stored.amount, 149.95);
  assert.equal(stored.status, 'paid');
  assert.equal(stored.description, 'Original scope');
  assert.equal(stored.pdfUrl, 'https://example.com/invoice.pdf');
  await assert.rejects(save(99), /price changed/);
  exists = false;
  await assert.rejects(save(99), /no longer exists/);
  context.currentAdmin = null;
  await assert.rejects(save(99), /sign in as an administrator/);
  assert.equal(writes, 1);
  dom.window.close();
});
