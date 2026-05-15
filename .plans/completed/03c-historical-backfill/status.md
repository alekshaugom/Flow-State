# Status — 03c historical-backfill

## 2026-05-15
- Slice promoted to active (swapped order with 03b at user's request: backfill historical data before building forecast-snapshot infra)
- 03b reframed as `depends_on: [03c]` and pushed to queued
- Implementation landed:
  - `WeatherObservation` schema appended to `schemas/weather.graphql`
  - `lib/adapters/open-meteo-archive.ts` (parser tolerates snake_case + camelCase shapes; L006 verified via fixture)
  - `lib/jobs/backfill.ts` orchestrator across USGS / SNOTEL / BOR / weather-obs, 2s throttle, per-source `IngestionLog`
  - `resources/Ingestion.ts` dispatches `action: "backfill"` with `{ days, sources }` to orchestrator; old narrow USGS-only backfill removed
  - `test/open-meteo-archive.test.ts` — 6 parser tests; `npm test` 41/41 pass
- Smoke test (`{days:30, sources:["usgs"]}`): 34 stations, 922 rows, 74s, 0 errors
- **Full backfill (`{days:410}`)**: 2025-03-31 → 2026-05-15, **38,799 rows** total, ~4 min wall-clock, **0 errors**
  - USGS daily flow: 11,703 rows across 34 gauges (87s)
  - SNOTEL snowpack: 10,250 rows across 12 basins (54s)
  - BOR reservoirs: 2,050 rows across 5 reservoirs (12s)
  - Open-Meteo weather observations: 14,796 rows across 36 sections (87s)
- DataHealth post-backfill: BOR totalRows 35 → 2,050; SnowpackReading 175 → ~10,400; DamRelease 35 → 2,050
- L006 follow-through: hit Open-Meteo Archive live (Browns Canyon, Jan 1-7 2026 & Feb 20-Mar 10 2026) — response shape matches parser fixture exactly (`daily.weather_code`, `daily.wind_speed_10m_max`, etc.). Found a plausible 4-inch snow event on 2026-03-06 (0.54" precip, 3.80" snow, 29°F high). Cross-source eyeball vs NWS Storm Events / Weather Underground deferred (no third-party API access in this session — flag for manual review).
- `swePercentMedian` populated: extended `lib/adapters/snotel.ts` to request `centralTendencyType=MEDIAN&centralTendencyBeginYear=1991&centralTendencyEndYear=2020` for the WTEQ element. Parser extracts `median` per row; builder computes `swePercentMedian = sweInches / median * 100` with divide-by-zero guard. 4 new tests added; `npm test` 45/45 pass. Re-ran SNOTEL backfill — 10,250 rows upserted via composite ID, no errors. Verified via `GET /RiverDetail/arkansas-browns-canyon`: Arkansas Headwaters 2026-05-14 SWE=0.6" → swePercentMedian=14 (drought conditions persisting since Dec 1's 21% reading).
- Idempotency rerun: SNOTEL / BOR / weather-obs returned identical row counts to the first pass (proves composite-ID upserts deduplicate cleanly). USGS hit HTTP 429 on 9/34 stations on the second pass — captured in lesson [L007](../../lessons/L007-usgs-rate-limit-on-repeat-backfill.md). No data loss: failed-fetch stations kept their prior rows. Idempotency mechanically proven (same compositeId pattern across all four sources).
- Outstanding (cosmetic / opt-in, not slice-blocking — carry forward):
  - Add `WeatherObservation` to `DataHealth.tables` (smoke endpoint hard-codes table list)
  - Cross-source weather eyeball vs NWS Storm Events for 2026-03-06 (manual, optional)
  - Consider raising `PER_REQUEST_DELAY_MS` for the USGS leg specifically per L007 (defer unless we plan repeat backfills)

## Closed: 2026-05-15
- 38,799 historical rows landed across USGS / SNOTEL / BOR / WeatherObservation, covering 2025-03-31 → 2026-05-15
- `swePercentMedian` populated via AWDB climatological median (1991-2020 normals)
- Lesson L007 captured for USGS rate-limiting on repeat backfill
- 45/45 tests pass; verified end-to-end via `GET /RiverDetail/arkansas-browns-canyon`
- Queue advances: 03b becomes active (forecast snapshot + reconciliation infra, now backed by real history so `DailyGaugeRollup` builds ~400 rollups per gauge on first tick)
