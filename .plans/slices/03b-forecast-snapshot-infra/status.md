# Status — 03b forecast-snapshot-infra

## 2026-05-15
- Promoted from queued → active after 03c (historical-backfill) shipped
- Substrate ready: 38,799 historical rows now in the DB across flow / snowpack / weather observations / dam releases (2025-03-31 → 2026-05-15)
- Impact on this slice's plan: the `DailyGaugeRollup` builder can backfill ~400 rollups per gauge on its first tick instead of accumulating 1/day. Forecast accuracy data won't be empty — reconciliation can run retroactively against any backfilled `ForecastOutput` (none exist yet, so this is future-relevant for backtesting in Phase 2).
- New input available for `ForecastInput.snowpackJson`: `swePercentMedian` is now populated on `SnowpackReading` rows (was always null pre-03c). Capture this in the snapshot.
- Plan unchanged otherwise — proceeding with the original acceptance criteria

## 2026-05-18
- Dequeued from active. User direction: ship river-log series (12 → 12b → 12c) first, then return here. Queue position: after 12c, before 03d.
- No implementation work has started — the 03c-backfilled substrate (38,799 rows) is intact and ready when 03b reactivates.
- Implication for slice 12: `DailyGaugeRollup` table won't exist during 12's window. `flowAtTripCfs` will be null on every log written until 03b lands. The lazy resolver's read-retry (up to 7 days post-trip) means logs <7 days old will backfill once 03b's rollup job runs; older logs stay null.

## 2026-06-14 — re-promoted to active (handoff note; build NOT yet started)

Flow-forecasting initiative pulled forward ahead of the queue per explicit user direction. This is a **handoff** — no code written yet. The next session does Phase 1 (review/refine this plan + 04, re-keyed to gauge), confirm with the user, then Execute.

**KEY DECISION — predict per GAUGE, not per section.**
- A corridor with 3 gauges → 3 forecasts. Sections read their `primaryGaugeId`'s forecast. The corridor hero (which already has a gauge toggle, e.g. Kremmling/Catamount, Gunnison Tunnel/Grand Junction) extends the selected gauge's history chart forward: history → dashed forecast + widening confidence band.
- Re-key `ForecastRun` / `ForecastInput` / `ForecastAccuracy` around `gaugeId`. `DailyGaugeRollup` is already gauge-keyed (no change).
- Regime via `RiverSection.driver`, assigned per gauge → mixed-regime corridors handled (gauge above a dam = snowmelt method; below = release method).

**v1 scope (build first):** per-gauge nowcast (1–7d) = persistence + Open-Meteo melt/precip + observed releases (BOR/USGS/CDSS) + diversion telemetry, regime-routed. No new data sources. Reconcile against observed (this slice's substrate) to build a visible accuracy track record. Then wire into the corridor hero chart (slice 05) + section pages.

**Phase 2 (later):** seasonal — ingest free federal OUTPUTS as priors/features: NOAA National Water Model (AWS, public domain), CBRFC (west slope) / MBRFC (east slope) / NRCS unregulated water-supply forecasts; elevation-zoned SWE regression; random-forest-on-ESP-mean (Woodson 2024). Phase 3: LSTM (NeuralHydrology).

**Hard constraints** (memory `flow_state_forecast_research`): use federal model OUTPUTS (public domain, redistributable); DON'T embed WRF-Hydro (UCAR license) or airGR (GPL-2) — algorithms are public-domain math, reimplement if needed; avoid PRISM commercially (use Daymet/gridMET); two RFCs — CBRFC (Colorado/west slope) + MBRFC (Arkansas/South Platte/Poudre east slope). LLM for narrative only, not the CFS numbers.

**Queue bookkeeping:** slice 30-design-overhaul moved to in-review (its major design overhaul + tile-completion + map dam ticks shipped) to keep exactly one active slice; resume its remaining polish after the forecast v1.

Full architecture: memory `flow_state_forecast_architecture`. Research/licensing/data: memory `flow_state_forecast_research`.
