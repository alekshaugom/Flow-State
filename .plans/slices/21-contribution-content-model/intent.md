---
slice: 21-contribution-content-model
status: queued
value: 9
confidence: 6
effort: L
depends_on: [20-identity-roles-capabilities]
unlocks: [22-bounty-system, 24-trust-reputation-governance, 25-zero-layers-deep-ia]
opened: 2026-06-02
closed: null
---

# Slice 21 — Contribution content model (intent)

## What success looks like

A paddler navigating to the Browns Canyon section page encounters rich, community-supplied ground truth: every access point is typed (trailer ramp, slide rails, carry-in/out, horse pack-in, fly-in) with current conditions notes and directions; each significant rapid has line descriptions, known hazards, and photos keyed to the flow level at which they were taken; nearby shuttle businesses and licensed outfitters appear with current contact info. Every piece of that data has a visible provenance trail — who contributed it, when, what version, whether a trusted reviewer has verified it. Edits are tracked, reversible, and attributed.

This is the **data layer of the contribution economy**. Without it there is nothing to fund bounties on, nothing to verify, and no community to build.

Absorbs the old `11-rapid-stub-pages` slice, which sketched a lightweight version of this same surface.

## What's NOT it

- Not the bounty economy itself — that is slice 22.
- Not trust scoring or moderation queues — that is slice 24.
- Not the UI through which these entities are surfaced to visitors — that is slice 25 (deep IA).
- Not user-facing photo galleries for trip logs — those belong to slice 12f.
- Not shuttle logistics booking or outfitter reservations — just structured data records.
- Not editorial summaries written by admins — that is slice 08/09 territory.
- Not a complete data import pipeline from American Whitewater or other sources — seeding is manual or bounty-driven.

## Why this is intent-only

The schema for rich contributable entities is easy to bloat. The right shape depends on:

1. How the trust/verification model (slice 24) will be implemented — the `Contribution` record must carry whatever state that system needs.
2. What the payment system (slice 23) requires for provenance when awarding bounties — attribution fields may need to satisfy payout compliance.
3. Actual user research into what paddlers care about most on an access-point or rapid page — we should not guess attribute lists from a desk.

Design the schema once slices 20, 22, 23, and 24 have enough definition to constrain it.

## Loose sketch (do not lock in)

### Schema

New tables, all versioned via a shared `Contribution` provenance record:

- `AccessPoint` — extended type enum: `trailer_ramp | slide_rails | carry_in | carry_out | horse_pack_in | fly_in | other`. Fields: `sectionId`, `riverMile`, `lat`, `lng`, `name`, `directions`, `permitRequired`, `feeUsd`, `parkingSpaces`, `lastVerifiedAt`, `verifiedBy`.
- `Rapid` — `sectionId`, `riverMile`, `name`, `classRating`, `lat`, `lng`, `lines` (JSON array: `{ name, description, classAt, entryLine, exitLine }`), `hazards` (JSON), `photosByFlow` (reference to `MediaAsset` rows keyed by `flowCfs`), `aerialImageryUrl`.
- `ShuttleBusiness` — `name`, `phone`, `website`, `serviceAreaCorridors[]`, `ratesJson`, `lastVerifiedAt`.
- `Outfitter` — `name`, `licenseNumber`, `licenseState`, `phone`, `website`, `serviceCorridors[]`, `tripTypesOffered`, `lastVerifiedAt`.
- `MediaAsset` — `uploaderId`, `contributionId`, `blobKey`, `mimeType`, `widthPx`, `heightPx`, `bytes`, `capturedAtCfs` (optional — flow reading at time of capture), `capturedAt`, `exifStripped: boolean`. GPS stripped before storage.
- `Contribution` — the versioned provenance record wrapping every edit to any contributable entity. Fields: `entityType`, `entityId`, `version`, `authorId`, `submittedAt`, `verificationState: pending | verified | disputed | rejected`, `verifiedBy`, `verifiedAt`, `changesetJson` (diff of changed fields), `bountyId` (nullable FK — if this contribution was submitted against a bounty).

### Routes

- `/access-point/:id` — structured AP page.
- `/section/:slug/rapids` — list view of all rapids for a section.
- `/section/:slug/rapid/:rapidSlug` — individual rapid page (absorbs the old slice 11 route).
- `/shuttle/:id`, `/outfitter/:id` — detail pages.
- `POST /Contribution/` — submit a new contribution (any entity type).
- `PATCH /Contribution/:id/verify` — admin/trusted-contributor verification action.

### Resources

- `resources/Contribution.ts` — core CRUD + verification state machine.
- `resources/AccessPoint.ts`, `resources/Rapid.ts`, `resources/ShuttleBusiness.ts`, `resources/Outfitter.ts` — thin wrappers that delegate provenance writes to `Contribution`.
- `resources/MediaAsset.ts` — multipart upload with EXIF stripping + `capturedAtCfs` linkage.

### Frontend

- `app/src/pages/RapidPage.tsx` — line notes + hazards + photos-by-flow grid.
- `app/src/components/ContributionBadge.tsx` — "contributed by X, verified by Y, last updated Z" provenance strip.
- `app/src/components/AccessPointCard.tsx` — typed AP card with directions + permit info.
- `app/src/components/EditContributionForm.tsx` — generic versioned-edit form used across all entity types.

## Open questions for when this becomes active

- **Changeset format.** Full JSON snapshot of the row before/after, or a sparse diff? Sparse diff is smaller but harder to render. Probably full snapshot + generated diff for display.
- **Photo-by-flow keying.** At what granularity? Exact CFS at capture, or binned to flow bands? Flow-band bins are more useful for display ("photos at LOW / MEDIUM / HIGH") — decide at activation.
- **Aerial imagery.** Should we store aerial images in `MediaAsset` or just reference external URLs (e.g. Google Maps static)? External URLs are fragile; storing is expensive. Probably reference-only for v1.
- **ShuttleBusiness / Outfitter verification.** Who verifies a business is still operating? Likely a combination of contributor reports and periodic automated link-checks. Don't design the automation now.
- **Rapid class rating.** International Scale (I–VI) only, or also include a flow-conditional rating (e.g. "Class III at <400 cfs, Class IV at >1000 cfs")? Flow-conditional is the right answer for a serious river app.
- **Soft-delete vs hard-delete.** Contributions are never hard-deleted (institutional memory). The `verificationState: rejected` state is the soft-delete equivalent.

## References that will matter when active

- `schemas/corridor.graphql`, `schemas/river-log.graphql` — existing schema conventions to extend from.
- `.plans/slices/11-rapid-stub-pages/intent.md` — the simpler predecessor; superseded by this slice.
- `.plans/slices/20-identity-roles-capabilities/` — the identity model this slice's authorship + verification must integrate with.
- `.plans/vision/contribution-economy.md` — the strategic rationale for versioned, attributed, bounty-attached contributions.
- `.plans/vision/product-vision.md` — "photos indexed by flow" as a key strategic moat item; this slice provides the `capturedAtCfs` field that makes it possible.
- `.plans/vision/information-architecture.md` — how these entities surface in the zero-layers IA (slice 25).
