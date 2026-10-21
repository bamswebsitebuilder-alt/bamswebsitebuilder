# Balanced domain pricing — release validation

The Domains page lists PROPOSED customer-facing prices for four selected extensions; .io and .dev are omitted because they were not located in the user's reseller panel. They are not an offer, confirmed quote, or checkout amount.

| TLD | Proposed registration USD | Proposed annual renewal USD |
| --- | ---: | ---: |
| .com | 19.99 | 21.99 |
| .net | 22.99 | 24.99 |
| .org | 24.99 | 22.99 |
| .co | 49.99 | 54.99 |

Before enabling sales:
1. In the authorized ResellerClub account, find the wholesale cost *for your reseller tier* of both one-year new registration and one-year renewal for each TLD.
2. If using the legacy HTTP API, documented reseller cost pricing endpoint: GET `https://test.httpapi.com/api/products/reseller-cost-price.json` (sandbox) with auth-userid and api-key. Products have `addnewdomain` and `renewdomain` tenure 1 entries. Legacy API access may differ from the newer v2 credentials. Do not assume account compatibility.
3. Include all registrar/registry surcharges, payment processing fees, taxes where applicable, and the desired profit margin.
4. If any projected net profit is negative or falls below the owner's minimum margin, raise or temporarily hide that TLD price.
5. Separately verify renewal price before any customer payment. Premium-priced domains require per-domain price lookup and explicit customer approval.
6. Show renewal terms, auto-renewal policy, estimated taxes, and domain ownership/registrant consent before checkout.
7. Always calculate payment totals server-side using a time-limited, validated quote. Never trust the browser's price table.
8. Run both PayPal and ResellerClub sandbox purchase tests, including failures and retries; only then approve production activation.

Sources:
- https://www.resellerclub.com/help/article/Get-Reseller-Cost-Pricing-Details-Using-the-API
- https://www.resellerclub.com/pricing
- https://developer.resellerclub.com/

The domain checkout endpoint remains disabled and production registration must stay disabled until these gates are met.
