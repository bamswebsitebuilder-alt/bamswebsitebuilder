# Agreement verification

The agreement rules use a separate `users/{uid}/agreements/{id}` collection. Issued quotes are fixed records. Only the assigned verified account may create its single acceptance receipt, and that receipt cannot be edited or deleted. Admins may withdraw an unaccepted quote but cannot rewrite it or fabricate a client acceptance.

The owner prepares actual project details under Admin → Projects → Client quotes and agreements. Issue confirms the provider's terms; the client then reviews and accepts under Portal → Agreements. This does not collect payment. Each record stores the complete versioned terms text, keeping later policy changes from altering an issued quote. Never overwrite `project-terms-v1.json` for a new terms version; add a new version and update the model and rules deliberately.

The security tests require Node, Java 21+, Firebase CLI, `firebase`, and `@firebase/rules-unit-testing`. Run them against an isolated demo project with the Firestore emulator, never against production:

```
firebase emulators:exec --only firestore --project demo-bam-agreements "node tests/agreement-rules.test.mjs"
```

The browser fixtures in this directory are nonbinding localhost tests. `agreement-browser-flow.html` requires the isolated emulator and a `browser-test` quote fixture; it uses the same `acceptAgreement` transaction and renderer as the live client portal. It refuses to run on a public hostname. The preview fixture exercises rendering without a database. Tests are excluded from deployment.
