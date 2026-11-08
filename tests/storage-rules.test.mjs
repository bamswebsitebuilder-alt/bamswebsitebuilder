import fs from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getBytes, listAll, deleteObject } from 'firebase/storage';

const env = await initializeTestEnvironment({
  projectId: 'demo-bam-storage',
  firestore: { host: '127.0.0.1', port: 8088, rules: await fs.readFile('firestore.rules', 'utf8') },
  storage: { host: '127.0.0.1', port: 9199, rules: await fs.readFile('storage.rules', 'utf8') }
});
const context = (uid, verified = true, claims = {}) => env.authenticatedContext(uid, { email_verified: verified, ...claims });
const admin = context('admin'), client = context('client'), other = context('other');
const file = (ctx, uid, name = 'test.txt') => ref(ctx.storage(), `users/${uid}/uploads/${name}`);
const bytes = new Uint8Array([1, 2, 3]);
let checks = 0;
const allow = async p => { await assertSucceeds(p); checks++; };
const deny = async p => { await assertFails(p); checks++; };
try {
  await env.withSecurityRulesDisabled(async ctx => {
    for (const [id, role] of [['admin','admin'],['client','client'],['other','client']]) {
      await setDoc(doc(ctx.firestore(), 'users', id), { role });
    }
  });
  await allow(uploadBytes(file(admin, 'client'), bytes));
  await allow(uploadBytes(file(admin, 'other'), bytes));
  await allow(getBytes(file(client, 'client')));
  await allow(getBytes(file(admin, 'client')));
  await allow(listAll(ref(client.storage(), 'users/client/uploads')));
  await allow(listAll(ref(admin.storage(), 'users/client/uploads')));
  await deny(getBytes(file(other, 'client')));
  await deny(listAll(ref(other.storage(), 'users/client/uploads')));
  await deny(uploadBytes(file(other, 'client', 'intruder.txt'), bytes));
  await deny(getBytes(file(env.unauthenticatedContext(), 'client')));
  await deny(uploadBytes(file(env.unauthenticatedContext(), 'client'), bytes));
  await deny(uploadBytes(file(context('admin', false), 'client', 'unverified.txt'), bytes));
  await deny(uploadBytes(file(context('pretend-admin', true, { role: 'admin' }), 'client'), bytes));
  await allow(uploadBytes(file(client, 'client', 'own.txt'), bytes));
  await deny(uploadBytes(file(client, 'client'), new Uint8Array([9, 8, 7, 6])));
  await deny(deleteObject(file(client, 'client')));
  await allow(uploadBytes(file(admin, 'client'), bytes));
  await deny(uploadBytes(file(admin, 'client', 'large.bin'), new Uint8Array(15 * 1024 * 1024 + 1)));
  await deny(uploadBytes(file(client, 'client', 'empty.txt'), new Uint8Array(0)));
  await deny(uploadBytes(ref(admin.storage(), 'unrelated/test.txt'), bytes));
  await deny(updateDoc(doc(client.firestore(), 'users/client'), { role: 'admin' }));
  await deny(setDoc(doc(other.firestore(), 'users/forged'), { role: 'admin' }));
  // A newly created client needs no rule edits or account-specific allowlist.
  await allow(setDoc(doc(admin.firestore(), 'users/new-client'), { role: 'client' }));
  await allow(uploadBytes(file(admin, 'new-client'), bytes));
  await allow(getBytes(file(context('new-client'), 'new-client')));
  await deny(getBytes(file(client, 'new-client')));
  await allow(deleteObject(file(admin, 'client')));
  console.log(`PASS: ${checks} storage checks, including admin access, new clients, role escalation, size limits and client isolation.`);
} finally {
  await env.cleanup();
}
