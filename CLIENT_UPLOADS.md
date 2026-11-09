# Client file uploads

Both portal languages use `users/{clientUid}/uploads/`. The versioned
`storage.rules` grants verified administrators access using the existing protected
Firestore `users/{adminUid}.role == 'admin'` record. Clients can read/list their
own files and add nonempty files without a portal-defined size limit. Clients cannot access another
client's folder or replace/delete staff deliverables. No per-client rule changes
are needed when new clients are added.

Administrator and client uploads have no application-defined size cap. ZIP and 7z archives are accepted by both portal languages. Empty files are
still rejected by the admin form. Firebase Storage's platform limits still apply.

The live Storage rules differ from this versioned rules file. The November 8 client archive update removes the live size condition and permits ZIP/7z MIME types (including the browser binary fallback), while retaining the live owner/admin access checks and document/image types. The November 8,
2026 admin size-limit release patches only the live size condition to exempt
admins, preserving existing live permissions and file-type restrictions. A full
deployment of this rules file is a separate change requiring review of that drift.

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
