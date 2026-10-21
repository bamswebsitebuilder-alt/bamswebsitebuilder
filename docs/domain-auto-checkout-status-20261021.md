# Automatic domain checkout — sandbox release gates (2026-10-21)

All checkout code on this branch is development-only. Do not merge or enable payments before all checks pass.

## Implemented in code (not tested end to end)
- Sandbox ResellerClub availability with .com, .net, .org, .co whitelist.
- Firebase authenticated order history and quote requests.
- One-year server-generated quote with registrar cost, premium check, customer consent, expiry.
- PayPal Orders v2 sandbox create and capture endpoints that load price from Firestore.
- Idempotency-locked registrar submission, review of ambiguous outcomes, and background-only registration helper.
- Capture and order-state unit tests and a GitHub Actions test workflow.

## Protected defaults
- DOMAIN_ENABLE_SANDBOX_PAYMENTS=false
- DOMAIN_ENABLE_SANDBOX_REGISTRATION=false
- The background-only registration helper has no public trigger.
- Production payments and registration remain disabled.

## Required before launch
1. Test real sandbox ResellerClub v2 authentication, availability, wholesale cost and premium responses.
2. Confirm availability cost.action / price / currency shape for the reseller account; fail closed if unrecognized.
3. Configure and validate nameservers and TLD-specific registrant requirements.
4. Check domain ownership, privacy/terms, refunds, tax treatment and renewal disclosures.
5. Deploy and validate Firestore rules. Confirm client writes to payment/order state are denied.
6. Add customer PayPal approval UX, trusted webhook reconciliation, and refund path.
7. Integrate a secure background scheduler/worker and confirm registrar final state before setting orders to registered.
8. Complete an end-to-end sandbox test including failure, duplicate, timeout, premium and recovery cases.
9. Obtain explicit launch approval, then implement separately validated production environments.

The public production /domains page intentionally remains contact-for-quote only.