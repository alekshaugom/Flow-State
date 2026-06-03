---
slice: 22-bounty-system
status: done
value: 9
confidence: 6
effort: XL
depends_on: [20-identity-roles-capabilities, 21-contribution-content-model]
unlocks: [23-payments-marketplace, 24-trust-reputation-governance, 26-global-coverage-bounties, 28-sponsor-admin-governance-console]
opened: 2026-06-02
closed: 2026-06-03
---

# Slice 22 — Bounty system + internal credit economy

## Context (grounded 2026-06-03, after a design conversation that reshaped the slice)

The original intent sketched post→claim→submit→review→settle with 3 tables and "no money." A design conversation with the user collapsed and refined it:

1. **A submission is just a `Contribution` with `bountyId`** (slice 21 reserved that field). Drop `BountySubmission`. **Open competition, no claims** — drop `BountyClaim` and all claim/expiry/squatting machinery. The reviewer **awards** the bounty to the contribution that satisfies it. Lifecycle collapses to **post → (contributions arrive) → award → settle**.
2. **Self-fulfillment is allowed** — a funder may also be the awardee (you fund an aerial-shot bounty nobody takes, then shoot it yourself and collect). The only integrity rule is **reviewer ≠ submitter** (you cannot approve your own work), enforced regardless of role.
3. **Bounties are multi-funder pots** — the reward represents relative work and **the community sets it by funding**. A poster opens a bounty with an initial pledge; anyone can add to the pot; the awardee receives the whole pot.
4. **Money stays in the system** — earnings land in an **internal credit balance** that the user re-spends on new bounties. This slice builds the **internal credit economy in full** (fund/escrow/award/refund/balance/re-fund) using a **ledger**, with **no real money**: credits enter only via **admin grant** here. Real-dollar deposit + extraction (cash-out) + KYC + fee = slice 23 (now just the Stripe on/off ramps).
5. **Per-profile metrics admins can see:** money put in, bounties collected, money extracted (+ itemized lists) and current balance — all derived from the ledger. Plus a system-level "money currently in the system" health view.

This re-cuts the roadmap: **slice 22 = bounty + internal credit economy (credits only); slice 23 = Stripe edges only.** Building the economy in credits first de-risks the real-money slice — the whole loop is testable before a dollar moves.

## Goal

Build the bounty lifecycle and the internal credit economy it runs on, entirely in credits. A member with a credit balance posts/funds a bounty on an entity; the community can add to the pot; members (including the funder) submit contributions toward it; an admin (≠ submitter) awards the satisfying contribution → its data goes live AND the pot moves to the awardee's balance; the awardee re-spends that balance on new bounties. Profiles show each user's put-in / collected / extracted / balance. No Stripe, no KYC, no real dollars, no extraction yet — those are slice 23.

## Architecture — two spines

**The bounty** is the ask. **The ledger** is the money. They meet at fund/award/refund events.

### `LedgerEntry` — append-only economy spine (the money equivalent of `Contribution`)
Every value event is one immutable row. A user's balance is the signed sum of their entries; profile metrics are filters over them; nothing stores a mutable balance as source-of-truth.
```graphql
type LedgerEntry @table @export {
	id: ID @primaryKey                  # compositeId([userId, type, timestamp])
	userId: ID @indexed                 # whose balance this entry moves
	type: String @indexed               # grant | bounty_fund | bounty_refund | bounty_award | platform_fee
	                                    # (deposit | extraction reserved for slice 23)
	amountCents: Int                    # SIGNED: +credit to user, −debit from user
	balanceAfterCents: Int              # running balance snapshot (fast read + integrity check)
	bountyId: ID @indexed               # set for bounty_fund/refund/award
	counterpartyUserId: ID              # e.g. awardee on a fee, funder on a refund (optional)
	note: String
	createdAt: String @indexed
}
```

### `Bounty` — the ask (no claim/submission tables)
```graphql
type Bounty @table @export {
	id: ID @primaryKey                  # compositeId(['bounty', entityId, postedBy, timestamp])
	title: String
	description: String
	acceptanceCriteria: String          # FIRST-CLASS — concrete checklist; lowers subjectivity + review burden
	entityType: String @indexed         # 'access-point' | 'rapid' | 'shuttle-business' | 'outfitter' | 'section'
	entityId: ID @indexed               # the target (nullable for net-new "create" asks)
	corridorId: ID @indexed             # denormalized for section-page surfacing
	status: String @indexed             # open | awarded | settled | cancelled | expired
	escrowCents: Int                    # current pot held = Σ funds − Σ refunds − award (derived, cached here)
	postedBy: ID @indexed
	postedAt: String @indexed
	expiresAt: String
	awardedTo: ID                       # awardee userId (may equal a funder — self-fulfillment ok)
	awardedContributionId: ID           # the Contribution that satisfied it
	awardedAt: String
	settledAt: String
	cancelledAt: String
}
```
The pot is funded by `bounty_fund` ledger entries (multi-funder). `escrowCents` is the cached pot; the ledger is the truth.

## Money mechanics (all in credits; no real currency)
- **Grant** (admin only): `grant` entry, +X to a user. The only way credits enter in this slice (also the platform-seeding tool).
- **Post a bounty:** requires an initial fund. `bounty_fund` entry −X from poster (no-overdraft: balance ≥ X), bounty `escrowCents` += X, status `open`.
- **Add to a bounty** (community sets value): anyone funds more → another `bounty_fund`, escrow grows.
- **Submit toward:** a contributor authors a `Contribution` (slice 21 form) with `bountyId` set — candidacy, no money move.
- **Award** (admin, ≠ submitter): pick the satisfying contribution → verify it live (reuse slice-21 verify path) + `bounty_award` entry **+escrow** to the awardee's balance, bounty → `settled`, `awardedTo`/`awardedContributionId` set, `escrowCents` → 0. (Platform fee = 0 here; fee is taken at **extraction** in slice 23 — keeps internal circulation free, per "money stays in system.")
- **Cancel / expire:** `bounty_refund` entries return each funder's net contribution; escrow → 0; status `cancelled`/`expired`.
- **Re-fund:** the awardee funds new bounties straight from balance — just another `bounty_fund`. Money circulates without leaving.

Invariants enforced in pure logic: **no overdraft** (fund needs balance ≥ amount); **escrow conservation** (a bounty disburses exactly what was funded — award + refunds = funds); **append-only ledger** (no edits/deletes; corrections are new entries).

## Capability change
`lib/auth/capabilities-pure.ts`: `canFund: approved` (was `false` stub; membership, transitional — slice 23 re-gates on a real funding source). `canReceivePayout` stays a false stub (that's extraction = slice 23). Update `test/auth-capabilities-pure.test.ts`.

## Pure logic + tests
### `lib/ledger/ledger-pure.ts` (no Harper imports)
- `type LedgerType = 'grant'|'bounty_fund'|'bounty_refund'|'bounty_award'|'platform_fee'` (deposit/extraction reserved)
- `computeBalance(entries): number` — signed sum.
- `applyEntry(currentBalance, type, amountCents): { ok; balanceAfter } | { ok:false; error }` — enforces sign rules + **no-overdraft** for debits.
- `bountyEscrow(fundEntries): number` — Σ funds − Σ refunds − awards for a bounty.
- `summarizeForProfile(entries): { putInCents, collectedCents, extractedCents, fundedCents, balanceCents }` — the metric aggregation (putIn = grant+deposit; collected = bounty_award; extracted = extraction; funded = |bounty_fund|).
- `validateGrant` / `validateFundAmount` (positive int, sane max).

### `lib/bounties/bounty-pure.ts` (no Harper imports)
- `type BountyStatus = 'open'|'awarded'|'settled'|'cancelled'|'expired'`
- `validateBountyInput(input)` — title + **acceptanceCriteria** + entityType required, initial fund > 0.
- `canTransitionBounty(from, to)` — open→awarded/settled/cancelled/expired; awarded→settled; settled/cancelled/expired terminal. (award + settle may be one step.)
- `canAward({ reviewerId, submitterId })` — **false if reviewerId === submitterId** (reviewer ≠ submitter).
- `isExpired(expiresAt, now)`.

### Tests
`test/ledger-pure.test.ts` — balance sum; no-overdraft rejection; escrow conservation across fund→award and fund→refund; profile summary aggregation by type; sign rules. `test/bounty-pure.test.ts` — transition matrix; validation (missing criteria/title/fund → 400); reviewer≠submitter guard; expiry.

## Resources
### `resources/Bounty.ts` (action-dispatched; mirrors Contribution.ts conventions, dev-bypass capability helpers)
- `get(target?)` — public read (URLSearchParams idiom). `/Bounty/:id` → detail (incl. funders + escrow + candidate contributions); `?entityType=&entityId=` or `?corridorId=` → list.
- `post(data)` action dispatch: `post-bounty` (isFunder + balance≥fund → create bounty open + `bounty_fund` ledger entry), `add-funding` (isFunder + balance≥amount → `bounty_fund`), `cancel` (poster/admin → refund entries + status cancelled). All money moves go through a shared `writeLedgerEntry(userId, type, amount, …)` helper that computes `balanceAfterCents` and enforces no-overdraft.
- `patch(data)` action dispatch: `award` (isAdminUser, **and canAward(reviewer≠submitter)** → verify the chosen Contribution via the slice-21 path + `bounty_award` to awardee + bounty settled). Guarded by `canTransitionBounty`.
- `emitBountySettlement(bounty)` stub retained as the slice-23 seam comment (real $ release happens only at extraction in 23; internal award is final here).

### `resources/Ledger.ts`
- `get(target?)` — own balance + history; admin can read any user's (`?userId=`); `?system=1` → system totals (Σ in − Σ extracted = money in system). Capability-gated (own vs admin).
- `post(data)` — `grant` action (isAdminUser only): credit a user. The credit on-ramp for this slice.

## Frontend
- `app/src/components/BountyStatusBadge.tsx` — open/awarded/settled/cancelled/expired pill.
- `app/src/components/BountyCard.tsx` — title, acceptanceCriteria, pot (escrowCents) + funder count, status; capability-gated actions: **Post**/**Add to pot** (members w/ balance), **Submit** (members → opens slice-21 `EditContributionForm` with `bountyId`), **Award** (admins, hidden on own submissions), **Cancel** (poster).
- `app/src/components/WalletPanel.tsx` — balance + the three named metrics (put in, collected, extracted) with expandable lists; reused on the profile (own) and admin user view (any user).
- `app/src/api.ts` — `listBounties`, `getBounty`, `postBounty`, `addBountyFunding`, `awardBounty`, `cancelBounty`, `getWallet(userId?)`, `grantCredits` (admin), `getSystemLedger`.
- Inline surfacing: a **Bounties** block in `SectionDetailBody.tsx` `CommunitySection` (post/add/submit/award), preserving existing entity blocks. **No global feed route** (slice 25/26).
- Profile: `WalletPanel` on `/profile`; admin: `WalletPanel` for a selected user in `AdminUsersPanel` (slice 20).
- `resources/RiverDetail.ts` — surface section bounties (like rapids) so the section page has data.

## Acceptance criteria
1. `Bounty` + `LedgerEntry` schemas load with no Harper reload errors.
2. `canFund === membership`; only `canReceivePayout` remains a false stub; tests updated + green.
3. `ledger-pure.ts` + `bounty-pure.ts` pure + fully unit-tested: balance sum, **no-overdraft**, **escrow conservation**, profile aggregation, transition matrix, **reviewer≠submitter**, validation.
4. Admin `grant` credits a user (ledger entry, balance updates). Non-admin grant → 403.
5. Post-bounty debits the poster (no-overdraft enforced: under-balance → 400), escrows the pot, status open; add-funding grows the pot (multi-funder); non-member → 403.
6. A member (incl. the funder — **self-fulfillment**) submits a Contribution with `bountyId`; admin **awards** it → contribution verified live + pot credited to awardee balance + bounty settled. Award by the submitter themselves → 403 (reviewer≠submitter). Non-admin award → 403.
7. Cancel/expire refunds funders (escrow conserved to zero).
8. Awardee re-funds a new bounty from earned balance (money stays in system).
9. Profile/admin `WalletPanel` shows correct put-in / collected / extracted(=0) / balance + lists; system view shows money-in-system. Section page shows a Bounties block with capability-gated actions; **no new route**.
10. No real money: no Stripe/KYC/deposit/extraction code; `extractedCents` is 0; fee deferred to 23.
11. `npm test` all green; `npm run ui:build` clean. Regression: slice-21 contribution flows + corridor rendering unaffected.

## Verification steps
1. `npm test` + `npm run ui:build`.
2. Harper (`~/hdb`, 9926) + Vite (5173); clean reload for both new tables.
3. Curl economy loop: admin grants user A credits → A posts a bounty (escrow) → B adds funding → A submits a contribution (self-fulfill) → admin awards A → A's balance = pot, bounty settled, contribution live → A funds a new bounty from balance. Assert no-overdraft (over-fund → 400), reviewer≠submitter (A-awards-A → 403), non-admin grant/award → 403, cancel→refund conserves escrow.
4. Browser (dev bypass): section Community → post a bounty, add to pot, submit, award; profile WalletPanel shows metrics; admin sees a user's wallet. Screenshot.
5. Regression: a slice-21 edit still verifies; corridor map/tiles render.

## Build phases (internal; auto within Execute)
- **A — economy backend (credits):** `ledger.graphql` + `bounty.graphql`, `ledger-pure` + `bounty-pure` + tests, `canFund`, `resources/Ledger.ts` (grant + reads), `resources/Bounty.ts` (post/fund/award/cancel via ledger), RiverDetail surfacing. Verify via curl (the full loop + invariants).
- **B — frontend:** BountyStatusBadge, BountyCard, WalletPanel, api.ts, inline Bounties block, profile + admin wallet. Verify in browser.
- **C — E2E + regression + screenshot.**

## Roadmap note (bookkeeping to apply on approval)
- **Slice 23** narrows to the **Stripe on/off ramps**: deposit (real $ → credits), **extraction** (credits → real $, with KYC + the **platform fee taken here**), refunds-to-real-money, "verified human" badge from KYC. The internal economy already exists from slice 22.
- **Ordering:** real **extraction (23) should not turn on at volume before slice 24** (trust/reputation/community verification) removes the single-admin-reviewer dependency and adds sybil resistance. The credits-only slice 22 is safe to ship in either order. Update ROADMAP to reflect the 22/23 re-scope + this ordering caution.

## Open questions (resolved here)
- **Self-fulfillment allowed; reviewer≠submitter is the only integrity rule.** **Multi-funder pots = community-set value.** **Credits in via admin grant only this slice.** **Fee at extraction (slice 23), none on internal circulation.** **No global feed (25/26).** **Award verifies the linked contribution (21↔22).** **Lazy expiry** (cron sweep deferred).

## Slice paperwork
- `plan.md` (this file) — rewritten 2026-06-03 to the credit-economy design.
- `status.md` — exists (activation entry); update per build phase.
- `decisions.md` — create if a design call reverses during build.
