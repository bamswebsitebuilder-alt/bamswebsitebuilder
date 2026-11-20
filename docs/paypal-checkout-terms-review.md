# BAM's Website Builder — PayPal checkout legal review draft
**Draft for counsel and business owner review. Not yet part of the published customer agreement.** November 20, 2026.

## Existing rules to preserve
- Current service terms: two included revision rounds for Starter/Business and three for Premium. Errors by BAM do not consume a revision.
- Standard 50% initial payment is credited to the project; the other 50% is due after preview approval **before launch**.
- Deposits are **not automatically nonrefundable**. On cancellation, calculate approved completed milestones and authorized nonrecoverable costs under the existing cancellation policy; refund excess payments.
- 12-month installment option is separate from the 50/50 option, and project installments are separate from hosting/maintenance.
- Existing policy pauses a silent project after 14 days plus a 7-day written reminder; no automatic balance acceleration or closure.
- Existing missed-payment provision gives written notice and 7 calendar days to resolve before pausing further work or separately provided services; do not automatically take a client-owned domain offline.
- Current optional maintenance: $50/month for up to 60 minutes of minor edits, initial response within 2 business days; hosting is separate.
- Published hosting figures currently differ ($25+ in one area, $39/month elsewhere). Confirm the product and rate before a recurring hosting checkout is activated.

## Proposed checkout terms to review
1. **Quote before charge.** Checkout is offered only after the customer accepts a dated written quote identifying selected package, exact price, deliverables, extras, taxes, start timing and payment choice.
2. **One arrangement per project.** Buyer selects pay-in-full, 50/50 milestone payments, or 12-installment financing by BAM. The latter has no separate 50% deposit.
3. **Finite subscriptions.** Starter $20.83 × 12 ($249.96), Business $41.67 × 12 ($500.04), Premium $70.83 × 12 ($849.96), unless expressly revised in accepted quote. In PayPal, configure 12 MONTHLY REGULAR billing cycles with total_cycles=12. Do not use infinite billing.
4. **Authorization and informed consent.** Immediately before payment, show amount, billing frequency and end condition, service and cancellation terms, and an unchecked acceptance box. Preserve accepted quote/terms version and timestamp. Do not store card credentials.
5. **Verification and kickoff.** Payment confirmation requires a verified PayPal transaction/subscription through seller records or server-side verification. A successful redirect, screenshot, or user-entered subscription ID is not proof. Booking follows successful verified payment; avoid claiming the order is paid merely because the return page loads.
6. **Refunds.** Refer to the published milestone-based cancellation/refund policy; don't replace it with a blanket non-refundable deposit clause without an approved legal revision.
7. **Hosting and maintenance.** Separate recurring consent and agreement; disclose frequency, included scope, renewal/cancellation and costs. Do not silently add hosting at checkout.
8. **Disputes and buyer rights.** Terms must not waive chargeback rights or legal consumer protections. Review state-law and PayPal requirements with counsel.
9. **Inactive projects and late payments.** Preserve present written-notice process until counsel approves any change. No automatic balance acceleration or site takedown.
10. **Deployment gate.** Activate only when exact PayPal merchant links/plan IDs are validated, sandbox and live test cases pass, and versioned terms and privacy handling are approved.

## Merchant account setup (requires account owner)
- Create three fixed-price full-payment links: $250, $500, $850.
- Create three deposit links: $125, $250, $425, applied against the respective written project quotes. Collect each remaining balance by separate invoice before launch.
- Create three **finite** subscription plans with 12 cycles at the displayed monthly amounts. Confirm that PayPal account tooling supports finite plans and not endless subscriptions.
- Separately configure hosting only after price and service scope are reconciled.
- Configure a booking return URL only if verification is performed; never treat return URL as payment confirmation.
- Test cancellation, declined payments, double clicking, incorrect package, and agreement records before enabling buyer-facing checkout.
- Keep existing bamswebsitebuilder@gmail.com unchanged.
