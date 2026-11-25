# Website editor and automated hosting

## Firebase and Vercel setup

- Deploy the repository’s Vercel project using Node.js 22 or newer. The static Firebase Hosting configuration does not serve the Vercel API.
- Set `BAM_PORTAL_FIREBASE_SERVICE_ACCOUNT` as a server-only environment variable using a dedicated service account with Firebase Auth user lookup and Firestore read/write permissions. Set `BAM_PORTAL_FIREBASE_PROJECT` if using a separate Firebase project. The API defaults to `bam-client-portal` and checks the credential’s project ID. A staging portal also needs a matching browser Firebase configuration.
- Use a separate Firebase project with verified test users for sandbox acceptance. The editor, public snapshot, webhook ledger and subscription records use server-only Firestore paths. The existing deny-by-default rules already protect those paths from all browser clients, including staff.
- Opening a PR does not authorize a production deployment or live payment setup. The new integration accepts only `sandbox` and uses fixed PayPal Sandbox origins.

## Enable editing for a site

1. In **Admin → Projects → Client website editor**, select a saved client project. Enter starting values for the fields that the website will use and select which fields the client may edit.
2. Integrate the client’s assigned published-content ID in its template. Use the ID returned by the admin editor. Add attributes only to content leaves. Wrapping links, headings with nested markup and responsive image sources should keep their layout outside the annotated leaf.
3. The client can save drafts, preview the content in three viewport layouts and submit a version under **Portal → My Project**. An admin reviews, approves and publishes that version. Restoring a historical version creates a new submission and requires approval and publication again.
4. Verify the site on its own domain following the first publication. The site keeps its template’s fallback copy until a snapshot is published or when its content request is unavailable. Preview uses a shared sample layout. Each existing site needs its own template binding and any required CSP updates before changes can appear on its domain.

Use the stable portal deployment origin for the adapter, replacing the values below with a canonical host and the assigned ID.

```html
<h1 data-bam-field="headline">Existing homepage headline</h1>
<p data-bam-field="description">Existing description</p>
<img data-bam-field="imageUrl" src="/images/hero.webp" alt="About our business">
<script type="module"
  src="https://portal.example/js/published-site.js"
  data-bam-published-site="ASSIGNED-PUBLISHED-CONTENT-ID"></script>
```

The Vercel configuration allows external client sites to load the adapter modules. Add the portal origin to that site's applicable `script-src` and `connect-src` policies and approve the image hosts under `img-src`. The published JSON intentionally contains public fields only. Keep passwords and private business data out of the editor.

## Configure and verify sandbox billing

Use sandbox-only values in the staging deployment. The new environment variables are separate from the existing domain and checkout configuration.

| Variable | Value |
| --- | --- |
| `PAYPAL_HOSTING_ENV` | `sandbox` |
| `PAYPAL_HOSTING_CLIENT_ID` and `PAYPAL_HOSTING_CLIENT_SECRET` | Sandbox REST app credentials for the merchant account |
| `PAYPAL_HOSTING_WEBHOOK_ID` | The ID PayPal issues for this app's sandbox webhook |
| `PAYPAL_HOSTING_PLAN_IDS` | Comma-separated allowlist of sandbox recurring plan IDs |
| `PAYPAL_HOSTING_RETURN_ORIGIN` | Exact HTTPS origin of the sandbox portal |

1. Register a publicly reachable webhook at `/api/portal-services?webhook=paypal-hosting` on the staging deployment. Use the sandbox app that owns the plans. Subscribe to the `BILLING.SUBSCRIPTION` created, activated, updated, suspended, cancelled, expired and payment-failed events and `PAYMENT.SALE.COMPLETED`. Test delivery with real sandbox account activity. PayPal’s webhook simulator does not support the signature postback used here.
2. Create a Sandbox USD plan matching the quote’s amount and monthly or annual cadence. Use one recurring cycle with no taxes, setup fee or trial. Put the exact line `Managed hosting: USD 39.00 / month via PayPal` in the quote’s ongoing costs, replacing the price and using `year` for annual billing. Have the assigned verified test client accept that quote.
3. In **Admin → Hosting**, set the test client’s payment arrangement to automated PayPal Sandbox, select **Awaiting authorization**, and save the sandbox plan ID and accepted quote number.
4. As that test client, start checkout, use a Sandbox personal buyer account and return to the portal. Check that reload and repeat clicks retain the same subscription. Verify activation, upcoming renewal and cancellation against PayPal Sandbox. Resend a delivered webhook and check that it is recorded once. Compare the client status and the admin active, monthly recurring revenue, renewal and attention totals.
5. If an interrupted checkout never persists its PayPal ID, the same request ID may be retried for up to 24 hours. If it still cannot be reconciled, check the sandbox merchant account and correlate its subscription custom ID before any reset. A different plan or a second subscription for the same account requires staff reconciliation.

Billing status and payment-attention indicators appear in the portal. Clients manage the subscription in PayPal. BAM’s recorded service availability, domains, invoices and existing manually managed account arrangements are separate from the automated sandbox subscription. No hosting account provisioning or suspension is driven by a payment event.

Run local handler checks with `node --test tests/portal-services.test.js`. These use Firebase test doubles and a simulated PayPal Sandbox API, including the signed-webhook postback. Verify real Auth, Firestore transactions and signed webhook delivery in staging before release.

[PayPal Subscription API](https://developer.paypal.com/api/subscriptions/v1/) · [PayPal webhook verification](https://developer.paypal.com/api/rest/webhooks/rest/)
