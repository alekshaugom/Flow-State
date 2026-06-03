---
slice: 23b-karma-economy
status: done
value: 7
confidence: 9
effort: S
depends_on: [22-bounty-system]
unlocks: [24-trust-reputation-governance]
opened: 2026-06-03
closed: 2026-06-03
---

# Slice 23b — Interim karma economy (relabel, no real money)

## Goal
Relabel the slice-22 internal credit economy as **karma** so the app is launch-ready WITHOUT real money. The ledger backbone (LedgerEntry, writeLedgerEntry, no-overdraft, escrow conservation, bounty fund/award/refund) is UNCHANGED and stays real-money-grade — this is a display/labeling slice only. Real money (dollars, Stripe, cash-out) is deferred to slice 23.

## Decisions
- Unit = **karma**, shown as whole points (no decimals, no `$`), with a small glyph (e.g. ✦). The stored integer ledger amount is treated directly as karma points (no /100).
- No deposit (buy karma) and no extraction (cash out) — those are money concepts deferred to slice 23. Karma enters via admin grant + earning bounties (already built).
- Backend/ledger code untouched; reframe is frontend + copy only.

## Scope (frontend display only)
- A `formatKarma()` helper replacing `formatDollars()`; whole points + glyph/"karma".
- `WalletPanel`: "Credit Balance $X" → karma balance; reword "not redeemable for cash"; relabel metric tiles for karma (Received / Earned / Spent); the money-only "Extracted/Cash-out" tile shown muted as "with payments (coming)".
- `BountyCard`: pot + reward in karma.
- `PostBountyForm`: "fund amount ($)" → "karma to stake"; input is whole karma (no ×100 conversion).
- `AdminUsersPanel`: "Grant credits" → "Grant karma" (whole points).
- Any other economy `$`/credit copy.

## Acceptance criteria
1. No `$` or dollar formatting on economy surfaces; karma shown as whole points + glyph.
2. Posting/funding/granting use whole-karma amounts (no ×100); backend unchanged + still works.
3. Ledger/resources/pure-logic code untouched (display + copy only).
4. `npm test` green; `npm run ui:build` clean; bounty + wallet flows still work in browser.

## Verification
- Browser: profile WalletPanel shows karma balance + tiles; section Bounties block shows karma pots; post a bounty in karma; admin grant karma. Screenshot.

## Slice paperwork
- `plan.md` (this file) — 2026-06-03.
- `status.md` — created at activation.
