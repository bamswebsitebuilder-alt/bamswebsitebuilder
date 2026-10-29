# Agreement verification

The agreement rules use a separate `users/{uid}/agreements/{id}` collection. Issued quotes are fixed records. Only the assigned verified account may create its single acceptance receipt, and that receipt cannot be edited or deleted. Admins may withdraw an unaccepted quote but cannot rewrite it or fabricate a client acceptance.

The owner prepares actual project details under Admin → Projects → Client quotes and agreements. Issue confirms the provider's terms; the client then reviews and accepts under Portal → Agreements. This does not collect payment. Each record stores the complete versioned terms text, keeping later policy changes from altering an issued quote. Never overwrite `project-terms-v1.json` for a new terms version; add a new version and update the model and rules deliberately.

The security tests require Node, Java 21+, Firebase CLI, `firebase`, and `@firebase/rules-unit-testing`. Run them against an isolated demo project with the Firestore emulator, never against production:

```
firebase emulators:exec --only firestore --project demo-bam-agreements "node tests/agreement-rules.test.mjs"
```

Browser acceptance was also verified with nonbinding localhost fixtures against the isolated emulator using the production transaction and renderer. Those temporary browser fixtures are kept outside the published repository.

Agreement automation prepares a draft when an admin saves a client project or selects a client. Published package presets fill prices, payment schedules, estimates and revisions. Exact scope and outside costs remain required. Drafts are isolated by admin and client in browser-tab session storage; issued quotes are fixed Firestore records. Approve and issue uses a deterministic quote-number record ID so an uncertain commit can be retried without creating a second quote. Tests: `node --test tests/agreement-automation.test.js`.

# Managed hosting

Admin → Hosting stores the client-visible hosting record in `users/{uid}/projects/current.hosting`. The existing project rules permit admins to write and only that client/admin to read. No new collection or rule deployment is required. Project editing uses merge writes; hosting editing uses a transaction that updates only the hosting map and project update timestamp. A revision check prevents stale edits from overwriting another administrator's changes. Hosting records do not provision infrastructure or change payments.

The reusable standard PayPal hosting plan is $39/month, with no setup fee or trial; custom plans remain supported. Hosting is separate from website-build installments, domain registration/renewals, email, and maintenance. An optional PayPal recurring plan is linked by its P- plan ID only after the client has accepted the referenced portal quote. Quote document IDs use the same SHA-256 of the quote number as the agreement issuer. Staff must verify that the hosted PayPal plan's merchant, amount and frequency match the accepted hosting terms. Only an awaiting-authorization record exposes the link; active subscriptions do not offer another signup. Payment and service status are manually maintained, not webhook-verified or monitored automatically. No sandbox data, public fixture, or simulated payment state is published.

Dependencies for the UI and emulator tests: `npm install --no-save jsdom firebase @firebase/rules-unit-testing`.

```
node --test tests/hosting.test.js tests/hosting-ui.test.js tests/menu-organization.test.js tests/public-shell.test.js tests/project-workflow.test.js tests/portal-support.test.js
npx firebase-tools@14.12.1 emulators:exec --project demo-bam-hosting --only firestore 'node tests/hosting-store.test.mjs'
```

The second command uses an isolated demo emulator (Java 17 with Firebase CLI 14). It checks the actual production transaction implementation, preserving project fields, stale-write conflicts, client/cross-client/anonymous isolation, unaccepted or wrong-client quote rejection, and successful accepted-quote linkage. Domain name, registrar, owner, renewal date, and HTTPS registrar-account URL are stored in the same hosting map and displayed read-only to the client. Domain renewals appear in the admin renewal filter and count alongside hosting renewals. Domain links do not register, transfer, or renew a domain. The purchase panel explains missing setup and exposes PayPal only after accepted-quote linkage. Production portal accounts were not modified during verification.
