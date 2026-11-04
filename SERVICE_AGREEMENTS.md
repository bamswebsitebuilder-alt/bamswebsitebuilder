# BAM client service agreement workflow

Implemented against repository `bamswebsitebuilder-alt/bamswebsitebuilder`, starting at `04611b7`, on local branch `client-service-agreements`. No deployment, remote push, Jotform submission or production agreement write was performed.

## Operating the workflow

1. Sign in as an existing administrator and open **Client Agreements**. The original Projects → Client quotes and agreements workflow remains separate and continues to govern existing quote acceptance/payment dependencies.
2. Choose a client, edit the recovered 18-section agreement, complete client/project/payment/date placeholders and supply the exact statement of work. Signature placeholders remain for Jotform. Review and assign the fixed record. Assignment does not sign anything or collect payment.
3. The verified client sees it under **My Agreements** in the existing Agreements panel. Both English and Spanish routes include the new section; the new agreement content and controls currently use English so the legal draft is not silently translated.
4. A client-specific Jotform invitation overrides the configured default. Otherwise the default is `https://form.jotform.com/263058308288060`, supplied by the owner. Clients can open it in a new tab or click **Show signing document**. Embedding uses a scrollable frame without the supplied global scroll handler, broad device permissions or third-party resize script. The provided URL is a form URL; its contents and two-recipient Sign configuration were not verified.
5. After reviewing Jotform, staff may record **client signed**, **both parties signed**, or **cancelled**. A reference/reason and explicit staff review are required. Completion also requires a PDF beginning with `%PDF-`, no larger than 700 KiB. Both signatures, dates, identity and the exact assigned text must be checked in Jotform before completion.
6. The completed PDF becomes available to the assigned verified client and administrators. Completed/cancelled records and uploaded PDFs are immutable through the application rules. Assign a new agreement for amendments; old agreements remain accessible.

## Security and data

New records live at `users/{uid}/serviceAgreements/{id}`. Assignment text, client, version, link and creation metadata cannot be changed after issue. Clients cannot change signing status, issue agreements or upload completion evidence. Status transitions and PDF creation must commit atomically. The signed PDF is a separate byte record at `documents/signed`, fetched only when the authorized user requests it. No public Storage token URL is created. The existing Storage rules/files are untouched. The 700 KiB limit keeps the PDF within Firestore document limits; compress larger PDFs before upload. PDFs are not included in agreement-list snapshots, local/session storage or the service worker's static caches.

Strict field/type/size validators and timestamp checks apply to new agreement records. Existing project/quote rules were preserved. Emulator tests cover unauthenticated/cross-client/unverified access, role escalation, missing/extra/oversized/malformed data, immutable terms and ownership, invalid status transitions, completion without a PDF, non-atomic uploads, oversized PDFs, orphan documents and mutation/deletion of retained copies. These checks do not verify the actual legal contents of a PDF or replace staff signature review.

Notifications: assignments/status updates appear in live agreement cards, inline change notices and the admin Notifications activity list. Existing browser notification permission enables alerts while the page is open. No background push, email, scheduled reminders or Jotform webhook is installed. Admin activity currently reflects the most recent status per agreement; this is not a full event/audit log. Jotform's signature audit trail should accompany the completed document.

## Jotform setup still needed

- Confirm the provided form contains the finalized agreement and statement of work and has the correct client and BAM representative signature/date fields, electronic records consent and separate portfolio choice. Configure a true two-recipient Sign workflow if that is required; an ordinary public form embed does not establish that workflow.
- Use recipient-specific invitations per assignment for client identity and routing. Do not put client-specific invitation links or secrets in the public configuration file. Staff must check signer identity and the agreement text before recording completion.
- To automate status and PDF retrieval, supply server-side Jotform API access, the correct account/region, form/Sign document identifiers, confirmed supported API capabilities, and a secure callback mechanism. Establish a server-controlled assignment-to-recipient/document mapping, verify completion with the provider API, protect callback authenticity and reject replay/unmatched submissions before writing Firebase. Never trust a client iframe success message or an unverified callback to mark an agreement signed.
- No API/webhook handler is enabled or claimed in this change because no credentials were provided. Do not paste an API key into `js/service-agreement-config.js` or the browser.

## Configuration and release

`js/service-agreement-config.js` contains public defaults only: the owner-supplied form link and `displayMode: 'embed'`. Change to `link` to suppress embedded viewing. Each assignment stores its own link snapshot; later default changes do not alter existing assignments.

The existing `bam-client-portal` default database was confirmed as STANDARD / FIRESTORE_NATIVE through a read-only Firebase CLI check. No schema migration or provisioning is required. The Firebase emulator compiled the updated rules. Production rules and website assets still need a coordinated, explicitly authorized release: apply the additive Firestore rules first, then publish the portal assets through the site's existing hosting pipeline. Existing Firebase and Vercel configuration does not by itself authorize deployment. Check existing deployed rules for drift before publishing. No blanket Storage rules change is needed.

Validation performed: 22 model/portal/quote automation tests; 50 new Firestore security checks; 35 existing quote security checks; browser interaction checks on both admin routes and the client section using isolated Firebase doubles. No live Jotform signing, real client account test or production PDF transfer was performed.
