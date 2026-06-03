---
slice: 26-global-coverage-bounties
status: queued
value: 7
confidence: 5
effort: M
depends_on: [22-bounty-system, 23-payments-marketplace]
unlocks: []
opened: 2026-06-02
closed: null
---

# Slice 26 — Global coverage bounties (intent)

## What success looks like

A boater in New Zealand wants section-level flow data for the Rangitikei. They visit the Flow-State rivers page, find the Rangitikei listed (it is in the existing `WorldRiver` table), and see that it has zero contributed records and zero seeded flow data. They can post a bounty to fund the first contributor who adds access points, rapid notes, or a gauge link. A local New Zealand paddler sees the bounty, claims it, submits the records, and gets paid.

The platform's data coverage expands without the core team lifting a finger. Rivers outside the US get real data the same way US rivers do — through the community, incentivized by real money.

Where government data already exists (USGS gauges, international equivalents), the platform pre-seeds the river automatically, lowering the barrier to contribution even further.

## What's NOT it

- Not a geographic expansion of the ingestion worker to every country's gauge API — that is a separate, ongoing infrastructure effort (more like an ops practice than a slice).
- Not building new adapters for international data sources in this slice — the ingestion worker handles that incrementally; this slice is about the **bounty surface** on already-listed rivers.
- Not a geographic map browser for finding rivers worldwide — that is part of slice 25's IA work.
- Not quality validation of international contributions — that is slice 24's trust system, which applies globally.
- Not a grant program or platform-subsidized bounties — bounties are funded by community members, not by the platform here.

## Why this is intent-only

Global coverage depends on slices 22 (bounty system) and 23 (payments) being live and working first. Without real money flowing in and out, there is no incentive for international contributors. The `WorldRiver` table already exists; the content layer is the missing piece, not the data model. Come back to this once the bounty + payment loop is proven domestically.

## Loose sketch (do not lock in)

### Data model

The existing `WorldRiver` table already holds river names + countries + rough geometry for thousands of rivers worldwide. This slice adds the **contribution surface on top**, not a new river index.

- `WorldRiver` already has: `id`, `name`, `country`, `state/province`, `lat`, `lng`, `osmRelationId`.
- This slice adds: `seededAt` (nullable — set when ingestion worker first seeds any gauge data), `openBountyCount` (denormalized for display), `contributedRecordCount` (denormalized for display).
- No new schema — bounties and contributions attach to sections derived from `WorldRiver`, using the same `entityType/entityId` FK pattern from slices 21 and 22.

### Pre-seeding logic

Where a free government data source exists for a river outside the existing USGS/CDSS coverage, auto-seed a minimal section record (name, rough mile range, gauge link) to give contributors something to attach records to. Examples:

- **Environment Canada** — real-time gauge data for Canadian rivers.
- **NIWA (New Zealand)** — flow data for major NZ rivers.
- **Australian Bureau of Meteorology** — flood gauge network.

Auto-seeding is best-effort and async — run via the ingestion worker on a slow background schedule, not on demand.

### Routes

- `GET /rivers/world?country=NZ&status=open_bounties` — filtered list of rivers with open bounties by country/region.
- The existing bounty routes from slice 22 cover everything else — global coverage is a data scope expansion, not a new API surface.

### Resources

- Extend `resources/WorldRiver.ts` (if it exists) to include `openBountyCount` + `contributedRecordCount` derived aggregates.
- Add a `lib/adapters/environment-canada.ts`, `lib/adapters/niwa.ts` etc. as needed (incubated here, promoted to the ingestion worker codebase).

### Frontend

- `app/src/pages/GlobalRiversPage.tsx` — searchable list of rivers worldwide, filterable by country, bounty status, data completeness.
- `app/src/components/RiverCoverageCard.tsx` — compact card showing: river name, country, coverage bar (% of expected fields filled), open bounty count, "Post a bounty" CTA.

## Open questions for when this becomes active

- **Which international gauge APIs to prioritize?** Rank by English-language documentation quality + free access + country with active whitewater community. Canada and New Zealand are obvious; Australia, UK, and Germany are the next tier.
- **Gauge data licensing.** Some government APIs restrict commercial use. Review licenses before ingesting and caching. USGS is public domain; others vary.
- **Payout compliance for international contributors.** Stripe Connect Express is not available everywhere. This is a real blocker for contributors in countries where Stripe does not operate. See open question in slice 23.
- **Language / localization.** Rapid names, AP directions, and shuttle info submitted by international contributors may not be in English. Do we translate? Require English? Allow multilingual records with a language tag? Defer this complexity; require English for v1 with a note that localization is a future enhancement.
- **WorldRiver data quality.** The existing table was populated from OpenStreetMap and may have duplicate or inaccurate entries for some countries. Bounties will surface quality issues faster than any internal audit.

## References that will matter when active

- `WorldRiver` table and seed data: `lib/seed-data.ts`, `schemas/world-river.graphql` (if exists) — the river index this slice adds a contribution surface to.
- `.plans/slices/22-bounty-system/intent.md` — the bounty lifecycle applied to global rivers.
- `.plans/slices/23-payments-marketplace/intent.md` — the payout system that must work for international contributors.
- `.plans/slices/24-trust-reputation-governance/intent.md` — trust model applied globally; no geographic carve-outs.
- `.plans/vision/contribution-economy.md` — the global coverage thesis: government data fills the backbone; the community fills the gaps.
