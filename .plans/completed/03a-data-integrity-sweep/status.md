# Slice 03a status

## 2026-05-14
- Opened. Slice promoted out of slice 04 plus newly-discovered audit gaps from a live dev-server check.

## 2026-05-15
- **Acceptance criteria 1 (SNOTEL)**: `GET /RiverDetail/arkansas-numbers` now returns `snowpack[0].latest.sweInches=0.6` (Arkansas Headwaters basin, 2026-05-13). 150 rows landed in `SnowpackReading`.
- **Acceptance criteria 2 (BOR)**: `RiverDetail/arkansas-numbers` returns real Twin Lakes data — outflow=184 cfs (2026-05-08), elevation=9,177 ft (matches reality at ~9,200 ft normal pool). Catalog rebuilt from BOR RISE locations endpoint.
- **Acceptance criteria 3 (Weather)**: `WeatherForecast` table populated with 288 rows across all sections. `ForecastPipeline/arkansas-numbers` `weatherForecast` array shows 7 days of NWS daily forecasts (highs in 40s-50s, snow showers for next few days, realistic for high CO in mid-May).
- **Acceptance criteria 4 (DataHealth)**: `GET /DataHealth` returns per-source freshness + table row counts. Confirmed all 5 sources reporting.
- **Acceptance criteria 5 (Tests)**: 35 tests passing total — 18 new for this slice (bor-adapter parser × 6, snotel-adapter parser+builder × 8, weather-agent period combiner × 8). Note: BOR catalog re-mapping took ~10 round-trips against `data.usbr.gov` via paginated locations + walking catalog records.

### Key findings
- **BOR RISE catalog was stale**: hardcoded `itemId=512` (claimed "blue-mesa outflow") returned Lake Powell Glen Canyon Dam data. Verified the corrected mapping; reservoirs not in BOR RISE (Aspinall Unit, McPhee, Taylor Park, Dillon) removed from catalog. Added a runtime `Location.Name` sanity check that warns when a returned location doesn't match the catalog entry — that's how we'll catch future drift.
- **Two SNOTEL bugs**: (a) basinId was set to station triplet, not logical basin name; (b) response parser flattened the wrong level (treated `data[]` as if elements had `{date, value}` directly when they actually had `{stationElement, values: [{date, value}]}`). Both fixed.
- **Background agent network blocked**: tried to delegate BOR discovery to a sub-agent but its sandbox denied outbound HTTP. The main session's bash had unrestricted access. Useful to know which permissions sub-agents inherit. Left the agent's probe script at [scripts/bor-probe.mjs](../../../scripts/bor-probe.mjs) for future use.
- **One-shot cleanup**: 30 stale `DamRelease` rows (Lake Powell data tagged with `reservoirId: 'blue-mesa'` etc.) deleted via new `Ingestion.post({action:"cleanup-bor-stale-rows"})` action.

### Decisions
- **Removed reservoirs not in BOR RISE** rather than retaining stale catalog entries. Sections that reference them (e.g., gunnison-gorge's blue-mesa) now show `latest=null` for those reservoirs. Better honest-missing than wrong-data. Alternative-source adapter (CDSS reservoir data) deferred to a follow-up.
- **Single `WeatherForecast` row per (section, date)** with composite id — no need to keep historical snapshots since slice 03b's `ForecastInput` will capture the relevant slice at predict time. Upserts overwrite each tick.

### Out-of-the-box-but-decided
- `fetchWithRetry()` extended to take a `RequestInit` so weather-agent can pass a NWS-required User-Agent header. Back-compat: all existing callers pass no options, behavior unchanged.

### Verification
- `npm test` — 35/35 passing
- `GET /DataHealth` — 5 sources reporting; GaugeReading 25,200 rows, SnowpackReading 150, DamRelease 30 (5 reservoirs × 6 days), WeatherForecast 288 (~25 sections × ~12 days incl. today/tomorrow night periods)
- `GET /RiverDetail/arkansas-numbers` — snowpack, reservoirs (twin-lakes, turquoise-lake), gauge data all populated
- `GET /ForecastPipeline/arkansas-numbers` — `weatherForecast` array populated with realistic NWS daily forecasts

### Open follow-ups
- BOR catalog covers only 5 of 11 originally-listed reservoirs. Missing: Aspinall Unit (Blue Mesa, Morrow Point, Crystal), Taylor Park, McPhee, Dillon. Spin off a follow-up to add a CDSS reservoir adapter for the Colorado-state-managed dams; Dillon is Denver Water and needs a different source again.
- `swePercentMedian` is still hardcoded `null` in SNOTEL records — slice 04 needs this for snowmelt-driver forecasting. Either compute from a 30-day baseline or pull the dedicated AWDB element. Out of scope for 03a.
- NWS adapter's `precipIn` is null (the public `/forecast` endpoint doesn't expose quantitative precip). Slice 04 can either add the `/gridpoints` raw-data fetch or accept precipProb-only forecasting.

## Closed
- **2026-05-14**: All acceptance criteria met. 35/35 tests passing. Live verification on dev server: `GET /DataHealth` shows 5 sources reporting; `GET /RiverDetail/arkansas-numbers` returns real snowpack (Arkansas Headwaters basin, SWE 0.6"), reservoirs (Twin Lakes elev 9,177 ft, Turquoise Lake elev 9,845 ft — both realistic), and 14-day Open-Meteo forecast. L006 written + indexed. UI surfacing added in same slice (weather strip with icons in 14-day forecast section, snowpack + reservoir details inline in Context's Snowpack and Dam release cards). Deployed to Fabric.
