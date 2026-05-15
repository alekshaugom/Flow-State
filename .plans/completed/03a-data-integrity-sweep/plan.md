---
slice: 03a-data-integrity-sweep
status: done
value: 9
confidence: 9
effort: S
depends_on: []
unlocks: [03b-forecast-snapshot-infra, 04-driver-conditioned-forecaster]
opened: 2026-05-14
closed: 2026-05-14
---

# Slice 03a — Data integrity sweep

## Goal

Every input source the forecaster will rely on actually lands real data into the right table, keyed by the IDs downstream consumers query. Plus wire up the NWS weather pipeline that was previously bundled into slice 04.

This is the precondition for slice 03b (snapshot infrastructure) — without it, captured snapshots would be mostly empty.

## Why this exists

Live audit of the running dev server on 2026-05-15 revealed three broken/missing inputs:

- **BOR dam releases**: response is an object with numbered string keys (`{"0":{...},"1":{...}}`), but [lib/adapters/bor.ts](../../lib/adapters/bor.ts) does `if (Array.isArray(data))` → false → zero records ever written. Additionally, `itemId=512` (catalog claims "blue-mesa outflow") returned **Lake Powell Glen Canyon Dam** data — the entire `BOR_CATALOG` mapping needs re-verification.
- **SNOTEL snowpack**: [lib/adapters/snotel.ts:43](../../lib/adapters/snotel.ts) writes `basinId = stationTriplet.replace(/:/g,'-')` (e.g., `369-CO-SNTL`), but [resources/RiverDetail.ts](../../resources/RiverDetail.ts) queries by logical basin name (e.g., `arkansas-headwaters`). Rows may exist but are unreachable.
- **NOAA weather**: adapter [lib/adapters/noaa.ts](../../lib/adapters/noaa.ts) has `fetchWeatherForecast()` written but never imported or called. No table, no ingestion.

USGS gauges (and presumably CDSS) work — `GET /RiverDetail/arkansas-numbers` returned `flow.current=346 cfs` with a fresh timestamp.

## Acceptance criteria

1. `GET /RiverDetail/arkansas-numbers` returns non-empty `snowpack[0].latest` (Arkansas Headwaters basin SWE / depth / precip from at least one station)
2. Same response returns non-empty `reservoirs[0].latest` for `twin-lakes` and `turquoise-lake`, with `outflowCfs` from a **correctly-mapped** BOR RISE timeseries (sanity-check: outflow values are not Lake Powell scale)
3. `WeatherForecast` table populated for every section with `latitude`/`longitude`; each row has `tempHighF`, `tempLowF`, `precipProb`, `precipIn` for one of the next 7 days
4. `GET /DataHealth` returns per-source freshness so future regressions are visible from a single endpoint
5. Tests cover (a) BOR response-shape parsing on numbered-key objects, (b) SNOTEL basin keying, (c) weather-agent gridpoint + forecast assembly

## Schema additions

```graphql
# schemas/weather.graphql (NEW)
type WeatherForecast @table @export {
  id: ID @primaryKey            # sectionId_YYYY-MM-DD
  sectionId: ID @indexed
  date: String @indexed
  tempHighF: Float
  tempLowF: Float
  sky: String
  precipProb: Float
  precipIn: Float
  snowOrRain: String
  windMph: Float
  capturedAt: String
}

# schemas/river.graphql — append to RiverSection
weatherGridId: String   # cached NWS gridId|gridX|gridY to avoid repeated /points lookups
```

## Files to fix

- [lib/adapters/bor.ts](../../lib/adapters/bor.ts):
  - Replace `Array.isArray(data)` check at line 86 with iteration over numbered string keys (`Object.entries(data).filter(([k]) => /^\d+$/.test(k))`)
  - Re-verify every `BOR_CATALOG[*].timeseriesIds.{storage,elevation,inflow,outflow}` against current BOR RISE catalog
  - Method: hit `https://data.usbr.gov/rise/api/catalog-item/{itemId}` for each id; assert returned `attributes.locationName` (or download-endpoint `Location.Name`) matches intended reservoir
- [lib/adapters/snotel.ts](../../lib/adapters/snotel.ts):
  - Push the logical basin id down into `fetchBasinSnowData(basinId, triplets)` and stamp every record with it
  - Update [resources/Ingestion.ts](../../resources/Ingestion.ts) caller to pass the basin key

## Files to create

- `schemas/weather.graphql` — see above
- `lib/agents/weather-agent.ts` — wraps NOAA adapter. Per section with lat/lng: hit `/points/{lat},{lon}` → cache `gridId/gridX/gridY` on section row; fetch `/gridpoints/{gridId}/{gridX},{gridY}/forecast` → 7-day daily forecast; combine day+night NWS periods into one daily record; upsert `WeatherForecast` row with `sectionId_YYYY-MM-DD` id
- `resources/DataHealth.ts` — custom Resource (class name distinct from any `@table @export` per **L005**); returns `{ usgs: {lastReading, age}, cdss: {…}, snotel: {…}, bor: {…}, noaa: {…} }`
- `test/bor-adapter.test.js` — fixture-based: feeds the real BOR object-shape response, asserts ≥1 record parses out
- `test/snotel-adapter.test.js` — asserts records are keyed by logical basin id, not station triplet
- `test/weather-agent.test.js` — synthetic NWS forecast input, asserts 7 daily rows produced with correct shape

## Files to modify

- [resources/Ingestion.ts](../../resources/Ingestion.ts):
  - Add `WEATHER_INTERVAL_MS = 6 * 3600_000` + `lastWeatherFetch` tracker (pattern from existing `lastGaugeFetch` at lines 15–17, 221–232)
  - Call `weather-agent` in tick when interval elapsed
  - Update SNOTEL caller to pass basin key
- [resources/ForecastPipeline.ts](../../resources/ForecastPipeline.ts):
  - Extend `buildDataPackage()` (lines 15–111) to include `weatherForecast: [...]` for the next 7 days at the section's location

## NWS pipeline flow

For each `RiverSection` with `latitude/longitude`:
1. If `weatherGridId` is null, hit `https://api.weather.gov/points/{lat},{lon}` → `properties.gridId|gridX|gridY` → patch section row with `weatherGridId = "{gridId}|{gridX}|{gridY}"`
2. Hit `https://api.weather.gov/gridpoints/{gridId}/{gridX},{gridY}/forecast` → 12-hour periods
3. Combine day+night periods into one daily record (`tempHighF` from day period, `tempLowF` from night)
4. Upsert `WeatherForecast` with id `compositeId([sectionId, date])`

NWS rate limit: keep fetches sequential with a small delay between sections (~25 sections × ~1s each is fine).

## Lessons to absorb

- **[L003](../../lessons/L003-harper-resource-post-signature.md)** — `DataHealth.post(data?: any)` if it supports manual trigger
- **[L004](../../lessons/L004-harper-static-import-and-search-after-restart.md)** — `import { tables } from 'harper'` at module top
- **[L005](../../lessons/L005-harper-resource-class-name-collisions.md)** — `DataHealth` class name doesn't collide with any `@table @export` type (verified — none exists)

After this slice, write **L006** on third-party API response-shape verification: BOR returns numbered-key objects, not arrays; SNOTEL station triplets ≠ basin IDs. Pattern: every new adapter needs a real-response fixture test.

## Verification

1. `npm test` — adapter + weather-agent tests pass
2. Start dev server, trigger `POST /Ingestion {"action":"run"}` (or wait one tick)
3. `curl http://localhost:9926/DataHealth` — every source shows `lastReading` with sensible recency
4. `curl http://localhost:9926/RiverDetail/arkansas-numbers` — `snowpack[0].latest.sweInches != null`, `reservoirs[0].latest.outflowCfs != null` (and value is reasonable Twin Lakes scale, not Lake Powell scale)
5. `curl 'http://localhost:9926/WeatherForecast/?sectionId=arkansas-numbers&sort(+date)'` — 7 daily rows for upcoming week
6. Spot-check Pueblo + McPhee + Green Mountain reservoirs (different basins) for sanity on BOR catalog re-mapping

## Out of scope

- `ForecastInput` / `ForecastAccuracy` / `DailyGaugeRollup` substrate → **slice 03b**
- Driver-conditioned heuristic forecaster → **slice 04**
- Open-Meteo as secondary weather source → phase 2
- Historical weather backfill → phase 2
- `swePercentMedian` real computation (currently hardcoded `null` in SNOTEL adapter) → ok to leave for slice 04 unless trivial to add here

## Critical references

- Ingestion worker pattern: [resources/Ingestion.ts:218–249](../../resources/Ingestion.ts)
- NWS API docs: https://www.weather.gov/documentation/services-web-api
- BOR RISE API: https://data.usbr.gov/rise/api/result/download (numbered-key object response — surprise!)
- AWDB / SNOTEL: https://wcc.sc.egov.usda.gov/awdbRestApi
- Vision: [vision/forecasting-philosophy.md](../../vision/forecasting-philosophy.md) — principle #2 (capture inputs before chasing accuracy)
