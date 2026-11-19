# CRM Phase 1: verification and release checklist

This branch adds a private admin-only CRM lead list. It is **not** a public lead-capture endpoint.

## Existing contact form
The public `contact.html` currently POSTs to FormSubmit. Do not replace it with unauthenticated Firestore writes. A future server endpoint must validate input, rate-limit submissions, verify anti-spam signals, and write using a server-side identity. Keep FormSubmit operational until that endpoint is tested.

## Firestore rules checks (Firebase emulator)
Before deploying, test all of the following with the Firebase Firestore emulator and `@firebase/rules-unit-testing`:
1. Anonymous user: cannot read, create, or modify `crmLeads`.
2. Signed-in client (`users/{uid}.role == "client"`): cannot read, create, or modify leads.
3. Unverified admin: cannot read or write leads.
4. Verified admin: can create a complete lead with `createdBy == auth.uid`, `stage == "new"`, and server timestamps.
5. Verified admin: can read leads and change only `stage` and `updatedAt`.
6. Verified admin: cannot change `createdBy`, `createdAt`, or contact fields after creation.
7. Verified admin: cannot delete a lead.
8. Invalid stage, oversized notes, and missing fields are rejected.

## UI checks
- Confirm admin auth gate and navigation to `#crm`.
- Add lead, reload, confirm persisted record.
- Change stage, reload, confirm persisted stage.
- Test denied permissions and network failures.
- Test narrow mobile width and keyboard navigation.
- Verify all existing Clients, Projects, Invoices, Files, and Messages sections still work.

## Release
- Deploy `firestore.rules` to Firebase project `bam-client-portal` before enabling CRM UI.
- Verify production auth and security rules after deployment.
- Deploy frontend from the approved branch through the site's existing hosting workflow.
- Do not merge or publish until tests pass.
