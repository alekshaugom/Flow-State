---
slice: 03d-snowpack-confidence-and-audit
status: queued
value: 8
confidence: 8
effort: M
depends_on: []
unlocks: [04-driver-conditioned-forecaster]
opened: 2026-05-15
closed: null
---

# Slice 03d — Snowpack confidence + watershed audit

## Goal

Make snowpack visibly trustworthy on every river section. Two outcomes in one slice:

1. **Audit + fix.** Every one of the 12 Colorado basins ingests fresh SNOTEL data; every river section's snowpack tile shows real values (not `—%` and not "Upper {river} basin" fallback text).
2. **Richer tile.** The tile shows current SWE and 30-year historic median for this date side by side, a 30-day sparkline overlaying both curves, a freshness badge ("updated Xh ago"), and an inline expand toggle (only when a basin has >1 station) that reveals a per-station table — Station | Historic avg (in) | Current (in) — within the tile, no modal.

## Acceptance criteria

1. After ingestion runs, all 12 entries in `COLORADO_BASINS` have a `SnowpackReading` dated within the last 24h. Confirm via `GET /DataHealth` (extended with a per-basin freshness map).
2. Loading any river section in `lib/seed-data.ts` on desktop or mobile shows a populated snowpack tile with non-null % of normal, current SWE inches, and historic-for-today SWE inches.
3. `SnowpackReading` rows store `sweMedianInches` (absolute 30-year median for the date) and a `stations` JSON list (one entry per contributing station triplet with name, current SWE, historic median).
4. The tile renders, in order: header (label + % of normal, color-coded), basin name + freshness badge, absolutes row (`12.5" current · 14.2" historic`), 30-day sparkline (two lines: current solid, median dashed/muted), the existing progress bar with 100% tick, the existing 3-col SWE/Depth/Precip grid, and a "Show stations" toggle that appears only when `stations.length > 1`.
5. A 35-day backfill populates `sweMedianInches` for past readings so the sparkline is non-empty at launch.
6. New fixture-based test asserts `parseAwdbResponse` and `buildSnowpackRecords` correctly emit `sweMedianInches` and per-station detail from a captured AWDB payload (per L006).

## Schema additions

Append to `SnowpackReading` in `schemas/snowpack.graphql`:

```graphql
sweMedianInches: Float        # absolute 30-yr median (1991-2020) for the basin on this date
stations: String              # JSON [{triplet, name, sweInches, sweMedianInches}]
stationCount: Int             # = stations.length; drives the expand toggle
```

Keep one row per `(basinId, timestamp)`. Denormalize per-station details into the `stations` JSON column rather than introducing a `SnowpackStationReading` table — the read pattern is "render the basin tile" and the count is bounded (1-3 stations per basin).

## Files to create

- `lib/jobs/snowpack-backfill.ts` — one-shot 35-day backfill that, per basin, fetches per-station SWE + median + depth + precip over `[today-35, today]` and writes one basin-level row per date with rolled-up averages and `stations` JSON. Idempotent via `put`-by-id. Trigger: `POST /Ingestion {action: "backfill-snowpack", days: 35}`. Add `PER_REQUEST_DELAY_MS = 2000` between station calls per L007.
- `scripts/audit-snotel-basins.ts` — read-only audit script. For each entry in `COLORADO_BASINS`, hits `…/services/v1/stations?stationTriplets=<triplet>` and prints triplet, station name, lat/lng, station's reported HUC. Flag rows where the station's HUC doesn't match the basin's HUC. Used by humans during the audit phase.
- `test/snotel-adapter-stations.test.ts` — captured AWDB response fixture → `buildSnowpackRecords` → asserts new `sweMedianInches` + `stations` shape.
- `app/src/components/SnowpackTile.tsx` — extracted snowpack sub-component (currently inline in `ContextStrip.tsx`). Houses the sparkline, station table, freshness badge.
- `app/src/components/SnowpackSparkline.tsx` — two-line variant of the existing `Sparkline.tsx`. Solid `--river-500` for current SWE with filled area; muted `--ink-3` dashed for median, no fill. ~280×40 desktop, full-card-width × 32 on mobile.

## Files to modify

- `lib/adapters/snotel.ts` — change `fetchBasinSnowData()` to aggregate per-timestamp across all triplets and emit one row per `(basinId, timestamp)` instead of per `(basinId, station, timestamp)`. The aggregation: `sweInches` = mean of stations reporting; `sweMedianInches` = mean of stations reporting a median; `swePercentMedian` = computed from those two; `stations` = `JSON.stringify([{triplet, name, sweInches, sweMedianInches}])`. New row id = `compositeId([basinId, isoTs])`. Old rows keyed by `[basinId, stationKey, isoTs]` will linger as orphans; clean them up via a one-line `DELETE` in the backfill script.
- `lib/adapters/snotel.ts` (`COLORADO_BASINS`) — fix bad triplets discovered by the audit. Known suspects from code review:
  - `412:CO:SNTL` is currently in upper-colorado-headwaters, south-platte-headwaters, AND cache-la-poudre — at most one is correct.
  - `485:CO:SNTL` is in upper-colorado-headwaters, blue-river, AND south-platte-headwaters.
  - `551:CO:SNTL` is the sole north-platte station and is duplicated in cache-la-poudre.
  - `586/632:CO:SNTL` appear in both san-juan-dolores and animas-river.
  Per basin, retain only stations whose AWDB-reported HUC matches `basin.huc`. Source replacements from `fetchStationMetadata('CO')` filtered by HUC prefix. Aim for 2-3 stations per basin minimum.
- `resources/RiverDetail.ts` — `getSnowpackData()` parses `stations` JSON before returning; exposes `sweMedianInches` on the latest payload. No structural change.
- `resources/DataHealth.ts` — add a `snowpackBasins: [{basinId, name, latestAt, ageMin, stationCount}]` map by scanning `SnowpackReading` and bucketing by `basinId`. This becomes the audit signal.
- `resources/Ingestion.ts` — wire `POST /Ingestion {action: "backfill-snowpack", days}` to `lib/jobs/snowpack-backfill.ts`.
- `app/src/components/ContextStrip.tsx` — replace the inline snowpack block (lines 44-98) with `<SnowpackTile snowpack={snowpack} snowpackPct={snowpackPct} riverName={riverName} />`. Leave the dam tile untouched.
- `app/src/lib/transform.ts` — surface `sweMedianInches` and parsed `stations` from `latest` through to the component. Existing `snowpackPct` averaging logic still works (now over basin-level rows that already aggregate stations).
- `app/src/api.ts` — extend `SnowpackLatest` / `SnowpackEntry` types to include `sweMedianInches`, `stations`, `stationCount`.

## Audit procedure (concrete)

1. **Inventory.** Hit `GET /DataHealth` after the new per-basin map is in place. Treat any basin with `ageMin > 360` or `ageMin === null` as a candidate for fix.
2. **Log triage.** `GET /IngestionLog?sourceId=snotel` — latest 10 rows. The L006 smell: `status: success` with `recordsProcessed: 0`.
3. **Catalog-drift check.** Run `scripts/audit-snotel-basins.ts`. For every triplet, confirm the station's AWDB-reported `huc` matches its basin's `huc`. Mismatches are bugs.
4. **Shape check.** For each suspect basin, manually call `…/services/v1/data?stationTriplets=<triplet>&elements=WTEQ&beginDate=…&endDate=…&duration=DAILY&centralTendencyType=MEDIAN&centralTendencyBeginYear=1991&centralTendencyEndYear=2020` and confirm `data[0].data[0].values` is non-empty and entries carry both `value` and `median`.
5. **Fix.** Replace triplets in `COLORADO_BASINS` with HUC-matching SNOTEL stations from `fetchStationMetadata('CO')` filtered by HUC prefix. Document choices inline.
6. **Re-verify.** Run `POST /Ingestion {action: "run", source: "snotel"}`, then re-check `/DataHealth`. All 12 basins green.

Definition of "broken": no `SnowpackReading` row ever, OR latest row older than 24h, OR latest row has `sweInches == null`, OR `swePercentMedian == null` because median is missing.

## Tile layout (top to bottom, inside the existing card)

1. **Header row** (unchanged): snowflake icon + "Snowpack" label on the left; giant `<n>% of normal` on the right, color-coded green ≥100 / red <100.
2. **Sub-line** (`--ink-3` mono, 10px): `<basinName> basin · SNOTEL avg · updated <X>h ago`. Single line, truncate basin name with ellipsis.
3. **Absolutes row** (mono, `--ink-1`, 12px): `<current>" current · <median>" historic`. If `sweMedianInches` is null on this row, show `<current>" current · — historic`.
4. **Two-line sparkline** (30 days, 36-40px tall, full card width). Current = solid `--river-500` with light filled area. Median = `--ink-3` dashed, no fill. Days with null median: break the path (SVG `M`).
5. **Progress bar** (preserved): existing 6px bar with 100% tick.
6. **3-col grid** (preserved): SWE / Depth / Precip.
7. **(Conditional)** "Show stations" toggle when `stationCount > 1`. Click reveals an inline 3-col table directly below the toggle: Station | Historic (in) | Current (in). One row per station, 12px mono, thin `--rule` separators, `table-layout: fixed`, `overflow: hidden`. Never breaks the card width.

Mobile (< 380px): drop icon column so the right column takes full width; reduce sparkline height to 32; right-align the absolutes row beneath the header. The station table at 320px uses 11px mono — validate that 3 stations fits (worst case is `san-juan-dolores`).

## Backfill strategy

- Triggered once post-deploy via `POST /Ingestion {action: "backfill-snowpack", days: 35}`.
- 35 days yields ≥30 with data after weekends and AWDB cache lag.
- Per basin per date: fetch SWE+median+depth+precip across all triplets, average, write one row keyed by `compositeId([basinId, isoTs])`.
- Idempotent: re-runnable, `put`-by-id.
- Once shipped, the existing 6-hour `ingestSnowpack()` keeps filling `sweMedianInches` on each tick — no further backfill needed.
- Per L007: 2-second delay between station fetches in the backfill loop.

## Verification

1. `npm test` — new fixture test passes; existing `parseAwdbResponse` / `buildSnowpackRecords` tests still pass with updated signatures.
2. `npm run dev` (Harper) + `npm run ui:dev` (Vite).
3. `POST /Ingestion {action: "backfill-snowpack", days: 35}` — wait for completion (~2 min).
4. `GET /DataHealth` — confirm `snowpackBasins` map shows all 12 basinIds with `ageMin < 60`.
5. `GET /SnowpackReading/?basinId=arkansas-headwaters&sort(-timestamp)&limit(35)` — confirm ≥30 rows, each with `sweMedianInches != null` and parseable `stations`.
6. `POST /Ingestion {action: "run", source: "snotel"}` — confirm a fresh row appears, log says `recordsProcessed: 12`, `status: success`.
7. Open a multi-station section (e.g. `arkansas-browns-canyon`) on desktop. Snowpack tile shows: %, absolutes line, sparkline with two lines, freshness badge, "Show stations" toggle. Click reveals a 2-row inline table. No layout overflow.
8. Open a previously-thin section (e.g. `north-platte-corridor`) — now populated.
9. Resize to 375×812 and 320×568. Tile renders cleanly at both widths.
10. Scan every river section in `lib/seed-data.ts`. None show `—% of normal`.
11. `GET /IngestionLog?sourceId=snotel&sort(-startedAt)&limit(3)` — most recent rows are `status: success, recordsProcessed > 0`.

## Out of scope (deferred)

- Cross-basin/statewide snowpack summary tile.
- Per-section snowpack subset (sections inheriting only a subset of a basin's stations). Stay basin-level.
- Snowpack-driven forecaster changes (slice 04 territory).
- Switching to AWDB `basinwide=true` products — we want per-station detail for the expand UI.
- Backfill beyond 35 days.
- Admin UI for editing `COLORADO_BASINS` triplets (slice 10 territory).
- Modal/full-screen station detail view.

## Risks / edge cases

- **Median absent for some dates.** Near freeze/thaw shoulder, some stations don't report a median. Drop that station's median contribution for that date; if zero stations report a median, write `sweMedianInches: null` and break the sparkline path.
- **Triplet returns empty / 404.** Adapter logs `console.warn` with triplet + basinId, continues. Audit script flags on next pass.
- **Catalog drift mid-season.** Per L006, log when an AWDB-returned station's HUC changes vs what we expect — warn loud, don't fail-stop.
- **Sparkline empty at launch.** Backfill is a hard prerequisite before deploy. Add a fallback "no historic data yet" placeholder if `history.length < 5`.
- **Mobile width with 3 stations.** Validate the worst case (`san-juan-dolores`) at 320×568.
- **Time-ago badge staleness.** Compute on render from `latest.timestamp`; never cache the rendered string in the resource payload.
- **Legacy 3-segment composite IDs.** Old `[basinId, stationKey, isoTs]` rows linger after the schema change. One-line `DELETE` in the backfill script clears them.

## Critical references

- Existing adapter: [lib/adapters/snotel.ts](../../../lib/adapters/snotel.ts) — `fetchBasinSnowData`, `buildSnowpackRecords`, `parseAwdbResponse`, `COLORADO_BASINS`
- Existing tile: [app/src/components/ContextStrip.tsx](../../../app/src/components/ContextStrip.tsx) — the inline snowpack block at lines 44-98
- Existing resource: [resources/RiverDetail.ts](../../../resources/RiverDetail.ts) — `getSnowpackData()`
- Existing transform: [app/src/lib/transform.ts](../../../app/src/lib/transform.ts) — `snowpackPct` aggregation
- Existing health: [resources/DataHealth.ts](../../../resources/DataHealth.ts) — extend with `snowpackBasins`
- Lesson: [L006-third-party-api-response-shape-verification.md](../../lessons/L006-third-party-api-response-shape-verification.md) — verify SNOTEL response shapes
- Lesson: [L007-usgs-rate-limit-on-repeat-backfill.md](../../lessons/L007-usgs-rate-limit-on-repeat-backfill.md) — pace the backfill
- Seed: [lib/seed-data.ts](../../../lib/seed-data.ts) — `snowpackBasinIds` per river section
