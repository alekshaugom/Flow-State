---
slice: 23-payments-marketplace
status: deferred
value: 8
confidence: 4
effort: XL
depends_on: [20-identity-roles-capabilities, 22-bounty-system, 24-trust-reputation-governance]
unlocks: [26-global-coverage-bounties, 28-sponsor-admin-governance-console]
opened: 2026-06-02
closed: null
---

# Slice 23 — Switch on real money (Stripe + compliance) — A TWO-WAY STREET

## Status: DEFERRED / PARKED (2026-06-03)

Per the user's direction, this slice is **parked** until we choose to turn on real money. The app launches first on the **interim karma economy** (slice `23b-karma-economy`), which reuses the slice-22 ledger backbone unchanged. Stripe is **stubbed/not built** for now. The only near-term risk is architectural readiness, which the karma reframe + the slice-22 ledger already satisfy.

**This is not a solo code slice.** It is a collaborative track with two lanes — code that I build, and compliance/business/legal work that **only the user can do**. We work through it *together* when launching payments. Both lanes are enumerated below so nothing is lost.

## Why deferred (and why that's safe)
- The user controls rollout and will not enable money before trust (slice 24) exists — the money-before-trust risk is handled operationally, not in code.
- The slice-22 ledger is already "real-money grade" (append-only, no-overdraft, escrow conservation, audited). Karma vs dollars is a unit label + the on/off ramps; no rebuild.
- Real money introduces legal/compliance obligations that must precede the integration (see Lane B). The intent's own caution: *don't detail-design Stripe until a lawyer reviews escrow/payout.*

---

## Lane A — Code (what I build, when we activate this)
Mostly as previously designed (full test-mode → live). Summary; expand when reactivated:
- **Schema:** `FunderBillingProfile` (Stripe customer id), `ContributorPayoutProfile` (Connect account id, `chargesEnabled`, `isVerified`), `ProcessedStripeEvent` (webhook idempotency). `LedgerType` already reserves `deposit`/`extraction`.
- **Adapter** `lib/payments/stripe.ts` (isolates the SDK; throws cleanly when unconfigured).
- **Resources:** `PaymentsResource` (deposit→Checkout, onboard→Connect Express, extract→transfer+payout) + `StripeWebhook` (raw-body signature verify, idempotent: `payment_intent.succeeded`→`deposit` entry, `account.updated`→`isVerified`).
- **Money rails:** test mode first (`PAYMENTS_LIVE` flag gates live; key-prefix asserted); fee at extraction only (`PLATFORM_FEE_BPS`, default 1500); refunds (credit always, real-money refund for directly-deposited unspent funds).
- **Frontend:** deposit, Connect onboarding, cash-out in WalletPanel, verified badge.
- **Vite proxy:** add `/PaymentsResource`, `/StripeWebhook` (slice-22 proxy lesson).

### Lane A open design question created by the karma interim
- **Karma ↔ money relationship.** When money switches on, does pre-existing (freely-earned/granted) karma become cash-withdrawable? Almost certainly **no** — that would make granted karma a payout liability. Likely model: karma stays non-cashable; only **deposited** money (and bounties funded *from* deposited money) is extractable; the ledger may need a `cashable` provenance flag or a separate denomination. **Decide before reactivating.**

## Lane B — Compliance / business / legal (the user's tasks)
These gate go-live; none are code. Tracked here as first-class line items:
1. **Lawyer: escrow + payout model review** — is holding funded bounties "escrow"? money-transmitter implications? Required before any real money.
2. **Stripe Connect platform setup** — business entity, platform agreement, Connect application/approval.
3. **Bank account + tax/entity info** for the platform's Stripe account.
4. **KYC/AML jurisdiction review** — requirements vary by geography + payout volume.
5. **1099-K / tax reporting** — US issues 1099-K >$600/yr; platform obligations + contributor communication.
6. **Platform fee rate** — validate 10–20% with real funders; lock the constant.
7. **Escrow duration strategy** — Stripe card auth expires in 7 days; long-lived bounties likely need charge-to-platform-balance holds. Architectural + cash-flow implication.
8. **Terms of service / user money agreement** — funders + contributors.
9. **International contributor support** — Stripe Connect Express ≈45 countries; fallback policy.
10. **Min payout threshold / batching** — reduce per-transfer fees.
11. **Liability / insurance** review for holding user funds.
12. **Final go-live switch** — live keys + `PAYMENTS_LIVE=true` only after 1–11 + slice 24 (trust/sybil resistance) are satisfied.

## Reactivation trigger
Pick this back up when: slice 24 (trust) is live, the app is otherwise launch-ready, and the user has worked Lane B far enough that a lawyer has signed off on the escrow/payout model. At that point, re-expand Lane A into a full build plan (test mode → live) and proceed.

## Slice paperwork
- `plan.md` (this file) — restructured 2026-06-03 to a deferred two-way street (karma-first decision).
- `status.md` — activation + defer notes.
- Interim economy: see `slices/23b-karma-economy/`.
