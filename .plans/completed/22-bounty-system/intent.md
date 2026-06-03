---
slice: 22-bounty-system
status: active
value: 9
confidence: 5
effort: L
depends_on: [20-identity-roles-capabilities, 21-contribution-content-model]
unlocks: [23-payments-marketplace, 24-trust-reputation-governance, 26-global-coverage-bounties, 28-sponsor-admin-governance-console]
opened: 2026-06-02
closed: null
---

# Slice 22 — Bounty system (intent)

## What success looks like

A rafting club wants detailed access-point information for the Upper Dolores. They post a bounty: "Detailed carry-in and take-out access point records for the Upper Dolores, with current road conditions." They set a reward. Contributors see the open bounty on the Dolores section page and in a browsable bounty feed, scope their intended contribution, submit it, and — once reviewed and accepted — receive the reward. The funder sees the bounty close with the contributor credited.

The lifecycle is clean and auditable: **post → scope → fund → claim → submit → review → settle**. Every step is visible to the relevant parties and leaves a traceable record. No money changes hands in this slice — that is slice 23.

## What's NOT it

- Not money movement, escrow, or payouts — those belong entirely in slice 23.
- Not trust scoring or community voting on submitted contributions — that is slice 24.
- Not a global browsing surface or discovery feed for bounties — that surfaces in slice 25 and 26.
- Not automated matching of contributors to bounties.
- Not a bidding system — first valid completion earns the reward, not the highest bidder.
- Not RFP-style bounties requiring proposals before work begins — KISS for v1.
- Not milestone-based bounties (pay incrementally as sub-tasks complete) — single-completion for v1.

## Why this is intent-only

The bounty state machine must integrate tightly with the contribution verification model (slice 24) and the money-movement layer (slice 23). Both of those are undesigned at this point. Locking in the bounty lifecycle now risks building a state machine that doesn't map cleanly to the payment settlement events. Design this once slice 23's escrow contract is drafted and slice 24's verification states are known.

## Loose sketch (do not lock in)

### Schema

- `Bounty` — core record. Fields: `id`, `title`, `description`, `entityType`, `entityId` (nullable — bounty can attach to an existing entity like a section, or be freeform for net-new data), `postedBy` (funderId/userId), `fundedAmountCents` (0 until escrow in slice 23), `currency`, `status: draft | open | claimed | in_review | settled | expired | cancelled`, `expiresAt`, `claimedBy`, `claimedAt`, `settledAt`, `settledContributionId`.
- `BountyClaim` — a contributor's intent to complete a bounty. Fields: `bountyId`, `claimantId`, `claimedAt`, `status: active | withdrawn | superseded`. Only one active claim per bounty at a time (first-come-first-served v1 — may relax later to allow parallel competing submissions).
- `BountySubmission` — the contribution submitted against a claim. FK to `Contribution` (slice 21). Fields: `claimId`, `contributionId`, `submittedAt`, `reviewOutcome: pending | accepted | rejected`, `reviewedBy`, `reviewedAt`, `rejectionReason`.

### Routes

- `GET /bounties` — browsable list, filterable by entity type / section / corridor / status.
- `GET /Bounty/:id` — detail with full lifecycle history.
- `POST /Bounty/` — create (funder/sponsor capability from slice 20).
- `POST /BountyClaim/` — claim a bounty (member capability from slice 20).
- `POST /BountySubmission/` — submit work against a claim.
- `PATCH /BountySubmission/:id/review` — accept or reject (admin / trusted-contributor capability).

### Resources

- `resources/Bounty.ts` — lifecycle state machine. Enforces: only funders can post; only members can claim; claims expire if no submission within N days; settled bounties are frozen.
- `resources/BountyClaim.ts` — claim CRUD + withdraw.
- `resources/BountySubmission.ts` — submission + review + settlement trigger (emits an event consumed by slice 23 when accepted).

### Frontend

- `app/src/pages/BountyFeedPage.tsx` — filterable list of open bounties.
- `app/src/pages/BountyDetailPage.tsx` — full bounty lifecycle view.
- `app/src/components/BountyCard.tsx` — compact bounty card for embedding on section/corridor pages.
- `app/src/components/BountyStatusBadge.tsx` — open/claimed/in-review/settled pill.
- Bounty cards embedded inline on section pages alongside the corresponding entity (e.g. an "access points needed" bounty appears near the access-points block).

## Open questions for when this becomes active

- **Parallel claims.** First-come-first-served (one active claim) keeps the state machine simple but frustrates contributors if the first claimant sits on a bounty. Consider a claim-expiry timer (e.g. 14 days to submit before claim releases).
- **Freeform vs entity-anchored bounties.** A bounty anchored to `entityId` is easy to review (does this contribution satisfy the scope?). A freeform bounty ("seed 20 access points for the Upper Dolores") is harder to auto-link to contributions. Recommend: entity-anchored only for v1; freeform deferred.
- **Multiple funders per bounty.** Can a bounty accumulate contributions from multiple funders (crowd-fund the pot)? This adds complexity to the payment split in slice 23. Recommend: single funder for v1, multi-funder deferred.
- **Partial acceptance.** If a contributor submits a rapid record but the hazard field is empty, can a reviewer accept it partially and ask for a follow-up? Recommend: binary accept/reject with a rejection reason + re-submission allowed on the same claim.
- **Bounty discovery.** How do contributors find bounties relevant to their local rivers? Recommend: section page embeds open bounties; global feed filtered by region (geobounded search when we have lat/lng on bounties).
- **Expiry handling.** What happens to funded-but-unsubmitted bounties at expiry? Funds must be returned to the funder (slice 23 concern, but the Bounty state machine must emit the right event).

## References that will matter when active

- `.plans/slices/21-contribution-content-model/intent.md` — the `Contribution` entity that `BountySubmission` references.
- `.plans/slices/20-identity-roles-capabilities/` — funder, member, and contributor capabilities that gate bounty operations.
- `.plans/slices/23-payments-marketplace/intent.md` — the escrow + settlement contract that this slice must emit events toward.
- `.plans/slices/24-trust-reputation-governance/intent.md` — the review/verification flow that accepts or rejects bounty submissions.
- `.plans/vision/contribution-economy.md` — the full lifecycle thesis this slice implements.
- `.plans/vision/product-vision.md` — strategic rationale for bounty-driven data collection as the moat.
