---
slice: 03-forecast-snapshot-infra
status: active
value: 8
confidence: 9
effort: M
depends_on: []
unlocks: [05-history-forecast-chart, 10-admin-editorial-ui]
opened: 2026-05-13
closed: null
---

# Slice 03 — Forecast input snapshots + reconciliation infrastructure

## Goal

Every forecast captures its inputs at predict time. A daily reconciliation job compares forecast vs observed flow and writes accuracy rows. No user-facing UI yet — this is the substrate for self-improvement (vision: [self-improving-system.md](../../vision/self-improving-system.md)).

## Acceptance criteria

1. Every `ForecastRun` creation writes a paired `ForecastInput` row with the full feature snapshot
2. A nightly job builds `DailyGaugeRollup` rows from `GaugeReading`
3. A `ForecastReconciler` resource ticks hourly; for every `ForecastOutput` whose `date <= today` and which lacks a `ForecastAccuracy` row, computes accuracy and writes it
4. `ForecastAccuracy` rows are queryable by `(sectionId, modelVersion, horizonDays)`
5. Tests cover: input snapshot capture, daily rollup correctness, reconciliation logic

## Schema additions

```graphql
# schemas/forecast-input.graphql
type ForecastInput @table @export {
  id: ID @primaryKey             # = forecastRunId
  forecastRunId: ID @indexed
  forecastRun: ForecastRun @relationship(from: "forecastRunId")
  sectionId: ID @indexed
  capturedAt: String @indexed
  currentFlow: Float
  flowChange24h: Float
  flowChange7d: Float
  upstreamGaugesJson: String
  snowpackJson: String
  reservoirsJson: String
  weatherForecastJson: String
  contextItemIds: String          # CSV
  dayOfYear: Int
  driverAtTime: String
  modelVersion: String
  heuristicWeightsJson: String
}

# Append to schemas/forecast.graphql
type ForecastAccuracy @table @export {
  id: ID @primaryKey              # = forecastOutputId
  forecastOutputId: ID @indexed
  forecastOutput: ForecastOutput @relationship(from: "forecastOutputId")
  forecastRunId: ID @indexed
  sectionId: ID @indexed
  forecastDate: String @indexed
  horizonDays: Int @indexed
  predictedExpected: Float
  predictedMin: Float
  predictedMax: Float
  observedFlow: Float
  errorCfs: Float
  errorPct: Float
  withinRange: Boolean
  directionCorrect: Boolean
  modelVersion: String @indexed
  reconciledAt: String
}

# schemas/gauge.graphql — append
type DailyGaugeRollup @table @export {
  id: ID @primaryKey              # gaugeId_YYYY-MM-DD
  gaugeId: ID @indexed
  date: String @indexed
  meanCfs: Float
  minCfs: Float
  maxCfs: Float
  sampleCount: Int
}
```

## Files to create

- `schemas/forecast-input.graphql`
- `resources/ForecastReconciler.ts` — hourly tick; uses `setInterval` + `globalThis` flag pattern from `Ingestion.ts`
- `lib/forecast/snapshot.ts` — `captureInputs(sectionId, dataPackage)` helper
- `lib/jobs/daily-rollup.ts` — nightly rollup builder
- `test/forecast-snapshot.test.js`, `test/forecast-reconciler.test.js`, `test/daily-rollup.test.js`

## Files to modify

- `schemas/forecast.graphql` — append `ForecastAccuracy`
- `schemas/gauge.graphql` — append `DailyGaugeRollup`
- `resources/ForecastPipeline.ts` — after `tables.ForecastRun.put(...)`, call `captureInputs()` to write the paired `ForecastInput` row
- `resources/Ingestion.ts` — register the daily rollup job in the worker tick

## Reconciliation logic

For each `ForecastOutput` where `date <= today` AND no `ForecastAccuracy` exists:

1. Look up the section's `primaryGaugeId`
2. Query `DailyGaugeRollup` for `(primaryGaugeId, date=output.date)`
3. If found: `observedFlow = rollup.meanCfs`
4. Compute:
   - `errorCfs = predictedExpected - observedFlow`
   - `errorPct = errorCfs / observedFlow`
   - `withinRange = observedFlow >= predictedMin AND observedFlow <= predictedMax`
   - `directionCorrect`: compute by looking at the day-before rollup; predicted direction vs observed direction (rising/falling/flat)
   - `horizonDays = (forecastDate - runCreatedAt) / 86400`
5. Write `ForecastAccuracy` row

If `DailyGaugeRollup` for that date doesn't exist (the rollup job hasn't caught up): skip; will be picked up on the next tick.

## Daily rollup logic

Nightly (00:30 UTC):

1. For each gauge: find the latest `DailyGaugeRollup.date`; build rollups for every date since then up to yesterday
2. Each rollup: aggregate all `GaugeReading` rows for `(gaugeId, day)` into `meanCfs / minCfs / maxCfs / sampleCount`
3. Upsert with composite ID `gaugeId_YYYY-MM-DD`

This becomes the backtesting substrate too (phase 2).

## Verification

1. `npm test` — new tests pass
2. Trigger a forecast run for Browns Canyon (`POST /ForecastPipeline { sectionId: "arkansas-browns-canyon" }`)
3. Confirm a `ForecastInput` row exists matching the run's ID
4. Wait 24 hours (or fake the clock in test by manually creating outputs with `date < today`)
5. Trigger the reconciler (`POST /ForecastReconciler { action: "run-now" }`)
6. Confirm `ForecastAccuracy` rows appear for outputs whose date has passed
7. Hit `GET /ForecastAccuracy/?sectionId=arkansas-browns-canyon&modelVersion=stub-v1` — sorted accuracy rows returned

## Out of scope (deferred)

- Per-section heuristic tuning (`SectionHeuristic` table — phase 2)
- Backtesting (phase 2)
- Historical analog lookup (phase 2)
- Admin UI dashboard for accuracy (slice 10)
- New forecaster (slice 04 ships the driver-conditioned heuristic; this slice just adds the substrate)

## Critical references

- Existing forecast pipeline: [resources/ForecastPipeline.ts](../../resources/ForecastPipeline.ts) — `buildDataPackage()` already assembles the inputs; we just need to persist them
- Existing ingestion pattern: [resources/Ingestion.ts](../../resources/Ingestion.ts) — `setInterval` + `globalThis` guard
- Vision: [vision/forecasting-philosophy.md](../../vision/forecasting-philosophy.md) — principle #2 (capture inputs before chasing accuracy)
- Vision: [vision/self-improving-system.md](../../vision/self-improving-system.md) — the loop diagram
