# Sandbox verification and release gate
A deployment marked READY does not establish that ResellerClub or PayPal API calls authenticate successfully.

Current test route: GET /api/domain-availability?domain=example-unique-name.com
Expected valid response is either available:true or available:false. Both errors and unrecognized bodies must fail closed. Only use sandbox credentials with sandbox endpoints. No customer payments or registrar writes occur.

The PayPal OAuth helper (lib/paypal.js) safely obtains a sandbox access token server-side but is not exposed as an unauthenticated HTTP endpoint. Do not return OAuth tokens to the browser. The domain checkout endpoint is deliberately disabled.

Next engineering requirements:
1. Test ResellerClub GET availability using an authenticated, protected deployment; inspect only HTTP status and non-sensitive fields.
2. Implement verified Firebase ID-token authentication and secure Firestore ownership checks.
3. Add server-generated quotes based on verified registrar price and expiration; prohibit client-supplied payment totals.
4. Create PayPal Orders v2 for an immutable stored quote, capture only after approval and verify using PayPal. Enforce idempotency and signature-validated webhooks.
5. Create ResellerClub customer and contacts with approved registrant details. Register after verified payment, poll order state, reconcile failures, refunds, and renewals.
6. Test every failure path in sandbox before any production activation.
References: https://developer.resellerclub.com/documentation/quickstart and https://developer.paypal.com/api/rest/integration/orders-api
