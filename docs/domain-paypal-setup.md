# BAM's Website Builder — Domain checkout staging
This branch stages /domains, a Vercel registrar availability endpoint and a launch checklist. It does **not** charge users or register domains; no fake prices, purchase buttons or success claims are shown.

## Account setup
1. Create ResellerClub reseller account and sandbox account at https://www.resellerclub.com/developer-portal ; obtain reseller user ID and API key. Fund test account if testing registration requires balance.
2. Set Vercel environment variables **in Vercel dashboard** (never commit secrets): RESELLERCLUB_API_KEY, RESELLERCLUB_USER_ID, RESELLERCLUB_ENV=sandbox initially. Verify API scopes and deployment before setting 'live'.
3. Create PayPal Business REST app at https://developer.paypal.com/dashboard/applications/sandbox ; configure PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENV=sandbox, and server-side authenticated Orders v2.
4. Configure Firebase project/service account through protected Vercel variables, create Firestore domainOrders collection and authenticated customer ownership rules.
5. Define registration price, renewal price, currency, margin, supported TLDs, domain contact consent, refund/transfer terms, provider-funded account and nameserver choices. Do not publish prices that are not confirmed through pricing API.

## Implementation sequence remaining
- Verify the exact ResellerClub v2 /domains/available response in sandbox and harden parser/tests.
- Authenticate customers with Firebase ID tokens verified server-side.
- Create customer/contact records at ResellerClub with customer-authorized registrant data.
- Server-side quote: verify available and non-premium, calculate checkout amount server-side, persist quote with short expiry in Firestore. Reject unsupported extensions and concurrent duplicate orders.
- PayPal Orders v2: server creates order for immutable quote, browser approves, backend captures; verify via PayPal API and verified webhooks. Ignore client-supplied pricing, deduplicate callbacks by PayPal order/capture ID, reconcile missing callbacks.
- Registrar registration after confirmed capture; durable idempotent state machine, retry reconciliation, explicit exception/refund policy for taken domains. Confirm successful registrar order status before showing 'Registered' to customers.
- Add My Domains to Firebase client portal only after authorizations, Firestore rules and registrations are tested.
- QA sandbox and only then move accounts to live; do not turn on checkout during partial configuration.

## Routes
- /domains (Vercel cleanUrls for domains.html)
- /api/domain-availability?domain=example.com

Keep the branch unmerged pending credential setup, security review and testing.
