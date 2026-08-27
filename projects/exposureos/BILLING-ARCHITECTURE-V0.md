# ExposureOS Billing Architecture V0

Status: design-only. The authenticated Stripe account is live-mode capable, but **no live Stripe Product, Price, Checkout, Subscription, Invoice, or payment mutation has been performed**. Live billing activation remains Human Authority-gated.

## Commercial model
- Core: $299 per location per month.
- Growth: $599 per location per month.
- Agency: from $1,499 per month, quote based.

## Recommended Stripe shape
ExposureOS initially charges its own SaaS customers for software; it does not need Stripe Connect to route customer payments to service businesses.

Use:
- Stripe Billing for recurring subscriptions.
- Stripe-hosted Checkout for Core/Growth self-serve activation after billing approval.
- Stripe Customer Portal for payment-method updates, invoices, cancellation, and plan management where compatible with product rules.
- Stripe Quotes / invoicing for Agency and negotiated multi-location deals while self-serve plans remain available in parallel.
- Subscription item quantity represents licensed location count where a plan is priced per location.
- Stripe Smart Retries / standard revenue-recovery configuration for failed subscription payments after live activation.

## Internal billing state
ExposureOS must not infer entitlement from a redirect URL.

Canonical local state:
1. `ACTIVATION_REQUESTED`
2. `CHECKOUT_CREATED`
3. `PAYMENT_PENDING`
4. `ACTIVE`
5. `PAST_DUE`
6. `CANCEL_AT_PERIOD_END`
7. `CANCELED`
8. `REFUNDED_OR_CREDITED` where applicable

State changes that assert payment/entitlement require authoritative Stripe event or verified API reconciliation.

## Webhook-driven reconciliation
At minimum, the production integration should process relevant subscription/invoice lifecycle events and make handlers idempotent. `invoice.paid` or the authoritative subscription/payment event is the basis for paid entitlement; checkout completion alone is not treated as settled revenue. Failed-payment, cancellation, refund/credit, and subscription-change events update the local billing projection while retaining immutable receipts of prior states.

## Product identifiers
Do not hard-code Stripe object IDs in client code. Persist approved server-side product/price mappings by environment and plan version. Price changes create a new version instead of silently changing historical commercial receipts.

## Environment / activation sequence
1. Build the application against a disabled billing adapter and non-charging `Request activation` flow.
2. Implement Stripe integration in a non-live/safe verification environment when available, including webhook signature validation and replay/idempotency tests.
3. Human Authority approves exact live prices, terms/refund posture, tax posture, and activation window.
4. Create live Product/Price records and verified Checkout/Portal configuration.
5. Perform an approved end-to-end live payment-path verification.
6. Record Stripe object references and verification receipt in Canon without storing secrets.
7. Only then change ExposureOS from `Request activation` to live checkout for the authorized cohort.

## Security
- Stripe secret credentials are server-only.
- Webhook signatures are verified before state mutation.
- Webhook event IDs and mutation idempotency keys prevent duplicate effects.
- Tenant-to-Stripe-customer/subscription mappings are organization-scoped.
- Raw card data is never stored by ExposureOS.
- Payment status, customer-visible plan, and entitlement are reconciled from Stripe rather than trusted from client claims.

## Tax / legal posture
Taxability and registrations are not inferred. Before launch, determine applicable SaaS sales-tax obligations and use Stripe Tax or another approved path where required. Terms, refunds, cancellations, and contract language require their respective review/approval gate.

## Current blocker
Live billing remains intentionally blocked. The present product must display pricing for validation and accept a non-charging activation request only.
