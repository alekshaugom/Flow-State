# Data model philosophy

How to think about the Flow-State data model when adding or changing tables.

## Core hierarchy

```
Watershed         "Arkansas River Basin"
   └── RiverCorridor   "Arkansas Headwaters"   (a multi-section floatable stretch)
         └── RiverSection   "Browns Canyon"   (the workhorse)
               └── Rapid    "Zoom Flume"     (the leaf)
```

Every entity at every level has:
- A stable slug-based `id`
- A `description` and (where useful) an `interpretiveSummary`
- Lat/lng for placement or a geometry for shape
- A `driver` classification at corridor + section level

Don't invent levels between these. If a "sub-corridor" feels needed (e.g., AHRA Upper vs Lower), it's still a corridor — just named differently. Adding levels is a one-way door.

## Tables come in four kinds

### 1. Spatial entities (Watershed, RiverCorridor, RiverSection, Rapid, AccessPoint, Reservoir, Gauge, SnowpackBasin)

The places and things. Mostly editorial — written once, edited occasionally. Stable IDs (slugs). Foreign keys reference these.

### 2. Time series (GaugeReading, SnowpackReading, DamRelease, WeatherForecast, DailyGaugeRollup)

Append-only data attached to a spatial entity + timestamp. Indexed on `(entityId, timestamp)`. Composite IDs (`entityId_timestamp`) for idempotent upserts.

### 3. Interpretation (FlowBand, InterpretiveSummary, ContextItem, ForecastRun, ForecastOutput)

Structured editorial / generated content. Versioned (status field), some idempotent (hash), some authored (authoredBy + editedBy).

### 4. Self-improvement (ForecastInput, ForecastAccuracy, SectionHeuristic, HistoricalAnalog)

Operational substrate for the learning loop. Never user-facing directly; powers admin dashboards and downstream tuning.

## Soft references during transition

When adding a new table that's referenced by an existing table, use a **CSV string field** during transition rather than a proper relation:

- `RiverSection.snowpackBasinIds: String` is a comma-separated list of `SnowpackBasin.id`
- `RiverSection.reservoirIds: String` same pattern

This avoids hard cascades during seed/migration and matches Harper's strengths. Promote to proper `@relationship` fields only when access patterns demand it. The cost (no FK integrity) is acceptable because seed data is the source of truth and is version-controlled.

## ContextItem is the unifier

Anything that's not core time-series data and not a stable editorial entity is a `ContextItem`. Dam release notices, agency closures, weather events, user observations, permit lottery status — they all use the same table with `scope`, `scopeId`, and `kind` discriminators.

The benefit: resolution walks the hierarchy. A ContextItem on `scope=reservoir, scopeId=twin-lakes` automatically surfaces on the Arkansas Headwaters corridor page (because Twin Lakes governs it) and on Numbers/Fractions/Browns/Bighorn sections (because they're in that corridor).

Don't add separate `DamReleaseNotice` / `Closure` / `Observation` tables. They're all ContextItems with different `kind`s.

## FlowBand resolution

Bands are indexed by `(sectionId, craftType, commercial, skillLevel)`. Multiple rows per tuple are fine. Resolver picks:

1. Exact `(craft, skill)` match (most specific)
2. `(craft, any skill)` match
3. `(any craft, skill)` match
4. Legacy `flowLow/flowRunnable/...` Ints on `RiverSection` (fallback)

When the fallback fires, surface "showing generic bands — craft-specific bands not yet curated" in the UI. This makes coverage gaps visible.

Don't add additional resolution dimensions (e.g., "commercial vs private") as fields on `FlowBand` if `commercial: bool` already covers it. Add them as discriminator fields, not as new resolver branches.

## Migration discipline

When a field's semantics change:

1. Add the new field/table; keep the old one
2. Backfill new from old
3. Switch readers to new (with fallback to old)
4. After one full season of dual-running, remove the old

Never delete a field in the same slice that adds its replacement. Migration is incremental.

## What NOT to model

- **Don't model UI state** in the database. Selected craft, sparkline range, etc. live in localStorage or URL.
- **Don't model per-user preferences** until users exist beyond admin (phase 2+).
- **Don't model "events" generically** when a specific table exists. Use `DamRelease` for dam releases, not `Event { kind: "release" }`.
- **Don't model derived metrics** that can be computed from a single SQL/scan (current trend, change24h). Cache them in snapshot tables if they're hot (`GaugeSnapshot`), but don't make them the canonical source.

## When to add a new table

Ask:
1. **Is there a query I'll run often that requires this table?** If only one slice ever uses it, maybe it's a JSON blob on an existing row.
2. **Does this concept have a stable identity?** (Slug, primary key, multiple references.) If not, it's probably a field, not a table.
3. **Will it need its own indexes?** If yes, it's a table.
4. **Is it time-series?** If yes, see the time-series pattern above.

If you're not sure, default to a field on an existing table or a JSON blob. Pulling something into its own table later is easy. Removing a half-used table is annoying.

## Community-contributed entities: versioned and attributed

Every fact contributed by the community has provenance. That means:

- **Who** submitted it (contributor account ID)
- **When** it was submitted (timestamp)
- **Under which bounty** it was submitted, if any (nullable `bountyId`)
- **Verification state** — one of `pending | verified | disputed | rejected`
- **Verification audit trail** — who verified/flagged/rejected, and when

These fields are not optional metadata. They are load-bearing. Payout logic, reputation scoring, trust-weighted acceptance, and community flag resolution all depend on them.

The pattern: every community-contributed entity has a `ContributionMeta` shape embedded (either as fields or as a joined `Contribution` row). Government-seeded data carries `source: "government"` and a `sourceUrl`; community data carries `source: "community"` and a contributor reference. The two co-exist in the same tables — the distinction is in provenance fields, not in separate tables.

Don't strip provenance fields when displaying data. Surface them. "Submitted by [contributor] on [date] · 4 verifications" is part of the product, not an internal audit log.

## Pre-seeded vs contributed: the provenance distinction

The data model has two classes of facts:

1. **Government-seeded**: sourced from USGS, CDSS, BOR, NWS, or similar agencies. Ingested by the platform, updated programmatically. Source URL and agency are the provenance. Authoritative by construction.
2. **Community-contributed**: submitted by a contributor, verified by community review. Bounty-linked or voluntary. Subject to dispute and revision.

Both live in the same tables. Both are first-class. Neither overwrites the other silently — if a contributor disputes a government-seeded access point location, that's a flag on the government record, not a silent replacement.

A river section might have a government-seeded gauge reading and a community-contributed photo at that flow, linked by `(sectionId, flowCfs)`. They're different entity kinds, but their provenance metadata is consistent.

## Multi-domain entity shape

The current hierarchy (Watershed → RiverCorridor → RiverSection → Rapid) is river-specific. The platform will eventually cover dams, snowpack, and avalanche. Build the community layer with that generalization in mind.

The repeating pattern across domains:

```
SpatialEntity         (RiverSection, Reservoir, SnowpackBasin, AvalanchePath)
   └── Readings       (GaugeReading, DamRelease, SnowpackReading, AvalancheObservation)
   └── Contributions  (AccessPoint, Photo, RapidDoc, CampsiteListing, OutfitterListing)
   └── Bounties       (Bounty → attaches to a SpatialEntity)
   └── ContextItems   (structured editorial/agency extractions — already domain-agnostic)
```

When the dam domain ships, it should reuse `ContextItem`, `Bounty`, and `Contribution` mechanics wholesale. It adds domain-specific spatial entities and reading types; it does not add a new contribution or bounty system.

Design new community tables to be domain-agnostic where possible. A `Photo` entity with `(entityKind, entityId, flowCfs, takenAt, contributorId)` works for a river section photo and a dam photo. Don't bake "river" into the table name.

## International / global coverage via WorldRiver

The `WorldRiver` table is a global river reference library — every major river on earth, with basic geometry and metadata. It is not the same as a `RiverSection`; it's a coarser reference record.

`WorldRiver` is the seed for out-of-US coverage. A non-US river can exist as a `WorldRiver` stub before any contributor work has been done. From that stub, a funder can post a bounty ("document access points and flow characteristics for the Futaleufú"). A contributor can claim it, creating `RiverSection` records linked back to the `WorldRiver` parent.

This means the platform can show "this river exists, it has a funded bounty, here's what we know from its WorldRiver record" long before a contributor has touched it. Coverage starts at "known to exist" and grows to "fully documented" via the bounty economy.

International coverage follows the same data model as domestic coverage. There is no "international mode" — just `RiverSection` records that happen to be outside the US, with government data sources that differ by country.

