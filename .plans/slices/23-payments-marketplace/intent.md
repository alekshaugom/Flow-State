---
slice: 23-payments-marketplace
status: deferred
value: 8
confidence: 4
effort: XL
depends_on: [20-identity-roles-capabilities, 22-bounty-system]
unlocks: [26-global-coverage-bounties, 28-sponsor-admin-governance-console]
opened: 2026-06-02
closed: null
---

# Slice 23 — Stripe on/off ramps (intent)

## Context

Slice 22 builds the complete internal credit economy: the `LedgerEntry` spine, bounty funding/escrow/award/refund mechanics, per-profile balance and metrics, and all the invariants (no-overdraft, escrow conservation, reviewer≠submitter). Credits enter that system only via admin grant in slice 22.

This slice is **not the economy** — it is the two edges that connect the economy to real dollars: the **deposit** ramp (real money in → credits) and the **extraction** ramp (credits out → real money). Everything in between — the ledger, balances, bounty funding, award, profile metrics — already exists from slice 22 and must not be rebuilt here.

## What success looks like

A funder deposits $50 via Stripe Checkout. The platform converts that deposit to 50 credits and writes a `deposit` LedgerEntry to their account. They can now fund bounties using those credits via the existing economy.

When a contributor wants to cash out, they initiate an extraction. The platform debits their credit balance via an `extraction` LedgerEntry, deducts a platform fee, and triggers a Stripe Connect payout to their verified bank account. The contributor sees cleared funds; the funder sees a clean receipt; the platform earns its fee. If a bounty expires unfilled, the held credits are refunded back to real dollars via Stripe.

A contributor who completes Stripe Connect KYC (for payouts) receives a **"verified human" badge** on their public profile — KYC is the identity-verification mechanism for the platform, not just a payout gate.

## What's NOT it

- Not rebuilding the internal credit economy — that is slice 22 (already done).
- Not the ledger, bounty funding/award/refund logic, or balance tracking — all exist from slice 22.
- Not a subscription model — pay-per-completion only.
- Not advertising revenue.
- Not crypto or token incentives — fiat only.
- Not a marketplace for physical goods.
- Not payroll or contractor management.
- Not the trust/reputation/voting system — that is slice 24.

## Scope

### Deposit ramp (real $ → credits)

- Funder initiates a deposit (amount in dollars).
- Platform creates a Stripe Checkout session; funder completes card payment.
- On `payment_intent.succeeded` webhook: write a `deposit` LedgerEntry (the type already reserved in `LedgerType` in slice 22), credit the user's balance. The exchange rate is 1 USD = 1 credit (simplest; revisit if needed).
- Funder sees deposit in their ledger/profile view.

### Extraction ramp (credits → real $)

- Contributor initiates a cash-out request for N credits.
- Platform verifies: contributor is KYC-verified (Stripe Connect account in `charges_enabled` state), balance ≥ N.
- Write an `extraction` LedgerEntry (also reserved in slice 22) debiting the balance.
- Deduct platform fee here (e.g. 15% — exact rate is a business decision, set as a constant, not hardcoded everywhere). Internal circulation (fund → award) remains free; fee is taken **only at extraction**.
- Trigger Stripe Connect transfer + payout to contributor's bank for the net amount.
- Contributor sees payout status; balance reflects the debit immediately.

### Refunds to real money

- If a bounty's held credits were originally funded by a real deposit (traceable via ledger), expiry/cancellation refunds flow back to the funder's payment method via Stripe refund, not just a credit restoration.
- Refund logic must handle partial multi-funder pots (each funder gets back their pro-rata contribution).
- Write a `bounty_refund` LedgerEntry and trigger Stripe refund in the same transaction-safe unit.

### KYC = verified-human badge

- Contributor onboards to Stripe Connect Express (Stripe handles identity verification).
- Once `charges_enabled: true` on the Connect account, the user's profile gains `isVerified: true`.
- A "verified" badge surfaces on the contributor's public profile. This is the platform's human-verification signal, used downstream by slice 24 for sybil resistance and trust weighting.
- KYC is required for extraction but not for submitting contributions or earning credits internally.

### Reserved LedgerEntry types

Slice 22 already defined `deposit` and `extraction` as reserved types in `LedgerType` and left a `emitBountySettlement()` stub as the slice-23 seam. This slice implements those types — do not change the type strings, do not touch the existing types (`grant`, `bounty_fund`, `bounty_refund`, `bounty_award`, `platform_fee`).

## Why this is still intent-only

Confidence is 4/10 because:

1. **Stripe Connect onboarding** requires legal entity setup, bank account verification, and compliance decisions that are not purely technical.
2. **KYC / AML requirements** for payouts vary by jurisdiction and payout volume; need legal review before implementation.
3. **Escrow duration limits**: Stripe card authorizations expire after 7 days. For longer-lived bounties, a different hold strategy (charge upfront to platform balance) may be needed — significant architectural implication.
4. **Platform fee rate** is a business decision; validate with real funders before hardcoding.

Do not design the payment schema or Stripe integration in detail until slice 22 is complete and settled and a lawyer has reviewed the escrow + payout model.

## Loose sketch (do not lock in)

### External dependency

Stripe Connect (Express accounts preferred — Stripe handles KYC UX) for contributor payouts; Stripe Checkout / Payment Intents for funder deposits.

### Schema additions (building on slice 22's LedgerEntry)

- `FunderBillingProfile` — Stripe Customer ID per funder, linked to identity from slice 20.
- `ContributorPayoutProfile` — Stripe Connect Account ID, onboarding status, KYC/`charges_enabled` status, `isVerified` flag (surfaces the badge).
- No new ledger table — `deposit` and `extraction` entries write to the existing `LedgerEntry` table from slice 22.

### Routes

- `POST /payments/deposit` — create Stripe Checkout session; return URL.
- `POST /payments/stripe-webhook` — receive Stripe webhook events; write LedgerEntries, update balances, trigger payouts.
- `POST /payments/contributor-onboard` — initiate Stripe Connect Express onboarding; return URL.
- `POST /payments/extract` — contributor requests cash-out; validates KYC + balance, writes extraction entry, triggers payout.
- `GET /payments/funder-ledger` — deposit + refund history for authenticated funder.
- `GET /payments/contributor-earnings` — earnings + payout + extraction history for authenticated contributor.

### Frontend

- Deposit flow page (Checkout redirect).
- Contributor onboarding page (Connect Express redirect or embed).
- Earnings/payout dashboard (extends profile metrics already built in slice 22).
- Verified-human badge component on profile pages.

## Open questions for when this becomes active

- **Platform fee rate.** 10–20%? Validate with real users; store as a named constant.
- **Escrow duration.** Card auth expires in 7 days. For longer bounties, charge upfront to platform balance and hold there?
- **Refund policy detail.** Auto-refund on expiry; on rejection, refund or allow re-claim? Business decision.
- **International contributors.** Stripe Connect Express is ~45 countries. Fallback for others?
- **Minimum payout threshold.** Batch payouts when balance > $10 to reduce per-transfer fees?
- **1099-K reporting.** Stripe issues 1099-Ks above $600/year (US). Need legal review of platform obligations.

## Ordering note

Real-money extraction **should not be enabled at volume** before slice 24 (trust/reputation/community verification) lands. The deposit ramp can ship earlier; the extraction ramp depends on sybil resistance from slice 24 to avoid gaming the credit-grant → cash-out path. See ROADMAP ordering caution.

## References

- `.plans/slices/22-bounty-system/plan.md` — the credit economy this slice attaches to; `LedgerType`, `emitBountySettlement()` seam, reserved `deposit`/`extraction` types.
- `.plans/vision/contribution-economy.md` — strategic rationale; fee structure must align with platform sustainability argument.
- Stripe Connect docs: https://stripe.com/docs/connect
- Stripe PaymentIntents with manual capture: https://stripe.com/docs/payments/capture-later
