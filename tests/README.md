# Agreement verification

## Change requests and attention dashboard

Run `node --test tests/change-request-model.test.js` for URL/file validation,
request transitions, and attention priority checks. With `firebase`,
`@firebase/rules-unit-testing`, Firebase CLI, and Java available, run the isolated
Firestore suite with `firebase emulators:exec --only firestore --project
demo-bam-requests "node tests/change-request-rules.test.mjs"`. This tests owner
and admin queries, cross-client isolation, immutable original request details,
bounded fields, timestamps, allowed review/cancellation transitions, and denial
of deletion. Do not run these tests against a production database.

Requests are stored at `users/{clientUid}/changeRequests/{requestId}`. Screenshots
use the existing owned `users/{uid}/uploads/` storage path. The request contains
the storage path rather than a public download URL. The UI reads the latest 100
requests per client and discloses that limit. Extra-work classification does not
collect payment or replace a separate accepted quote.

The agreement rules use a separate `users/{uid}/agreements/{id}` collection. Issued quotes are fixed records. Only the assigned verified account may create its single acceptance receipt, and that receipt cannot be edited or deleted. Admins may withdraw an unaccepted quote but cannot rewrite it or fabricate a client acceptance.

The owner prepares actual project details under Admin → Projects → Client quotes and agreements. Issue confirms the provider's terms; the client then reviews and accepts under Portal → Agreements. This does not collect payment. Each record stores the complete versioned terms text, keeping later policy changes from altering an issued quote. Never overwrite `project-terms-v1.json` for a new terms version; add a new version and update the model and rules deliberately.

The security tests require Node, Java 21+, Firebase CLI, `firebase`, and `@firebase/rules-unit-testing`. Run them against an isolated demo project with the Firestore emulator, never against production:

```
firebase emulators:exec --only firestore --project demo-bam-agreements "node tests/agreement-rules.test.mjs"
```

Browser acceptance was also verified with nonbinding localhost fixtures against the isolated emulator using the production transaction and renderer. Those temporary browser fixtures are kept outside the published repository.

Agreement automation prepares a draft when an admin saves a client project or selects a client. Published package presets fill prices, payment schedules, estimates and revisions. Exact scope and outside costs remain required. Drafts are isolated by admin and client in browser-tab session storage; issued quotes are fixed Firestore records. Approve and issue uses a deterministic quote-number record ID so an uncertain commit can be retried without creating a second quote. Tests: `node --test tests/agreement-automation.test.js`.
