---
slice: 03c-historical-backfill
status: done
value: 8
confidence: 8
effort: M
depends_on: []
unlocks: [03b-forecast-snapshot-infra, 04-driver-conditioned-forecaster]
opened: 2026-05-15
closed: 2026-05-15
---

# Slice 03c — Historical data backfill (Apr 2025 → today)

## Goal

The project started 2026-05-12 with no historical data. Slice 04's driver-conditioned forecaster needs ~13 months of flow + snowpack + weather + dam-release history to compute real baselines (`swePercentMedian`, day-of-year curves, eventually historical analogs). This slice backfills that history from each source's archive API and adds a `WeatherObservation` schema for actual (not forecast) weather. No user-facing UI — substrate for slice 04 and Phase 2 backtesting.

## Acceptance criteria

1. `GaugeReading` rows exist for every active USGS gauge from 2025-04-01 → today (daily resolution from `fetchDaily`)
2. `SnowpackReading` rows exist for every basin in `COLORADO_BASINS` from 2025-04-01 → today
3. `DamRelease` rows exist for every reservoir in `BOR_CATALOG` from 2025-04-01 → today
4. `WeatherObservation` table exists; rows populated for every section with lat/lng from 2025-04-01 → today
5. `POST /Ingestion { action: "backfill", days: 410, sources: [...] }` runs the full backfill; idempotent (re-runs do not duplicate rows)
6. Tests cover: each new adapter's range mode, the orchestrator, and idempotency
7. After backfill, slice 03b's `DailyGaugeRollup` builder produces ~400 rollups per gauge instead of ~3

## Schema additions

```graphql
# schemas/weather.graphql — append
type WeatherObservation @table @export {
  id: ID @primaryKey              # sectionId_YYYY-MM-DD
  sectionId: ID @indexed
  section: RiverSection @relationship(from: "sectionId")
  date: String @indexed
  tempHighF: Float
  tempLowF: Float
  precipIn: Float
  precipSnowIn: Float
  windMph: Float
  weatherCode: Int
  source: String                  # 'open-meteo-archive'
  capturedAt: String
}
```

Composite ID `sectionId_YYYY-MM-DD` matches the project's pattern (e.g. `DailyGaugeRollup` in slice 03b) and guarantees idempotent upserts.

## Files to create

- `lib/adapters/open-meteo-archive.ts` — `fetchArchiveDaily(lat, lon, startDate, endDate)` against `https://archive-api.open-meteo.com/v1/archive`. Returns the same daily shape as the forecast adapter so the orchestrator can treat both uniformly.
- `lib/jobs/backfill.ts` — orchestrator: takes `{ days, sources }`, walks gauges/basins/reservoirs/sections, calls each adapter with proper date range, upserts via `tables.X.put(id, ...)` (idempotent), throttles between requests, logs progress to `IngestionLog`.
- `test/backfill-snotel.test.js`, `test/backfill-bor.test.js`, `test/backfill-weather-obs.test.js`, `test/backfill-orchestrator.test.js`

## Files to modify

- `schemas/weather.graphql` — append `WeatherObservation`
- `lib/adapters/snotel.ts` — add `fetchBasinSnowDataRange(key, triplets, startDate, endDate)`; current `fetchBasinSnowData` becomes a thin "last 7d" caller
- `lib/adapters/bor.ts` — add `fetchReservoirDataRange(key, startDate, endDate)`; current `fetchReservoirData(key)` becomes a thin caller
- `resources/Ingestion.ts` — replace the current narrow `backfill(days)` (USGS-only, lines 215-236) with a dispatcher that calls `lib/jobs/backfill.ts`. Preserve the existing `POST /Ingestion { action: "backfill", days }` contract but extend with optional `sources: ["usgs","snotel","bor","weather-obs"]` (default: all).

## Backfill behavior

- **Idempotent:** every adapter writes via `put(id, row)` where `id` is a composite of `(stationId|sectionId, date)`. Re-running a backfill overwrites with same data.
- **Throttled:** 2s between station/section requests (matches existing pattern at [resources/Ingestion.ts:232](../../resources/Ingestion.ts)). At ~25 gauges + 5 basins + 5 reservoirs + 25 sections ≈ 60 batched requests × 2s ≈ 2 minutes total for a 13-month pull.
- **Resumable:** if a request fails, completed rows stay; re-run picks up where it left off. Log per-source progress to `IngestionLog`.
- **Triggered manually:** `POST /Ingestion { action: "backfill", days: 410, sources: ["usgs","snotel","bor","weather-obs"] }`. No automatic execution on startup.

## Verification

1. `npm test` — new tests pass (mocked fetches for archive + extended snotel/bor adapters; idempotency test on orchestrator)
2. `POST /Ingestion { action: "backfill", days: 410 }` — runs to completion in <5 min
3. `GET /GaugeReading/?sort(+timestamp)&limit(1)` — earliest timestamp ≤ 2025-04-02
4. `GET /SnowpackReading/?sort(+timestamp)&limit(1)` — earliest timestamp ≤ 2025-04-02
5. `GET /DamRelease/?sort(+timestamp)&limit(1)` — earliest timestamp ≤ 2025-04-02 for the 5 catalog reservoirs
6. `GET /WeatherObservation/?sort(+date)&limit(1)` — earliest date ≤ 2025-04-02
7. Browns Canyon: query `GaugeReading` count for 2025-04-01 → 2026-05-15 — should be ~400 daily rows
8. Spot-check a known weather event (e.g., a snowstorm last winter) in `WeatherObservation` against a public source — confirms parser correctness (lesson L006)
9. Re-run backfill → row counts unchanged (idempotency)
10. Trigger slice 03b's reconciler — confirm `DailyGaugeRollup` now builds rollups for all backfilled days

## Out of scope (deferred)

- LLM-ingested `ContextItem` events / "internet anomaly agent" → slice 09
- `ContextItem` schema in general → slice 07
- `WeatherObservation` UI on charts → slice 05 will consume the data
- Sub-daily backfill (instantaneous-resolution flow history) → not needed for forecaster v1
- Backtesting harness → Phase 2 in vision
- Per-section heuristic tuning → Phase 2

## Critical references

- USGS daily adapter already supports date ranges: [lib/adapters/usgs.ts:88](../../lib/adapters/usgs.ts) `fetchDaily(siteIds, startDate, endDate)`
- Existing narrow backfill action pattern: [resources/Ingestion.ts:215-236](../../resources/Ingestion.ts) — 2s throttle, putById idempotency
- Open-Meteo forecast adapter (shape to mirror for archive): [lib/adapters/open-meteo.ts](../../lib/adapters/open-meteo.ts)
- Lesson [L006](../../lessons/L006-third-party-api-response-shape-verification.md) — verify Open-Meteo Archive response shape against a real fetch *before* writing the parser; this was the SNOTEL/BOR failure mode in 03a
- Vision: [vision/self-improving-system.md](../../vision/self-improving-system.md) — "Adjacent: backtesting" and "Adjacent: historical analogs" both depend on this substrate
