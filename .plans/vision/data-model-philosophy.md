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
