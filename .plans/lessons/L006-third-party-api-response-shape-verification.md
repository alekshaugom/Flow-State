# L006 — Third-party API adapters need real-response fixture tests, not just unit tests on assumed shapes

**Date:** 2026-05-15
**Tags:** debug, discovery, surprise
**Slice:** 03a-data-integrity-sweep
**Severity:** high (3 of 5 input sources silently producing zero records; nobody noticed for ~2 weeks; the entire forecast-snapshot foundation would have been built on empty data)

## The wrong assumption / model

When we wrote the data-source adapters in slice 00 (foundation), we believed:
1. Each adapter's JSON response would have a stable shape we could hardcode against.
2. The hardcoded "catalog" of upstream entity IDs (BOR RISE itemIds, SNOTEL station triplets, etc.) would remain valid for the life of the app.
3. If an adapter's `try/catch` didn't throw, the adapter was working.

## How it manifested

The slice 03 plan was to build snapshot infrastructure on top of these adapters. The user, before agreeing to start, asked: *"part of forecasting properly is weather, snowpack, and dam release data, do we have those?"* A live audit against the running dev server revealed:

- **BOR RISE response shape changed**: the response is an object with numbered string keys (`{"0":{…}, "1":{…}, "Location":{…}, "Timezone": "MT"}`) plus metadata. The adapter checked `if (Array.isArray(data))` and silently skipped parsing. **Zero `DamRelease` rows had been written ever.**
- **BOR RISE catalog IDs went stale**: `itemId=512`, claimed in our hardcoded catalog as "blue-mesa outflow", actually returned data for **Lake Powell Glen Canyon Dam**. The locationIds (913 for Blue Mesa, etc.) returned HTTP 404. BOR had re-indexed at some point and our pinned IDs pointed elsewhere now.
- **SNOTEL adapter had two bugs**: (a) records were keyed by station triplet (`369-CO-SNTL`), but every downstream consumer queried by logical basin id (`arkansas-headwaters`); (b) the response parser flattened the wrong level — `data[]` elements were treated as if they had `{date, value}` directly when they actually had `{stationElement, values: [{date, value}]}`. **Zero `SnowpackReading` rows reachable.**
- **NOAA weather**: the adapter file existed with `fetchWeatherForecast(lat, lon)` but it was never imported by any caller. No table, no ingestion, no rows. (Discovery, not a regression.)

In every case the ingestion worker logged `status: success, recordsProcessed: 0` and moved on. The `IngestionLog` and `DataSource.lastFetchAt` rows showed the worker was running fine. We had no visibility into the gap until someone asked.

## The right model

Three principles:

1. **Real-response fixture tests beat assumed-shape unit tests.** Our adapter unit tests (where they existed) used mocks shaped how we *thought* the API responded. Capture the actual JSON from a real call — at least once during adapter authorship — and assert the parser handles it.

2. **Hardcoded upstream-entity IDs must be runtime-validated against a stable property of the response.** For BOR, the response includes `Location.Name`; the adapter can compare it to the expected reservoir name and warn loudly when they diverge. That's the alarm bell for catalog drift, which would have caught the Lake Powell mapping the day it broke.

3. **`recordsProcessed: 0` is not a success.** An adapter that fetched 0 records on a workflow with active gauges/basins/reservoirs is almost always broken upstream. The healthchecker (`DataHealth`) now exposes per-source row counts in addition to fetch timestamps so this kind of zero-output success is visible.

## How to recognize the pattern

- An adapter under `lib/adapters/*` runs without throwing but the corresponding `tables.X` is empty
- `Array.isArray(data)` checks against responses from third-party JSON APIs (especially older ones that return JSON-with-numbered-keys instead of arrays)
- A catalog of hardcoded upstream IDs that hasn't been re-verified since the adapter was first written
- A downstream query that filters by `attribute=X` where the writing adapter stamps with `attribute=Y` (the SNOTEL basinId/triplet mismatch — easy to miss until you check end-to-end)
- An adapter whose IngestionLog history is "success, success, success" with `recordsProcessed` always 0 — that's the smell

## Mitigation

When writing or reviewing a new adapter:
- **Capture real-response fixtures.** Add a `test/fixtures/<source>-real.json` from a live API call and feed it to a parser test. The fixture file is checked into the repo as documentation of the response shape at adapter-authorship time.
- **Extract a pure parser** so the test doesn't need to mock fetch. The slice 03a refactor pulled `parseRiseDownloadResponse()`, `parseAwdbResponse()`, `buildSnowpackRecords()`, and `combineNwsPeriodsToDaily()` into exported pure helpers exactly for this reason.
- **Add an end-to-end sanity check**: for every catalog entry that pins a remote ID, the adapter should verify on every fetch that the response identifies the entity we expected (e.g., `Location.Name.includes(catalog.name)`) and `console.warn` when not. Don't fail-stop on drift — log loudly so the next look at the log surfaces it.
- **Surface freshness in a single endpoint.** [resources/DataHealth.ts](../../resources/DataHealth.ts) exposes per-source `lastFetchAt`, `lastLog.recordsProcessed`, and `data.totalRows` so the "success but zero records" pattern is visible from one curl.

Slice plan template addition: any slice that introduces a new adapter must include "real-response fixture test" and "DataHealth source entry" in its acceptance criteria.

## References

- Fixed in [lib/adapters/bor.ts](../../lib/adapters/bor.ts) (response shape + catalog re-mapping + Location.Name warning)
- Fixed in [lib/adapters/snotel.ts](../../lib/adapters/snotel.ts) (response shape + basinId keying)
- New: [lib/agents/weather-agent.ts](../../lib/agents/weather-agent.ts), [schemas/weather.graphql](../../schemas/weather.graphql)
- New monitoring endpoint: [resources/DataHealth.ts](../../resources/DataHealth.ts)
- Adapter parser test fixtures: [test/bor-adapter.test.ts](../../test/bor-adapter.test.ts), [test/snotel-adapter.test.ts](../../test/snotel-adapter.test.ts), [test/weather-agent.test.ts](../../test/weather-agent.test.ts)
- Related lesson: [L004](L004-harper-static-import-and-search-after-restart.md) — also about "the worker said success but data wasn't reachable"
- Vision principle that this protects: [vision/forecasting-philosophy.md](../../vision/forecasting-philosophy.md) §"Capture inputs before chasing accuracy" — inputs must actually be there, not just be there *in name*
