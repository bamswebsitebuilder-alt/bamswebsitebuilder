import { readFileSync } from 'node:fs';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'crm-rules-ci',
    firestore: { host: '127.0.0.1', port: 8088, rules: readFileSync('../../firestore.rules', 'utf8') }
  });
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/admin'), { role: 'admin' });
    await setDoc(doc(db, 'users/client'), { role: 'client' });
  });
});
after(async () => { if (env) await env.cleanup(); });
const db = (uid, verified = true) => env.authenticatedContext(uid, { email_verified: verified }).firestore();
const lead = () => ({
  name: 'Example', email: 'example@example.com', business: 'Example LLC',
  phone: '555-0100', notes: '', source: 'admin', stage: 'new',
  createdBy: 'admin', createdAt: serverTimestamp(), updatedAt: serverTimestamp()
});

test('anonymous and clients cannot create or read leads', async () => {
  const path = 'crmLeads/denied';
  await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), path), lead()));
  await assertFails(setDoc(doc(db('client'), path), lead()));
  await assertFails(getDoc(doc(db('client'), path)));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), path)));
});
test('unverified admin cannot create a lead', async () => {
  await assertFails(setDoc(doc(db('admin', false), 'crmLeads/unverified'), lead()));
});
test('verified admin can create, read and change stage', async () => {
  const path = 'crmLeads/valid';
  await assertSucceeds(setDoc(doc(db('admin'), path), lead()));
  const record = await assertSucceeds(getDoc(doc(db('admin'), path)));
  assert.equal(record.data().stage, 'new');
  await assertSucceeds(updateDoc(doc(db('admin'), path), { stage: 'quoted', updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(doc(db('admin'), path), { email: 'changed@example.com', updatedAt: serverTimestamp() }));
  await assertFails(deleteDoc(doc(db('admin'), path)));
});
test('invalid stage and spoofed creator are denied', async () => {
  await assertFails(setDoc(doc(db('admin'), 'crmLeads/invalid'), { ...lead(), stage: 'invalid' }));
  await assertFails(setDoc(doc(db('admin'), 'crmLeads/spoof'), { ...lead(), createdBy: 'client' }));
});

test('verified admin can edit lead details, follow-up date and estimate', async () => {
  const path = 'crmLeads/editable';
  await assertSucceeds(setDoc(doc(db('admin'), path), lead()));
  await assertSucceeds(updateDoc(doc(db('admin'), path), {
    business: 'Updated LLC', notes: 'Follow up on design', followUpDate: '2026-12-01',
    estimateCents: 85000, updatedAt: serverTimestamp()
  }));
  let record = await assertSucceeds(getDoc(doc(db('admin'), path)));
  assert.equal(record.data().estimateCents, 85000);
  await assertSucceeds(updateDoc(doc(db('admin'), path), { followUpDate: '', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(db('client'), path), { notes: 'tamper', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(db('admin'), path), { createdBy: 'client', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(db('admin'), path), { source: 'external', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(db('admin'), path), { estimateCents: -10, updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(db('admin'), path), { followUpDate: 'tomorrow', updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(doc(db('admin'), path), { stage: 'won', updatedAt: serverTimestamp() }));
});
