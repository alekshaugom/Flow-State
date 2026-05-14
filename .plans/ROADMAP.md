# Roadmap

Single source of truth for what ships next. Sorted by value × confidence ÷ effort, respecting dependencies. Frontmatter in each slice's `plan.md` / `intent.md` is the authoritative metadata — this file is a rendered view.

**Last updated:** 2026-05-13
**Active slice:** [01-flowband-browns-fix](slices/01-flowband-browns-fix/plan.md)

## Active

| # | Slice | Value | Effort | Goal |
|---|---|---|---|---|
| 01 | [flowband-browns-fix](slices/01-flowband-browns-fix/plan.md) | 10 | M | Browns at 396 cfs reads "Runnable (technical)" not "too low"; craft+skill-aware bands ship behind a selector UI |

## Queued — detailed plans

| # | Slice | Value | Effort | Depends | Goal |
|---|---|---|---|---|---|
| 02 | [watershed-corridor-ia](slices/02-watershed-corridor-ia/plan.md) | 9 | L | — | Watershed → Corridor → Section hierarchy; new routes; sidebar watershed-grouped |
| 03 | [forecast-snapshot-infra](slices/03-forecast-snapshot-infra/plan.md) | 8 | M | — | ForecastInput + ForecastAccuracy + DailyGaugeRollup; daily reconciliation; no UI yet |
| 04 | [nws-weather-pipeline](slices/04-nws-weather-pipeline/plan.md) | 8 | M | — | NWS gridpoint forecast per section into WeatherForecast table; driver-conditioned heuristic forecaster |

## Queued — lighter plans

| # | Slice | Value | Effort | Depends | Goal |
|---|---|---|---|---|---|
| 05 | [history-forecast-chart](slices/05-history-forecast-chart/plan.md) | 9 | M | 03, 04 | Single chart with history + present + forecast + weather strip + band-crossing interpretation |
| 06 | [map-layering](slices/06-map-layering/plan.md) | 7 | M | 02 | Tile providers, zoom-adaptive layers, watershed/corridor focus deep-links |

## Queued — intents only (far horizon)

| # | Slice | Value | Effort | Depends | Intent |
|---|---|---|---|---|---|
| 07 | [drivers-and-context-ui](slices/07-drivers-and-context-ui/intent.md) | 7 | M | 02, 04 | Surface *why* flows are what they are — driver attribution + ContextItem cards |
| 08 | [llm-interpretive-summaries](slices/08-llm-interpretive-summaries/intent.md) | 6 | M | 02 | Nightly LLM-drafted watershed/corridor/section summaries with editorial review |
| 09 | [llm-bor-bulletin-pilot](slices/09-llm-bor-bulletin-pilot/intent.md) | 5 | L | 07 | One LLM ingestion source (Twin Lakes) emitting structured ContextItems |
| 10 | [admin-editorial-ui](slices/10-admin-editorial-ui/intent.md) | 6 | M | 01, 08 | Tabs for FlowBand editing, summary review, ContextItem moderation, accuracy dashboard |
| 11 | [rapid-stub-pages](slices/11-rapid-stub-pages/intent.md) | 5 | S | 02 | Rapid + AccessPoint schemas; routed placeholder pages with satellite view |

## Completed

| # | Slice | Closed | Notes |
|---|---|---|---|
| 00 | [v1-foundation](completed/00-v1-foundation.md) | 2026-05-13 | Harper backend, ingestion worker, custom SVG charts, Leaflet map, ForecastPipeline stub |

## Deferred / killed

*(none yet)*

---

## Methodology

**Value (1-10)**: impact on users + strategic importance. 10 = canonical broken thing or unlock for many other slices. 1 = nice-to-have polish.

**Effort**: S = under a week, M = 1–2 weeks, L = 2–4 weeks, XL = 4+ weeks. Anything XL should be broken down.

**Order**: highest-value, dependency-free slice goes first. Where ties exist, prefer the slice that *unlocks* more downstream slices.

**Promoting an intent to a plan**: when an intent reaches the top of the queue and is about to become active, expand it into a `plan.md` **in the context of the actual codebase as it stands then**. Don't lock down details from this side of the dependency wall.
