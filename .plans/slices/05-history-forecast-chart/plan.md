---
slice: 05-history-forecast-chart
status: queued
value: 9
confidence: 7
effort: M
depends_on: [03-forecast-snapshot-infra, 04-nws-weather-pipeline]
unlocks: []
opened: 2026-05-13
closed: null
---

# Slice 05 — History + forecast chart with weather strip

## Goal

One continuous chart per section showing past + present + forecast, with a weather strip aligned to the forecast x-range, and a band-crossing interpretation in plain language.

## Acceptance criteria

1. `DesktopFlowChart` renders history (solid line, 2.5px) and forecast (dashed line, 2px) in a single x-axis
2. Vertical "now" marker between history and forecast
3. Confidence ribbon (translucent polygon between forecast min/max) fades with horizon
4. Ideal band shading extends across the full x-range
5. Hover tooltip shows "Forecast" badge in the forecast region with per-day weather
6. `WeatherStrip` below the chart, 14 cells max, aligned to forecast days
7. Band-crossing interpretation: 2–3 plain-language bullets ("Crosses into Ideal Tue afternoon")
8. Range picker extended: `(history: 7/30/90/180/365) × (forecast: 7/14)`
9. Mobile parity via `MobileFlowChart` with the same composition

## Approach (light)

- Extend `app/src/desktop/DesktopFlowChart.tsx` to accept `forecast` prop and render dashed line + confidence ribbon
- New `app/src/components/WeatherStrip.tsx` — horizontal cells, each ~56×72px
- New `app/src/lib/forecastInterpretation.ts` — walks `forecast` rows day-by-day, finds band-name transitions for the selected `(craft, skill)`, returns 2–3 bullet strings
- New `app/src/components/ForecastBullets.tsx` — renders the bullets, lives next to or below the chart
- `resources/RiverDetail.ts` returns `forecast` (from `ForecastOutput`) + `weatherForecast` (from `WeatherForecast`) aligned to the same date keys

## Open questions to resolve when active

- Where exactly does the weather strip sit — above the chart, below, or as a 14-cell strip aligned to forecast x positions? Recommend: below, aligned to forecast x.
- How does the band shading behave when the selected craft/skill has no FlowBands for that section? Recommend: fall back to legacy thresholds and dim the shading to signal "generic bands."
- Hourly forecast or daily? Recommend: daily for the chart, hourly available in tooltip if the user hovers a forecast day.

## Critical references

- Custom SVG chart: [app/src/desktop/DesktopFlowChart.tsx](../../app/src/desktop/DesktopFlowChart.tsx)
- Existing forecast band UI: [app/src/components/ForecastBand.tsx](../../app/src/components/ForecastBand.tsx) — can borrow patterns
- Vision: [vision/ux-direction.md](../../vision/ux-direction.md) — chart UX section
