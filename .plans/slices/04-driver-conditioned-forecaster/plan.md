---
slice: 04-driver-conditioned-forecaster
status: queued
value: 8
confidence: 9
effort: M
depends_on: [03a-data-integrity-sweep, 03b-forecast-snapshot-infra]
unlocks: [05-history-forecast-chart, 07-drivers-and-context-ui]
opened: 2026-05-13
closed: null
---

# Slice 04 — Driver-conditioned forecaster

> **Note (2026-05-14):** The NWS weather pipeline portion of this slice was promoted into slice 03a after the data-integrity audit revealed weather was never wired up. Slice 04 now focuses purely on the driver-conditioned heuristic forecaster, which assumes `WeatherForecast` rows already exist (from 03a) and snapshot infrastructure is in place (from 03b).

## Goal

Upgrade the forecast pipeline from the generic linear/seasonal stub to a driver-conditioned heuristic that uses snowpack + weather + dam releases per section's `driver` field. Plain-language assumptions explain which inputs drove each prediction.

## Acceptance criteria

1. The forecaster branches on `RiverSection.driver`:
   - snowmelt: SWE % median + temperature forecast + seasonal curve
   - dam-fed (`reservoir-release`): latest `DamRelease.outflowCfs` + ContextItem overrides (when slice 07 ships)
   - rain-driven: precip probability + 72h accumulated precip
   - mixed: blend
2. Tests cover each driver branch with synthetic inputs
3. `ForecastOutput.assumptions` includes a 1-sentence plain-language explanation of which inputs drove the prediction
4. `ForecastInput.heuristicWeightsJson` is populated with the actual weight values used (from slice 03b's snapshot infrastructure)

## Files to create

- `lib/forecast/heuristics.ts` — driver-conditioned weight tables + global rules
- `lib/forecast/driver-snowmelt.ts`, `driver-damfed.ts`, `driver-rain.ts`, `driver-mixed.ts`
- `test/heuristic-forecaster.test.js`

## Files to modify

- `resources/ForecastPipeline.ts` — replace `generateStubForecast()` with `generateHeuristicForecast()` that switches on `section.driver` and uses the new helpers

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
