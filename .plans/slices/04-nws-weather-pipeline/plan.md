---
slice: 04-nws-weather-pipeline
status: queued
value: 8
confidence: 9
effort: M
depends_on: []
unlocks: [05-history-forecast-chart, 07-drivers-and-context-ui]
opened: 2026-05-13
closed: null
---

# Slice 04 — NWS weather pipeline + driver-conditioned forecaster

## Goal

For every river section, capture a per-day NWS forecast into `WeatherForecast`. Upgrade the forecast pipeline from a generic linear/seasonal stub to a driver-conditioned heuristic that uses snowpack + weather + dam releases per section's `driver` field.

## Acceptance criteria

1. `WeatherForecast` table populated nightly for every section with a `latitude/longitude`
2. Each row has `tempHighF / tempLowF / sky / precipProb / precipIn / snowOrRain / windMph` for one day
3. `ForecastPipeline.buildDataPackage()` includes 7 days of `WeatherForecast` for the section
4. The forecaster branches on `RiverSection.driver`:
   - snowmelt: SWE % median + temperature forecast + seasonal curve
   - dam-fed: latest `DamRelease.outflowCfs` + ContextItem overrides
   - rain-driven: precip probability + 72h accumulated precip
   - mixed: blend
5. Tests cover each driver branch with synthetic inputs
6. `ForecastOutput.assumptions` includes a 1-sentence plain-language explanation of which inputs drove the prediction

## Files to create

- `schemas/weather.graphql` — `WeatherForecast` table
- `lib/agents/weather-agent.ts` — wraps `lib/adapters/noaa.ts`
- `lib/forecast/heuristics.ts` — driver-conditioned weight tables + global rules
- `lib/forecast/driver-snowmelt.ts`, `driver-damfed.ts`, `driver-rain.ts`, `driver-mixed.ts`
- `test/weather-agent.test.js`, `test/heuristic-forecaster.test.js`

## Files to modify

- `lib/adapters/noaa.ts` — implement (or extend) `fetchWeatherForecast(lat, lng)` to hit `/points/{lat},{lon}` → `/forecast` and return parsed daily data
- `resources/Ingestion.ts` — register weather-agent in worker tick (6h interval)
- `resources/ForecastPipeline.ts` — replace `generateStubForecast()` with `generateHeuristicForecast()` that switches on `section.driver` and uses the new helpers
- `schemas/river.graphql` — `RiverSection` may need `weatherGridId: String` to cache the NWS gridpoint per section (avoids repeated `/points` lookups)
- `schemas/gauge.graphql` — no changes

## NWS pipeline flow

For each `RiverSection` with `latitude/longitude`:

1. If `weatherGridId` is null on the section, hit `https://api.weather.gov/points/{lat},{lon}` → returns `properties.forecast` URL + `gridId/gridX/gridY` — cache `gridId` on the Section row
2. Fetch the forecast URL → 7-day daily forecast
3. Parse each period into a day-shaped record (NWS gives 12-hour periods; combine day + night into one daily row)
4. Upsert `WeatherForecast` row with composite ID `sectionId_YYYY-MM-DD`

Rate limit awareness: NWS API has soft limits; spread the ~25 section fetches across a few minutes.

## Driver-conditioned forecaster sketch

```ts
// lib/forecast/heuristics.ts
export function generateHeuristicForecast(
  sectionId: string,
  dataPackage: DataPackage,
): ForecastOutput[] {
  const section = dataPackage.section;
  switch (section.driver) {
    case 'snowmelt':
      return forecastSnowmelt(dataPackage);
    case 'dam-fed':
      return forecastDamFed(dataPackage);
    case 'rain-driven':
      return forecastRainDriven(dataPackage);
    case 'mixed':
    default:
      return forecastMixed(dataPackage);
  }
}

// lib/forecast/driver-snowmelt.ts
export function forecastSnowmelt(dataPackage: DataPackage): ForecastOutput[] {
  // Inputs that matter:
  //   - current flow + trend
  //   - SWE % median from snowpack readings
  //   - 7-day NWS temp forecast (highs drive melt; overnight lows below freezing slow it)
  //   - day-of-year × seasonal curve
  //
  // Heuristic v1:
  //   baseDelta = sum_over_7_days(meltCoefficient * (tempHigh - meltThreshold))
  //              * (sweContribution = swePctMedian/100)
  //   each future day: previousFlow + (baseDelta * day-of-year-factor)
  //
  // Confidence: decays from 0.85 day 1 → 0.5 day 7
  // Assumptions string: "Snowmelt-driven. Warm afternoons (avg 64°F) and SWE at 105% median suggest continued rise through Wed; cooler weekend slows melt."
}
```

Heuristic constants live in `lib/forecast/heuristics.ts` as a typed object:

```ts
export const GLOBAL_HEURISTICS = {
  snowmelt: {
    meltThresholdF: 32,
    meltCoefficient: 0.012,  // cfs gain per (degree-F-above-threshold * SWE%)
    confidenceDecay: 0.05,    // per day
  },
  // ...
};
```

Updates to these constants get a lesson if they were tuned to fix an observed miss.

## Verification

1. `npm test` — new tests pass
2. Trigger weather ingestion: `POST /Ingestion { action: "fetch-weather" }`
3. Confirm `WeatherForecast` rows exist for every section (or every section with lat/lng)
4. Trigger a forecast for Browns Canyon — confirm `ForecastInput.weatherForecastJson` is non-empty
5. Inspect `ForecastOutput.assumptions` for Browns — should reference snowmelt + temperature, not generic seasonal noise
6. Manually classify a dam-fed section (e.g., `arkansas-bighorn-sheep` with Pueblo influence — actually that's a downstream flow; pick `dolores-slick-rock` which is McPhee-fed). Trigger forecast — confirm assumptions reference dam release, not snowmelt
7. Hit `GET /WeatherForecast/?sectionId=arkansas-browns-canyon&sort(+date)` — daily forecasts sorted by date

## Out of scope (deferred)

- Open-Meteo as a secondary source (phase 2)
- Historical weather backfill (phase 2)
- Map overlay (slice 06 — toggle visibility only)
- Weather strip UI in chart (slice 05 — uses this data)
- Per-section heuristic tuning (phase 2)
- LLM-assisted forecasting (phase 3)

## Critical references

- Existing NOAA adapter: [lib/adapters/noaa.ts](../../lib/adapters/noaa.ts)
- Existing forecast pipeline: [resources/ForecastPipeline.ts](../../resources/ForecastPipeline.ts)
- NWS API docs: https://www.weather.gov/documentation/services-web-api
- Vision: [vision/forecasting-philosophy.md](../../vision/forecasting-philosophy.md)
