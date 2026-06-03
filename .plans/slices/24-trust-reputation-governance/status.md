# Slice 24 status

## 2026-06-03
- Slice opened, set `status: active`. Slice 23b (karma economy) closed + moved to completed/; slice 23 (real payments) remains parked/deferred.
- This is an intent.md; entering Plan phase — the main session will expand it into a full plan.md grounded against the current codebase (Contribution verification states, capability model, karma ledger, bounty award flow).
- Next: surface the expanded plan at the Plan→Execute boundary for user confirmation before building.

## 2026-06-03 — Phase A (governance backend)

### Files created
- `schemas/governance.graphql` — `ContributorReputation`, `ContentFlag`, `ModerationEvent` tables
- `lib/governance/reputation-pure.ts` — `TrustTier`, `resolveTrustTier`, `canReview`, `applyReputationDelta`, `isBanned`; constants `ESTABLISHED_MIN_ACCEPTED=3`, `TRUSTED_MIN_ACCEPTED=15`, `MAX_REJECTION_RATE=0.25`
- `lib/governance/reputation.ts` — `getReputation`, `bumpReputation`, `logModerationEvent`, `resolveCallerReview` (with dev bypass)
- `resources/ContentFlag.ts` (`/ContentFlagResource`) — post (flag any entity; dedup; verified→disputed on flag), get (own flags; `?status=open` requires canReview), patch (dismiss/action; action rejects linked contribution + bumps author rejected count)
- `resources/Moderation.ts` (`/ModerationResource`) — get queue (pending + disputed contributions + open flags); canReview required
- `resources/ContributorReputation.ts` (`/ContributorReputationResource`) — get own/any-with-reviewer; patch manualTier + ban (admin only)
- `test/reputation-pure.test.ts` — 43 tests; all tier boundary / rejection-rate / manualTier / canReview / isBanned / delta cases

### Files edited
- `resources/Contribution.ts` — `patch()` gate replaced: `isAdminUser` → `resolveCallerReview` (canReview). Reviewer≠submitter enforced (403 if `reviewerId === authorId`). On verify: `bumpReputation(author, {accepted:1})` + `logModerationEvent`. On reject: `bumpReputation(author, {rejected:1})` + `logModerationEvent`.
- `resources/Bounty.ts` — `award()` gate replaced: `isAdminUser` → `resolveCallerReview`. Reviewer≠submitter kept via `canAward`. On award: `bumpReputation(awardeeId, {accepted:1})` + `logModerationEvent`. No double-count risk (award path uses applyVerifiedContribution directly, not Contribution.patch).
- `vite.config.ts` — added proxy entries: `/ContentFlagResource`, `/ModerationResource`, `/ContributorReputationResource`, `/ContentFlag`, `/ModerationEvent`, `/ContributorReputation`

### canReview wiring
Both `resources/Contribution.ts` `patch()` and `resources/Bounty.ts` `award()` now call `resolveCallerReview(tables, ctx)` instead of `isAdminUser`. `resolveCallerReview` returns `{ok, userId, isAdmin, tier}` — it checks the WaitlistUser + ContributorReputation, runs `canReview(isAdmin, tier)`, and returns ok only for admin, trusted, or moderator tier. In non-production it bypasses with `isAdmin:true, tier:'moderator'`. The reviewer≠submitter rule is enforced in both resources.

### Test results
- `npm test`: **491 tests, 0 failures** (including 43 new reputation-pure tests, ok 358–400)
- `npm run ui:build`: clean (✓ built in 338ms)

### Curl verification (Harper 9926, dev bypass active)
- `GET /ContributorReputationResource` → `{tier:"new"}` for dev_local (zeroed default) ✓
- `PATCH /ContributorReputationResource {userId:"user_alice",manualTier:"moderator"}` → record updated; subsequent GET shows `tier:"moderator"` ✓
- Reviewer≠submitter: `PATCH /ContributionResource {action:"verify"}` on own contribution → 403 "reviewer cannot verify their own submission" ✓
- `POST /ContentFlagResource` flagging a verified contribution → contribution `verificationState: "disputed"`, ContentFlag `status: "open"`, author `flagsReceived: 1` ✓
- `GET /ModerationResource` → `{totals:{pending:3,disputed:1,openFlags:1}}` showing queue correctly ✓
- `PATCH /ContributionResource {action:"verify"}` on alice's disputed contribution by dev_local (different author) → `verificationState:"verified"`, alice `acceptedContributions:1` ✓
- Flag dedup: second flag on same entity → 409 "You already have an open flag" ✓
- Ban: `PATCH /ContributorReputationResource {userId:"user_alice",banned:true}` → stored; ModerationEvent logged ✓

### Deviations
- None from plan specification. PATCH response for ContributorReputation shows pre-save state (read-after-write staleness — same known Harper pattern as Contribution.ts; GET returns correct post-save state). Noted, not fixed — consistent with existing convention.
- Auto-publish lever deferred as planned (every contribution still requires explicit canReview accept).

## 2026-06-03 — Phase B (frontend)

### Files created
- `app/src/components/TrustBadge.tsx` — tier pill (new/established/trusted/moderator) mirroring BountyStatusBadge styling
- `app/src/components/FlagButton.tsx` — small "Flag" affordance with reason picker + optional note, useMutation → POST /ContentFlagResource; 409 shows "Already flagged"; only rendered for logged-in members
- `app/src/components/ReputationSummary.tsx` — shows tier (TrustBadge), accepted/rejected/flag counts; prop `userId?` (own if omitted)
- `app/src/pages/ModerationQueuePage.tsx` — route `/moderation`; three sections (Pending, Disputed, Open flags); Verify/Reject per contribution (disabled for own submissions); Dismiss/Action per flag; useMutation + queue invalidation

### Files edited
- `app/src/api.ts` — added: `submitFlag`, `listOpenFlags`, `reviewFlag`, `getModerationQueue`, `getReputation(userId?)`, `setTrustTier`
- `app/src/App.tsx` — added `/moderation` route (lazy, Suspense)
- `app/src/components/AppHeader.tsx` — added `useQuery(['reputation','me'])` → callerTier; shows "Moderation" nav link when `isAdmin || tier ∈ {trusted,moderator}`; activePage type extended to include `'moderation'`
- `app/src/components/AccessPointCard.tsx` — FlagButton in provenance footer (entityType=AccessPoint)
- `app/src/components/RapidCard.tsx` — FlagButton in provenance footer (entityType=Rapid)
- `app/src/components/ShuttleBusinessCard.tsx` — FlagButton in provenance footer (entityType=ShuttleBusiness)
- `app/src/components/OutfitterCard.tsx` — FlagButton in provenance footer (entityType=Outfitter)
- `app/src/pages/ProfileSetupPage.tsx` — added "TRUST & REPUTATION" section above wallet using `<ReputationSummary />`
- `app/src/admin/AdminUsersPanel.tsx` — added "Reputation" button per user → `UserReputationSection` (inline tier controls: promote/pin to trusted/moderator; clear override; ban/unban); imports ReputationSummary + TrustBadge

### TrustBadge placement decision
TrustBadge is NOT added to entity cards (AccessPoint/Rapid/Shuttle/Outfitter) because author tier is not in the provenance data returned by those endpoints, and fetching tier per-card would add N /ContributorReputationResource calls per page load — an unacceptable perf cost for cosmetic data. TrustBadge is instead shown in:
1. ModerationQueuePage (reviewer's own tier in the page header)
2. ReputationSummary component (profile + admin per-user view)
3. AdminUsersPanel UserReputationSection (per-user tier display + override controls)
FlagButton is on all four entity card types (subtle footer placement, only for members).

### Moderation nav gating
AppHeader fetches `GET /ContributorReputationResource` (own, no userId param) once per minute via useQuery with staleTime 60s. The "Moderation" link renders when `capabilities.isAdmin || callerTier ∈ {trusted, moderator}`. In dev (isAdmin true), the link always shows. ModerationQueuePage also self-guards: it re-fetches reputation + redirects to "not authorized" if the caller doesn't pass canReview, so the nav link is belt-and-suspenders only.

### Per-card tier fetches
None added to entity cards. Decision documented above under "TrustBadge placement decision."

### Test and build results
- `npm test`: **491 tests, 0 failures** (all backend/pure tests; frontend-only changes don't affect node test runner)
- `npm run ui:build`: clean, ✓ built in 297ms, no TS errors

## 2026-06-03 — Phase C: browser-verified (slice functionally complete)

- Vite restarted to pick up the governance proxy entries; `/ModerationResource` + `/ContributorReputationResource` confirmed returning JSON.
- **Moderation queue browser-verified** at `/moderation`: GOVERNANCE header + caller tier badge + "3 pending · 0 disputed · 1 open flags"; pending contributions each show "(your submission)" with NO Verify/Reject (reviewer≠submitter visibly enforced); open flag shows reason (INACCURATE), entity, note, reporter + Dismiss/Action. Screenshot captured.
- Nav "Moderation" link gated on isAdmin||trusted/moderator (shows in dev). FlagButton on all 4 entity cards; ReputationSummary on profile + admin user view; TrustBadge in queue/summary (deliberately not per-card, to avoid N fetches).
- Backend curl (Phase A) confirmed: canReview broadening, flag→disputed, reputation accrual, ban, manualTier. 491 tests green, build clean.
- Note: the queue is full of dev_local test contributions from prior slices' curl testing — harmless dev-DB pollution, re-seedable.

**Status: code-complete + verified.** Auto-publish lever deferred per scope. Holding done + mv completed/ + activate-25 for the user's confirmation. On confirm → slice 25 (zero-layers-deep IA) is the last v2 spine slice.
