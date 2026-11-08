# Client file uploads

Both portal languages use `users/{clientUid}/uploads/`. The versioned
`storage.rules` grants verified administrators access using the existing protected
Firestore `users/{adminUid}.role == 'admin'` record. Clients can read/list their
own files and add nonempty files up to 15 MiB. Clients cannot access another
client's folder or replace/delete staff deliverables. No per-client rule changes
are needed when new clients are added.

## Publish the backend rules

Website deployments to Vercel do not deploy Firebase rules. From a Firebase CLI
session authorized for `bam-client-portal`, run:

```
firebase deploy --only storage --project bam-client-portal
```

On the first deployment, Firebase may request enabling the Storage Rules service
agent's Firestore access for the admin-role lookup. Enable that integration in
the Firebase deployment flow. Review the existing live Storage rules before
deployment if other applications use this bucket; this file covers only the
portal upload folder. Do not publish public read/write rules or grant every
signed-in user access to every client.

After publication, sign into the admin portal, select a client, upload a file,
and confirm it appears in that client's Files panel. Repeat for a second client.
Do not treat a website deployment alone as confirmation of the backend fix.

## Isolated verification

Install `firebase`, `@firebase/rules-unit-testing` and `firebase-tools@14.12.1`
as local test dependencies (Java 17+), then run:

```
npx firebase emulators:exec --only firestore,storage --project demo-bam-storage "node tests/storage-rules.test.mjs"
```

This uses synthetic files and accounts only. It checks existing and newly added
clients, private reads/listing, upload limits, unverified/anonymous rejection,
protected admin roles and prevention of client changes to staff files.
