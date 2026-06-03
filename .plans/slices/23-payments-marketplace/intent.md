---
slice: 23-payments-marketplace
status: queued
value: 8
confidence: 4
effort: XL
depends_on: [20-identity-roles-capabilities, 22-bounty-system]
unlocks: [26-global-coverage-bounties, 28-sponsor-admin-governance-console]
opened: 2026-06-02
closed: null
---

# Slice 23 — Payments marketplace (intent)

## What success looks like

A sponsor funds a $50 bounty by entering a card number. The money is held in escrow. When the bounty submission is accepted, the contributor receives a payout to their bank account — minus a small platform fee. The funder sees a receipt; the contributor sees a cleared payment in their dashboard. If the bounty expires unfilled, the funder is automatically refunded.

Real money flows in both directions. The platform earns a small percentage on each successful settlement. The ledger is auditable, the compliance story is handled, and the contributor never has to chase anyone for payment.

## What's NOT it

- Not a subscription model — bounties are pay-per-completion, not recurring.
- Not advertising revenue — that is a separate model; this slice is purely bounty-economy money movement.
- Not crypto / token-based incentives — fiat only.
- Not a tipping system for existing free-tier content.
- Not a marketplace for physical goods (shuttle bookings, gear rentals) — that is a different business.
- Not donor-driven philanthropy — funders are paying for specific data, not donating to the platform.
- Not payroll or contractor management — contributors are independent; we issue 1099s where required, but HR is out of scope.

## Why this is intent-only

This is the hardest slice in the product. Confidence is 4/10 because:

1. **Stripe Connect onboarding** (or equivalent) requires legal entity setup, bank account verification, and compliance decisions that are not purely technical.
2. **KYC / AML requirements** for contributors receiving payouts are a regulatory unknown that varies by jurisdiction and payout volume.
3. **Escrow / hold semantics** must integrate with the bounty state machine (slice 22) — which is itself undesigned.
4. **Platform fee structure** is a business decision, not a technical one, and should be validated with real users before being hardcoded.

Do not design the payment schema until slices 20, 22 are locked and a lawyer has reviewed the escrow + payout model.

## Loose sketch (do not lock in)

### External dependency

Stripe Connect (standard or express accounts) is the most likely implementation path. The sketch below assumes Stripe; substitute if a better option surfaces.

- **Funders**: pay via Stripe Checkout / Payment Intents. Funds held as a Stripe PaymentIntent with `capture_method: manual` (authorize-only) until bounty settles.
- **Contributors**: onboarded as Stripe Connect accounts (Express preferred — Stripe handles KYC). Payouts via `transfers` + `payouts` to their bank.
- **Platform**: collects a fee via `application_fee_amount` on each transfer.

### Schema

- `PaymentLedger` — every money event. Fields: `id`, `type: funder_charge | escrow_hold | bounty_settlement | payout | platform_fee | refund`, `bountyId`, `userId`, `amountCents`, `currency`, `stripeEventId`, `status: pending | completed | failed | refunded`, `createdAt`.
- `FunderBillingProfile` — Stripe Customer ID for each funder. Linked to `WaitlistUser` / identity from slice 20.
- `ContributorPayoutProfile` — Stripe Connect Account ID for each contributor. Onboarding status, KYC status.
- `Escrow` — per-bounty hold record. `bountyId`, `stripePaymentIntentId`, `heldAmountCents`, `status: held | released | refunded`, `releasedAt`.

### Routes

- `POST /payments/create-bounty-funding-session` — creates a Stripe Checkout session for a funder to fund a specific bounty; returns a URL.
- `POST /payments/stripe-webhook` — receives Stripe webhook events; updates ledger + escrow + bounty status accordingly.
- `POST /payments/contributor-onboard` — initiates Stripe Connect Express onboarding; returns an onboarding URL.
- `GET /payments/funder-dashboard` — ledger summary for the authenticated funder.
- `GET /payments/contributor-dashboard` — earnings summary + payout status for the authenticated contributor.
- `POST /payments/trigger-payout/:bountyId` — admin-triggered payout after bounty review acceptance; should normally be automatic via webhook flow.

### Resources

- `resources/PaymentLedger.ts` — immutable append-only log of money events.
- `resources/Escrow.ts` — escrow lifecycle tied to Stripe PaymentIntent state.
- `resources/ContributorPayoutProfile.ts` — Connect account management.
- `lib/payments/stripe-client.ts` — thin wrapper over Stripe SDK.
- `lib/payments/webhook-handler.ts` — event routing for Stripe webhooks (payment_intent.succeeded, transfer.created, payout.paid, etc.).

### Frontend

- `app/src/pages/FundBountyPage.tsx` — checkout redirect flow.
- `app/src/pages/ContributorOnboardingPage.tsx` — Connect Express onboarding embed or redirect.
- `app/src/components/EarningsDashboard.tsx` — contributor payout history.
- `app/src/components/FunderLedger.tsx` — funder charge + refund history.

## Open questions for when this becomes active

- **KYC requirements.** At what payout threshold does Stripe require full identity verification? In the US, Stripe issues 1099-Ks above $600/year (threshold may change). Need a legal review of obligations.
- **Platform fee.** 10%? 15%? 20%? This is a business decision — validate with funders before hardcoding.
- **Escrow duration.** How long can a PaymentIntent stay in authorize-only state? Stripe allows 7 days for card authorizations; after that the hold releases. For longer-duration bounties, we may need to charge upfront to a platform Stripe balance and hold there. Significant architectural implication.
- **Refund policy.** If a bounty expires unfilled, auto-refund. If a bounty submission is rejected, refund or allow re-claiming? Business decision.
- **Multi-funder bounties** (deferred from slice 22). If we ever allow crowd-funded bounties, the payment model becomes significantly more complex. Defer.
- **International contributors.** Stripe Connect Express is available in ~45 countries. Contributors outside those countries cannot receive payouts via Stripe. Need a fallback or geo-restriction.
- **Minimum payout threshold.** To minimize per-transfer fees, may want to batch payouts (e.g., pay out when balance > $10). Communicate clearly to contributors.

## References that will matter when active

- `.plans/slices/22-bounty-system/intent.md` — the bounty state machine that emits settlement events this slice must handle.
- `.plans/slices/20-identity-roles-capabilities/` — funder and contributor identity profiles that payment profiles attach to.
- `.plans/vision/contribution-economy.md` — the strategic rationale; the fee structure must align with the platform sustainability argument made there.
- Stripe Connect docs: https://stripe.com/docs/connect
- Stripe PaymentIntents with manual capture: https://stripe.com/docs/payments/capture-later
