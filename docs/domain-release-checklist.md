# Domain checkout release checklist

Checkout is disabled pending all of the following:

- Confirm ResellerClub API authentication and sandbox availability response using official API docs.
- Verify reseller account supports registration and renewal API endpoints and customer/contact IDs.
- Implement Firebase ID token verification and server-side Firestore order storage with access rules.
- Create immutable server-side registrar-price quotes including markup, taxes, renewal disclosures and expiration.
- Implement PayPal sandbox Orders v2 create, capture and verified webhook reconciliation with idempotency.
- Implement ResellerClub domain registration only after verified payment, with retries and manual review of ambiguous outcomes.
- Handle refunds, cancellations, registration failure, renewals, WHOIS/registrant consent, and privacy policy.
- Test duplicate requests, wrong amounts, expired quotes, network failures and payment disputes.
- Obtain explicit approval before enabling production payments or registrar writes.
