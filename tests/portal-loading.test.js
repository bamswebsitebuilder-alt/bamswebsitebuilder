import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function setup(locale) {
  const source = readFileSync(new URL(`../js/portal-auth${locale}.js`, import.meta.url), 'utf8')
    .replace(/import\s+[\s\S]*?from\s+"[^"]+";/g, '');
  const calls = [];
  const element = () => ({
    appendChild() {}, replaceChildren() {}, addEventListener() {},
    classList: { contains: () => false }
  });
  const elements = new Map(['client-file-list', 'client-invoice-list', 'portal-welcome']
    .map(id => [id, element()]));
  let authChanged;
  let resolveProfile;
  const profileRequest = new Promise(resolve => { resolveProfile = resolve; });

  vm.runInNewContext(source, {
    document: { getElementById: id => elements.get(id), createElement: element },
    window: { location: { replace: url => calls.push(url) } },
    console: { error() {} }, auth: {}, db: {}, storage: {},
    onAuthStateChanged: (_auth, callback) => { authChanged = callback; },
    doc: (_db, ...parts) => parts.join('/'), collection: (_db, ...parts) => parts.join('/'),
    query: ref => ref, orderBy() {},
    getDoc: () => profileRequest,
    onSnapshot: ref => { calls.push(ref); return () => {}; },
    ref: (_storage, path) => path,
    listAll: async ref => { calls.push(ref); return { items: [] }; },
    portalLoginUrl: () => '/login',
    signOut: async () => { calls.push('signed out'); }
  });
  return { login: user => authChanged(user), resolveProfile, calls, elements };
}

for (const locale of ['', '-es']) {
  test(`portal${locale} starts project, invoice, and file requests without waiting for the profile`, async () => {
    const app = setup(locale);
    const pending = app.login({ uid: 'fixture', displayName: 'Test Client', emailVerified: true });
    assert.deepEqual(app.calls, ['users/fixture/invoices', 'users/fixture/projects/current', 'users/fixture/uploads']);
    app.resolveProfile({ exists: () => false });
    await pending;
    assert.match(app.elements.get('portal-welcome').textContent, /Test/);
  });

  test(`portal${locale} does not request dashboard data before verification`, async () => {
    const app = setup(locale);
    await app.login(null);
    await app.login({ uid: 'fixture', emailVerified: false });
    assert.deepEqual(app.calls, ['/login', 'signed out', 'login.html?verify=1']);
  });
}

for (const language of ['', 'es/']) {
  for (const [page, formId] of [['login', 'login-form'], ['register', 'register-form'], ['forgot-password', 'forgot-form']]) {
    test(`${language}${page} uses POST for native submission when Firebase code is unavailable`, () => {
      const html = readFileSync(new URL(`../${language}${page}.html`, import.meta.url), 'utf8');
      const form = html.match(new RegExp(`<form\\b[^>]*\\bid="${formId}"[^>]*>`))?.[0];
      assert.match(form, /\bmethod="post"/i);
    });
  }
}
