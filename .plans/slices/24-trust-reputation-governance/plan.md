---
slice: 24-trust-reputation-governance
status: queued
value: 8
confidence: 6
effort: L
depends_on: [21-contribution-content-model, 22-bounty-system]
unlocks: [28-sponsor-admin-governance-console]
opened: 2026-06-02
closed: null
---

# Slice 24 — Trust, reputation & governance

## Context (grounded 2026-06-03)

The self-policing layer. Today, review is **admin-only**: `resources/Contribution.ts` `patch(verify)` and `resources/Bounty.ts` `award` both gate on `isAdminUser` (with `reviewer ≠ submitter`). That's a single bottleneck and doesn't scale. This slice adds **earned reputation + trust tiers** so review broadens beyond admins, plus **flagging + a moderation queue** so bad data surfaces and gets triaged — with admins as the backstop, not the frontline.

What's built that this decorates:
- **Contribution** verification states (`pending → verified | disputed | rejected`); `applyVerifiedContribution` applies a verified contribution to its entity. Verify is the natural reputation trigger.
- **Capabilities** (`lib/auth/capabilities-pure.ts`): `isMember/isAdmin/canContribute/...`. Trust tier is a NEW dimension layered on top (not a capability — derived from track record).
- **Bounty award** (reviewer ≠ submitter) — a second reputation/review trigger.
- **Karma ledger** — relevant to the deferred "reward moderators" question.

## The data-volume caution (drives scope)

The intent is explicit: trust-tier *thresholds* and *auto-acceptance* rules should be calibrated against real acceptance/rejection data, which doesn't exist pre-launch. So this slice builds the **mechanism** (reputation accrual, tiers, flags, queue, broadened review) with **conservative, tunable constants**, and **defers tier-based auto/provisional publishing** — the one lever that risks bad data going live before we understand acceptance rates. Recommended scope = **B** below; the user picks.

## Architecture

### Reputation as derived-but-cached state
- `ContributorReputation` record per user, **updated via a hook** on every accept/reject/flag-action. The **trust tier is a pure function** of the record (mirrors `resolveCapabilities`): `resolveTrustTier(rep) → 'new' | 'established' | 'trusted' | 'moderator'`, with thresholds as named constants. `moderator` and `banned` are admin-set overrides on the record; everything else is earned.
- A shared `bumpReputation(tables, userId, delta)` helper updates the record + recomputes tier + appends a `ModerationEvent`. Called from Contribution verify/reject, Bounty award, and flag actioning.

### Broadened review (the bottleneck-breaker)
- Pure `canReview(reviewer, reviewerRep) = isAdmin || tier ∈ {trusted, moderator}`. Replace the `isAdminUser`-only gate in Contribution `verify` and Bounty `award` with `canReview` (keeping `reviewer ≠ submitter`). Now proven contributors help clear the queue.

### Flagging + moderation queue
- `ContentFlag`: any member flags a contribution/entity (`reason`, `status`). Submitting a flag on a *verified* contribution moves it to `disputed` (re-review). Flags accrue to the author's `flagsReceived`.
- Moderation queue = pending + disputed contributions + open flags, surfaced to reviewers (`canReview`).

### Audit
- `ModerationEvent`: append-only log of every action (accept/reject/flag/dispose/tier-change/ban). The governance audit trail.

## Schema (`schemas/governance.graphql`)
```graphql
type ContributorReputation @table @export {
	id: ID @primaryKey              # = userId
	userId: ID @indexed
	acceptedContributions: Int
	rejectedContributions: Int
	flagsReceived: Int
	flagsSubmitted: Int
	manualTier: String              # null | 'moderator' (admin promotion); overrides earned tier upward
	bannedAt: String
	lastTierChangeAt: String
	updatedAt: String
}
type ContentFlag @table @export {
	id: ID @primaryKey              # compositeId([entityType, entityId, reportedBy, timestamp])
	flaggedEntityType: String @indexed
	flaggedEntityId: ID @indexed
	flaggedContributionId: ID @indexed
	reportedBy: ID @indexed
	reason: String                  # inaccurate | outdated | harmful | duplicate | spam
	status: String @indexed         # open | dismissed | actioned
	reviewedBy: ID
	reviewedAt: String
	notes: String
	createdAt: String @indexed
}
type ModerationEvent @table @export {
	id: ID @primaryKey
	actorId: ID @indexed
	action: String @indexed         # accepted | rejected | flagged | flag_dismissed | flag_actioned | tier_changed | banned
	entityType: String
	entityId: ID @indexed
	reason: String
	createdAt: String @indexed
}
```

## Pure logic + tests
### `lib/governance/reputation-pure.ts` (no Harper imports)
- `type TrustTier = 'new' | 'established' | 'trusted' | 'moderator'`
- thresholds as exported constants (conservative defaults, documented as tunable): e.g. `ESTABLISHED_MIN_ACCEPTED = 3`, `TRUSTED_MIN_ACCEPTED = 15`, `MAX_REJECTION_RATE = 0.25`.
- `resolveTrustTier(rep): TrustTier` — banned → handled by caller; manualTier 'moderator' wins; else earned from accepted count + rejection rate.
- `canReview(isAdmin: boolean, tier: TrustTier): boolean` — admin or trusted/moderator.
- `applyReputationDelta(rep, delta): rep` — pure update of counts.
- `isBanned(rep): boolean`.
### `test/reputation-pure.test.ts`
Tier boundaries (new→established→trusted by count + rejection-rate gating), manualTier override, canReview matrix, banned handling, delta application.

## Resources
- `resources/ContentFlag.ts` (`ContentFlagResource`): `post` (any member flags; dedup one open flag per user+entity; if target contribution is `verified` → set it `disputed` + `bumpReputation(author, flagsReceived+1)` + ModerationEvent); `get` (own flags; `?status=open` → admins/moderators only); `patch` review (`canReview`: dismiss | action → ModerationEvent; action may reject the underlying contribution).
- `resources/Moderation.ts` (`ModerationResource`): `get` queue = pending + disputed contributions + open flags, for `canReview` users; no writes (actions go through Contribution/ContentFlag).
- `resources/ContributorReputation.ts` (`ContributorReputationResource`): read own; admin/moderator read any (`?userId=`); admin `patch` to set `manualTier`/ban. No earned-field writes via API — only the internal hook.
- `lib/governance/reputation.ts` — `bumpReputation()` + `logModerationEvent()` helpers (Harper-touching; take `tables`).
- **Edits to existing:** `resources/Contribution.ts` verify/reject → call `canReview` (not isAdmin-only) + `bumpReputation` (accepted/rejected) + ModerationEvent. `resources/Bounty.ts` award → `canReview` gate + reputation bump. Both keep `reviewer ≠ submitter`.

## Frontend
- `app/src/components/TrustBadge.tsx` — tier indicator (new/established/trusted/moderator) on contribution provenance strips (alongside `ContributionBadge`).
- `app/src/components/FlagButton.tsx` — unobtrusive flag affordance on contribution-powered cards (AP/Rapid/Shuttle/Outfitter), opens a reason picker → `ContentFlag`.
- `app/src/pages/ModerationQueuePage.tsx` (`/moderation`, gated by `canReview`) — worklist of pending/disputed contributions + open flags with accept/reject/dismiss/action.
- `app/src/components/ReputationSummary.tsx` — a contributor's trust history; on profile (own) + admin user view (reuse the `WalletPanel` slot pattern).
- `app/src/api.ts` — `submitFlag`, `listFlags`, `reviewFlag`, `getModerationQueue`, `getReputation(userId?)`, `setTrustTier` (admin). Vite proxy: add the new resource paths (slice-22 proxy lesson).
- `/Me` (or reputation surface) exposes the caller's tier so the UI can show review affordances.

## What's DEFERRED (data-volume caution + intent)
- **Tier-based auto/provisional publishing** (established→provisional-live, trusted→auto-accept). The mechanism (tiers) is built; the auto-publish lever stays OFF until real acceptance-rate data exists. v1: every contribution still needs an explicit `canReview` accept — but reviewers are now trusted contributors + admins, not admins alone. (This is the recommended-scope decision; see below.)
- **Moderator karma compensation** (reward review work from the karma economy) — flagged, deferred; revisit with data.
- **Automated banning/appeals** — admin discretion v1.
- **AI/LLM moderation, leaderboards, DAO voting** — out (intent).

## Acceptance criteria
1. Governance schemas load; no reload errors.
2. `reputation-pure.ts` pure + fully unit-tested (tier boundaries, rejection-rate gating, manualTier override, canReview, banned).
3. Contribution verify/reject and Bounty award now gated by `canReview` (admin OR trusted/moderator), still `reviewer ≠ submitter`; each updates the author's reputation + logs a ModerationEvent.
4. A trusted-tier (non-admin) contributor can verify a pending contribution; a `new`/`established` one cannot (403).
5. Any member can flag; flagging a verified contribution moves it to `disputed` and bumps the author's flagsReceived; one open flag per user+entity (dedup).
6. `GET /ModerationResource` returns the queue (pending + disputed + open flags) to `canReview` users; 403 otherwise.
7. Reputation accrues across accept/reject (tier transitions at the constants); admin can set `manualTier`/ban.
8. Frontend: TrustBadge on provenance, FlagButton on entity cards, `/moderation` queue page (gated), ReputationSummary on profile/admin. No auto-publish (deferred lever off).
9. `npm test` green; `npm run ui:build` clean. Slice 21/22/23b unregressed.

## Verification steps
1. `npm test` + `npm run ui:build`.
2. Harper + Vite up; clean schema reload.
3. Curl: seed a contributor to `trusted` (admin set manualTier or accept enough contributions) → that non-admin verifies a pending contribution (succeeds) → a `new` user attempts verify (403). Flag a verified contribution → it goes `disputed`, author flagsReceived++. Moderation queue lists it. Reputation bumps on accept/reject; admin ban blocks review.
4. Browser (dev bypass = admin): `/moderation` queue renders; FlagButton on an AP card flags it; TrustBadge shows on provenance; ReputationSummary on profile. Screenshot.
5. Regression: slice-21 contribution edit→verify still works (now via canReview); bounty award still works; karma wallet intact.

## Build phases (internal; auto within Execute)
- **A — reputation + governance backend:** schemas, `reputation-pure` + tests, `reputation.ts` helpers, ContentFlag/Moderation/ContributorReputation resources, edits to Contribution + Bounty (canReview + bump), Vite proxy. Verify via curl.
- **B — frontend:** TrustBadge, FlagButton, ModerationQueuePage, ReputationSummary, api.ts. Verify in browser.
- **C — E2E + regression + screenshot.**

## Open questions (resolved for this slice / deferred)
- **Thresholds = conservative tunable constants** (instrument, recalibrate with data). **Auto/provisional publishing deferred** (recommended scope B). **Moderator karma comp deferred.** **Banning = admin discretion.** **Reputation is per-person (portable across future domains).** **Conflict-of-interest = transparency + flags** (no hard block).

## Slice paperwork
- `plan.md` (this file) — authored 2026-06-03.
- `status.md` — exists (activation entry); update per phase.
- `decisions.md` — create if a design call reverses during build.
