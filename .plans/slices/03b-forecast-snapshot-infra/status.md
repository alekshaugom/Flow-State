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
