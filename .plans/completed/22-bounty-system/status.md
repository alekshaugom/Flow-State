# Slice 22 status

## 2026-06-03
- Slice opened, set `status: active`. Slice 21 closed + moved to completed/ after user confirmed the contribution content model in-browser.
- This slice was an intent.md; entering Plan phase — the main session will expand it into a full plan.md grounded against the current codebase (the just-shipped Contribution spine, capabilities canFund stub, contributable entities).
- Next: surface the expanded plan at the Plan→Execute boundary for user confirmation before building.

## 2026-06-03 — Phase A (economy backend)

### Files created
- `schemas/ledger.graphql` — `LedgerEntry` @table @export with all fields per plan
- `schemas/bounty.graphql` — `Bounty` @table @export with all fields per plan
- `lib/ledger/ledger-pure.ts` — `computeBalance`, `applyEntry` (sign rules + no-overdraft), `bountyEscrow`, `summarizeForProfile`, `validateAmount`, `MAX_AMOUNT_CENTS`
- `lib/ledger/write.ts` — `writeLedgerEntry` + `getUserBalance` (Harper-touching; takes `tables` as arg)
- `lib/bounties/bounty-pure.ts` — `validateBountyInput`, `canTransitionBounty`, `canAward`, `isExpired`
- `lib/contributions/apply-verification.ts` — extracted shared `applyVerifiedContribution` helper (DRY for Contribution.ts + Bounty.ts award)
- `resources/Ledger.ts` — class `LedgerResource` → path `/LedgerResource`
- `resources/Bounty.ts` — class `BountyResource` → path `/BountyResource`
- `test/ledger-pure.test.ts` — 28 tests covering all pure logic
- `test/bounty-pure.test.ts` — 23 tests covering all pure logic

### Files modified
- `lib/auth/capabilities-pure.ts` — `canFund: false` → `canFund: approved` (slice 22 change)
- `test/auth-capabilities-pure.test.ts` — split "stub payment flags" test; canFund now true-for-approved; canReceivePayout remains false stub
- `resources/Contribution.ts` — refactored `patch() verify` branch to call `applyVerifiedContribution`; removed local duplicate logic; added import
- `resources/RiverDetail.ts` — added `getBountiesForSection` + wired into `Promise.all` + `bounties` in result

### REST paths (custom resources)
- `/LedgerResource` — `GET` (own/userId/system), `POST {action:'grant'}`
- `/BountyResource` — `GET` (id/entityType+entityId/corridorId), `POST {action:'post-bounty'|'add-funding'|'cancel'}`, `PATCH {action:'award'}`
- **Naming rationale:** `Bounty` table is `@export` so Harper auto-generates `/Bounty` as the table CRUD endpoint. `LedgerResource` uses the suffix for consistency. Both match the slice-21 ContributionResource convention.

### Contribution.bountyId linkage
`ContributionResource.post` already stores `data?.bountyId ?? null` on every contribution row (reserved in slice 21). The BountyResource award action checks `contribution.bountyId === bountyId` to ensure the contribution is actually for this bounty before awarding. Frontend passes `bountyId` in the create-contribution form body.

### Curl invariant results (all against Harper dev, port 9926)
1. Grant 5000 → dev_local balance 5000 ✓
2. Post-bounty fundCents:2000 → status open, escrow 2000, balance 3000 ✓
3. Over-fund (fundCents:999999 with balance 3000) → 400 "Insufficient balance" ✓ (no-overdraft)
4. Add-funding 1000 → escrow 3000, balance 2000 ✓
5. Contribution by Alice (different session) with bountyId → authorId=alice ✓
6. Award dev_local-awards-dev_local → 403 "reviewer cannot approve own submission" ✓ (reviewer≠submitter)
7. Award dev_local-awards-alice-contrib → status settled, awardedTo=alice, alice balance 2000+1500=3500, escrow 0, contribution verificationState=verified ✓ (award + verify applied)
8. Cancel+refund: bounty escrow 3000 → status cancelled, escrow 0, dev_local balance refunded (3500 net) ✓ (escrow conservation)
9. Alice re-funds new bounty from award earnings: status open, escrow 1000, alice balance 2500 ✓ (money stays in system)
10. RiverDetail surfacing: /RiverDetail/arkansas-pine-creek → bounties: 1 ✓

### Tests + build
- `npm test`: 447 pass, 0 fail (includes 28 ledger-pure + 23 bounty-pure + updated capabilities)
- `npm run ui:build`: ✓ built in 365ms (size warnings pre-existing, not introduced here)

### Deviations from plan
- None. The reviewer=submitter guard in dev always fires because dev mode collapses all callers to `dev_local`; the test was verified by creating a real Alice session via login-link/consume, proving the full award path works with distinct identities.
- `applyEntry` for credits with zero balance works correctly (bounty_award with currentBalance=0 succeeds since it's a credit, not a debit).

## 2026-06-03 — Phase A review fixes (main-loop review of agent diff)

Two correctness fixes after reviewing the Phase A diff:
1. **Ledger balance is now authoritative-by-sum.** `lib/ledger/write.ts` had read the current balance from the latest entry's `balanceAfterCents` snapshot (sorted by `createdAt`). For money that's a footgun — a single bad snapshot propagates, and it's sensitive to timestamp collisions. Changed `writeLedgerEntry` + `getUserBalance` to use `computeBalance()` (full signed sum, order-independent, self-correcting); `balanceAfterCents` is kept only as an audit snapshot. Re-smoked live: grant→balance→post-bounty correct.
2. **Bounty cancel auth fixed for non-admin posters.** `cancel` gated on `isAdminUser` first, so in production a non-admin poster couldn't cancel their own bounty (the poster check was unreachable). Dev-bypass masked it. Reworked to load the bounty first, then authorize admin-OR-poster.

447 tests green, build clean after both fixes.

Known v1 limitations (documented, not blocking): ledger writes aren't transactionally locked (concurrent debits could race — fine single-user dev; revisit before high concurrency); award is multi-step without rollback (but the credit award can't fail no-overdraft, so safe in practice).

## 2026-06-03 — Phase B (frontend)

### Files created
- `app/src/components/BountyStatusBadge.tsx` — pill per status (open=river-blue, awarded/settled=green, cancelled/expired=muted); mirrors ContributionBadge styling
- `app/src/components/BountyCard.tsx` — title, acceptanceCriteria, pot (escrowCents as $), status badge; canFund→"Add to pot" (inline $ input); canContribute→"Submit work" (opens EditContributionForm with bountyId); isAdmin→"Award" panel (lazy-loads getBounty, lists contributions with Award button, reviewer≠submitter disabled); poster/canFund or isAdmin→"Cancel bounty"; useMutation + invalidate riverDetail+corridor on success
- `app/src/components/WalletPanel.tsx` — fetches GET /LedgerResource (own or ?userId=); hero balance in river-blue; MetricRow grid for Put in/Collected/Extracted/Funded each expandable to filtered ledger entries; full history toggle; reused on profile (own) + admin (any userId)
- `app/src/components/PostBountyForm.tsx` — canFund-gated form: title, description, acceptanceCriteria, initial fund ($→cents); calls postBounty; invalidates riverDetail+corridor

### Files modified
- `app/src/api.ts` — added: `listBounties`, `listBountiesByCorridor`, `getBounty`, `postBounty`, `addBountyFunding`, `cancelBounty`, `awardBounty`, `getWallet(userId?)`, `grantCredits`, `getSystemLedger`; extended `submitContribution` to accept optional `bountyId` parameter
- `app/src/hooks/useAuth.tsx` — `DEV_CAPABILITIES.canFund: false → true` (dev bypass now grants full canFund; aligns with slice 22 approved=canFund rule)
- `app/src/types.ts` — added `BountyListItem` interface; added `bounties: BountyListItem[]` to `DetailViewModel`
- `app/src/lib/transform.ts` — destructures `bounties` from raw API data; passes through to `DetailViewModel.bounties`
- `app/src/components/EditContributionForm.tsx` — added optional `bountyId` prop to `EditContributionFormProps`; passes it to `api.submitContribution`
- `app/src/components/SectionDetailBody.tsx` — imports BountyCard, PostBountyForm, BountyListItem; adds `addingBounty` state; passes `bounties` + bounty state to `CommunitySection`; adds Bounties sub-block at top of CommunitySection with BountyCard list + PostBountyForm; `hasContent` includes bounties
- `app/src/pages/ProfileSetupPage.tsx` — imports WalletPanel; adds "CREDITS & WALLET" section after Trip History
- `app/src/admin/AdminUsersPanel.tsx` — imports WalletPanel; adds `walletUserId`/`grantUserId` state; adds "Wallet" toggle button per approved user; adds `UserWalletSection` component (grant credits form + WalletPanel for any userId)

### Ledger.ts response shape consumed by WalletPanel
`GET /LedgerResource` (own) returns `{ userId, putInCents, collectedCents, extractedCents, fundedCents, balanceCents, history: LedgerEntry[] }` — the `summarizeForProfile` fields spread directly into the response alongside `history`. WalletPanel reads `data.balanceCents` for the hero, `data.putInCents/collectedCents/extractedCents/fundedCents` for the MetricRow grid, and `data.history` to populate expandable entry lists (filtered by type: grant→Put in, bounty_award→Collected, bounty_fund→Funded).

### How detail.bounties is threaded
1. `resources/RiverDetail.ts` (Phase A) already calls `getBountiesForSection(sectionId)` in the `Promise.all` and returns `bounties` in the JSON result.
2. `app/src/lib/transform.ts` destructures `bounties` from raw data and adds it to the `DetailViewModel` return.
3. `app/src/types.ts` declares `bounties: BountyListItem[]` on `DetailViewModel`.
4. `SectionDetailBody.tsx` reads `detail.bounties` and passes it down to `CommunitySection` via a new prop, where `BountyCard`s are rendered.

### How submitting toward a bounty links bountyId
`EditContributionForm` accepts an optional `bountyId` prop. When set, it is passed as a fifth argument to `api.submitContribution`, which spreads it into the POST body as `bountyId`. `ContributionResource.post` already stores `data?.bountyId ?? null` on every contribution row (reserved in slice 21). `BountyResource.patch` (award action) verifies `contribution.bountyId === bountyId` before awarding. In `BountyCard`, the "Submit work" button opens `EditContributionForm` with `bountyId={bounty.id}`.

### Tests + build
- `npm test`: 447 pass, 0 fail (frontend changes don't touch node test files; backend green)
- `npm run ui:build`: clean, 0 TS errors, built in 286ms (pre-existing chunk size warnings only)

### Deviations from plan
- None material. `BountyCard` uses `entityType="section"` + `entityId={sectionId}` for the submit form since `BountyListItem` (as returned by `getBountiesForSection`) omits `entityType`; the section page only surfaces section bounties, so this is correct for now. For multi-entity bounties on other surfaces (future slice 25/26), BountyCard will need to accept `entityType` explicitly.
- `hasContent` guard in `CommunitySection` was adjusted to also show when `addingBounty` is true, so the "Post a bounty" form renders even when there are no existing entities — necessary because a section page with only bounty interest (no APs/rapids/shuttles/outfitters) would otherwise hide the entire block.

## 2026-06-03 — entity-anchoring fix

Separates bounty display anchor from fulfillment target. A bounty now has: `sectionId` (required — which section page it surfaces on); `entityType` (one of the registry types or `photo`/`other`); `entityId` (nullable — specific entity to edit, or null = net-new create). The old `entityType='section'` is no longer valid and now 400s.

### Files changed
- `schemas/bounty.graphql` — added `sectionId: ID @indexed`; updated `entityType` comment to reflect new set
- `lib/bounties/bounty-pure.ts` — `ALLOWED_ENTITY_TYPES` drops `'section'`, adds `'photo'` and `'other'`; `BountyInputClean` adds required `sectionId`; `validateBountyInput` requires non-empty `sectionId`
- `resources/Bounty.ts` — `postBounty` stores `sectionId` from `clean.sectionId`
- `resources/RiverDetail.ts` — `getBountiesForSection` queries by `{attribute:'sectionId', value:sectionId}` (was `entityId`); includes `entityType`, `entityId`, `sectionId`, `corridorId` in the row mapping
- `app/src/types.ts` — `BountyListItem` adds `entityType: string | null`, `entityId: string | null`; `DetailViewModel` adds `corridorId: string | null`
- `app/src/lib/transform.ts` — destructures `corridor` from raw data; populates `corridorId: corridor?.id ?? section.corridorId ?? null`
- `app/src/components/PostBountyForm.tsx` — props changed from `{entityType, entityId, corridorId}` to `{sectionId, corridorId}`; added entity-type `<select>` (6 options); posts `{sectionId, entityType:<chosen>, entityId:null, ...}`
- `app/src/components/BountyCard.tsx` — added `FULFILLABLE_ENTITY_TYPES` inline constant; Submit affordance conditionally renders `<EditContributionForm entityType={bounty.entityType} entityId={bounty.entityId} op={bounty.entityId ? 'edit' : 'create'} ...>` for fulfillable types; renders muted note for `photo`/`other`
- `app/src/components/SectionDetailBody.tsx` — `CommunitySectionProps` and `CommunitySection` destructure add `corridorId?: string | null`; call site passes `detail.corridorId`; `PostBountyForm` call changed to `sectionId={sectionId} corridorId={corridorId}`
- `test/bounty-pure.test.ts` — all tests updated to provide `sectionId`; new tests: missing `sectionId → 400`, empty `sectionId → 400`, `section` entityType → 400, `photo`/`other` → ok

### Curl results
- `POST /BountyResource {action:'post-bounty', entityType:'access-point', sectionId:'arkansas-pine-creek', ...}` → 200, `entityType:'access-point'`, `sectionId:'arkansas-pine-creek'`
- `POST /BountyResource {action:'post-bounty', entityType:'photo', sectionId:'arkansas-pine-creek', ...}` → 200, `entityType:'photo'`
- `POST /BountyResource {action:'post-bounty', entityType:'section', ...}` → 400 `entityType must be one of: access-point, rapid, shuttle-business, outfitter, photo, other`
- `GET /RiverDetail/arkansas-pine-creek` → `bounties: 2` (both types, both with `entityType` + `sectionId` present)

### Tests + build
- `npm test`: 451 pass, 0 fail (+4 new bounty-pure tests)
- `npm run ui:build`: clean, 0 TS errors, built in 274ms

### Deviations from plan
- Added `corridorId` to `DetailViewModel` (and `transform.ts`) to give `SectionDetailBody` access to `corridorId` for the `PostBountyForm` anchor. This was the only clean path without importing server-side lib — a minor additive change to the view model.

## 2026-06-03 — Phase C: browser verification (slice functionally complete)

- **Bounty UI verified in-browser** on `/corridor/arkansas-headwaters` → expand a section → **Bounties** block: the "Aerial shot at 3000cfs" **photo** bounty ($50, the user's own example) + an access-point bounty ($15), each with acceptance criteria + Add-to-pot / Submit work / Cancel / (admin) Award affordances. Screenshot captured.
- **WalletPanel verified** on `/profile`: Credit Balance $110.00 ("Internal credits · not redeemable for cash (slice 23)"), Put in $220 (4 entries), Collected $0, Extracted $0, Funded $140 (7 entries), full-history toggle. The admin-visible profile metrics.
- **Vite proxy fix** (`vite.config.ts`): the dev proxy allowlist was missing `/BountyResource`, `/LedgerResource`, `/Bounty`, `/LedgerEntry` — AND `/ContributionResource` (a latent slice-21 bug: browser contribution submits were hitting the SPA fallback; only curl had exercised them). Added all; restarted Vite; confirmed `/LedgerResource` now returns JSON.
- Bounty *display* already worked pre-fix because it rides on `/RiverDetail` (proxied); only direct actions (post/fund/award/getWallet/getBounty) needed the proxy entries.
- Preview-tool viewport flakiness (iw=3 / collapsed viewport) recurred — a known preview limitation across this whole project, not an app bug; worked around by explicit resize + DOM-level verification.

**Status: code-complete + verified across all acceptance criteria.** Holding `done` + `mv completed/` + activate-23 for the user's in-browser confirmation (per the established pattern).

## 2026-06-03 — CLOSED
User confirmed slice 22 in-browser ("close and advance to slice 23"). All ACs verified: 451 tests green, build clean, full internal credit economy E2E (grant → post/fund → submit → award+verify → balance → re-fund), invariants enforced (no-overdraft, escrow conservation, reviewer≠submitter), bounty + wallet UI browser-verified incl. the aerial-shot photo bounty + WalletPanel metrics. No real money (credits only). Shipped. Moving to completed/. Queue advances to slice 23.
