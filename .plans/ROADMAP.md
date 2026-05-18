# Roadmap

Single source of truth for what ships next. Sorted by value × confidence ÷ effort, respecting dependencies and explicit user priority. Frontmatter in each slice's `plan.md` / `intent.md` is the authoritative metadata — this file is a rendered view.

**Last updated:** 2026-05-17
**Active slice:** [03b-forecast-snapshot-infra](slices/03b-forecast-snapshot-infra/plan.md)
**Next initiative:** River log series (12 → 12b → 12c) before pivoting back to forecast (03d, 04).

## Active

| # | Slice | Value | Effort | Goal |
|---|---|---|---|---|
| 03b | [forecast-snapshot-infra](slices/03b-forecast-snapshot-infra/plan.md) | 8 | M | ForecastInput + ForecastAccuracy + DailyGaugeRollup; daily reconciliation; no UI yet |

## Queued — detailed plans

| # | Slice | Value | Effort | Depends | Goal |
|---|---|---|---|---|---|
| 12 | [river-log-core](slices/12-river-log-core/plan.md) | 9 | M | 02b | **NEXT** — Trip-logging foundation. `RiverLog` + `UserProfile` schemas, `/log/new` form, `<PastTripsStrip>` on section detail, `/section/:id/logs` page, home-card corner badge, `/profile` setup. Logs are private-only this slice. Opens the past-trips axis of the product |

## Queued — lighter plans

| # | Slice | Value | Effort | Depends | Goal |
|---|---|---|---|---|---|
| 12b | [river-log-watershed-browse](slices/12b-river-log-watershed-browse/plan.md) | 8 | M | 12 | `/logs` watershed-grouped filing system mirroring the watershed accordion. Filter by craft / conditions / watershed. Year-view toggle. Surfaces "where have I been" across the app |
| 12c | [river-log-sharing](slices/12c-river-log-sharing/intent.md) | 7 | M | 12, 12b | *(intent.md — promote to lighter plan when 12b ships)* Per-log invite links + opt-in bidirectional friendships. Logs become shareable to specific people; never fully public. Privacy invariant: no `"public"` visibility value ever exists in the schema |
| 03d | [snowpack-confidence-and-audit](slices/03d-snowpack-confidence-and-audit/plan.md) | 8 | M | — | Audit all 12 Colorado basins (fix bad station triplets); enrich snowpack tile with current + historic SWE side-by-side, 30-day sparkline, freshness badge, per-station expand |
| 04 | [driver-conditioned-forecaster](slices/04-driver-conditioned-forecaster/plan.md) | 8 | M | 03b, 03c | Driver-conditioned heuristic forecaster using snowpack + weather + dam releases per section's `driver` field |
| 05 | [history-forecast-chart](slices/05-history-forecast-chart/plan.md) | 9 | M | 03a, 03b, 04 | Single chart with history + present + forecast + weather strip + band-crossing interpretation |
| 06 | [map-layering](slices/06-map-layering/plan.md) | 7 | M | 02 | Tile providers, zoom-adaptive layers, watershed/corridor focus deep-links |

## Queued — intents only (far horizon)

| # | Slice | Value | Effort | Depends | Intent |
|---|---|---|---|---|---|
| 07 | [drivers-and-context-ui](slices/07-drivers-and-context-ui/intent.md) | 7 | M | 02, 03a, 04 | Surface *why* flows are what they are — driver attribution + ContextItem cards |
| 08 | [llm-interpretive-summaries](slices/08-llm-interpretive-summaries/intent.md) | 6 | M | 02 | Nightly LLM-drafted watershed/corridor/section summaries with editorial review |
| 09 | [llm-bor-bulletin-pilot](slices/09-llm-bor-bulletin-pilot/intent.md) | 5 | L | 07 | One LLM ingestion source (Twin Lakes) emitting structured ContextItems |
| 10 | [admin-editorial-ui](slices/10-admin-editorial-ui/intent.md) | 6 | M | 01, 08 | Tabs for FlowBand editing, summary review, ContextItem moderation, accuracy dashboard |
| 11 | [rapid-stub-pages](slices/11-rapid-stub-pages/intent.md) | 5 | S | 02 | Rapid + AccessPoint schemas; routed placeholder pages with satellite view |

## Completed

| # | Slice | Closed | Notes |
|---|---|---|---|
| 03c | [historical-backfill](completed/03c-historical-backfill/plan.md) | 2026-05-15 | Backfilled 38,799 rows of historical flow / snowpack / weather observations / dam releases (2025-03-31 → 2026-05-15) across USGS / SNOTEL / BOR / new `WeatherObservation` schema + Open-Meteo Archive adapter. SNOTEL adapter now requests AWDB climatological median (1991-2020 normals) so `swePercentMedian` is populated. Orchestrator on `POST /Ingestion { action: "backfill", days, sources }`. 45/45 tests pass. Lesson L007 on USGS rate-limiting under repeat backfill. |
| 03a | [data-integrity-sweep](completed/03a-data-integrity-sweep/plan.md) | 2026-05-14 | Fixed BOR (response shape + catalog re-mapped: 5 verified Colorado reservoirs in RISE) + SNOTEL (basinId keying + response shape) ingestion. Switched weather pipeline to Open-Meteo for 14-day daily forecasts with WMO weathercode → icon mapping. Added DataHealth smoke endpoint + admin panel. UI: weather strip with icons inside the 14-day forecast section, snowpack + reservoir details inlined into Context's Snowpack and Dam release cards. Lesson L006 on third-party API response-shape verification. Deployed to Fabric. |
| 02b | [watershed-corridor-refinements](completed/02b-watershed-corridor-refinements/plan.md) | 2026-05-14 | sortIndex on RiverSection + RiverCorridor for true upstream→downstream order; watershed page redesigned with stacked corridor cards embedding section rows inline (no obligatory click into corridor page); reserved // MAP · COMING SOON header; shared SectionRow component for parity. Deployed to Fabric. |
| 02 | [watershed-corridor-ia](completed/02-watershed-corridor-ia/plan.md) | 2026-05-14 | Watershed + RiverCorridor schemas, 8 watersheds + 20 corridors seeded; /watershed/:slug + /corridor/:slug routes; watershed-grouped collapsible sidebar; breadcrumb on all non-home pages; legacy /section/:id preserved |
| 01 | [flowband-browns-fix](completed/01-flowband-browns-fix/plan.md) | 2026-05-14 | FlowBand schema + 315 seeded rows; global Craft/Skill context with Oar-Raft / Paddle Boat / Kayak/SUP options in dashboard segmented control; per-craft/skill interpretation in section flow tile; Browns at 396 now correctly reads "Runnable (technical)" |
| 00 | [v1-foundation](completed/00-v1-foundation.md) | 2026-05-13 | Harper backend, ingestion worker, custom SVG charts, Leaflet map, ForecastPipeline stub |

## Deferred / killed

*(none yet)*

---

## Methodology

**Value (1-10)**: impact on users + strategic importance. 10 = canonical broken thing or unlock for many other slices. 1 = nice-to-have polish.

**Effort**: S = under a week, M = 1–2 weeks, L = 2–4 weeks, XL = 4+ weeks. Anything XL should be broken down.

**Order**: highest-value, dependency-free slice goes first. Where ties exist, prefer the slice that *unlocks* more downstream slices. Explicit user direction can override the formula for a multi-slice initiative — e.g. when the user wants a coherent feature thread shipped together before pivoting away.

**Promoting an intent to a plan**: when an intent reaches the top of the queue and is about to become active, expand it into a `plan.md` **in the context of the actual codebase as it stands then**. Don't lock down details from this side of the dependency wall.
