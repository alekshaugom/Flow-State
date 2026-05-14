---
slice: 07-drivers-and-context-ui
status: queued
value: 7
confidence: 7
effort: M
depends_on: [02-watershed-corridor-ia, 04-nws-weather-pipeline]
unlocks: [09-llm-bor-bulletin-pilot]
opened: 2026-05-13
closed: null
---

# Slice 07 — Drivers panel + ContextItem display (intent)

## What success looks like

A user looking at Browns Canyon during peak runoff sees, in plain language, *why* flows are what they are:

> Snowmelt-driven (78%). SWE at 105% of median across the Arkansas Headwaters basin.
> Pueblo releases steady at 380 cfs.
> Twin Lakes release scheduled to increase by 200 cfs starting May 16.

The page surfaces ContextItems relevant to this section automatically — agency notices, dam releases, weather events — without the user having to know where to find them.

## What's NOT it

- Not a feed of all news in the watershed. Curate by severity and relevance.
- Not a place for marketing copy. ContextItems are *operationally* relevant or they shouldn't be shown.
- Not a notification surface. Alerts come later (phase 3).

## Key dependencies

- `RiverSection.driver` field populated (slice 02)
- `WeatherForecast` data available (slice 04)
- `ContextItem` table populated by some mechanism — either manual seed, admin entry, or LLM ingestion (slice 09)

## Loose sketch (do not lock in)

- `ContextItem` table per [vision/data-model-philosophy.md](../../vision/data-model-philosophy.md) section "ContextItem is the unifier"
- New `<DriversPanel>` component on section page replacing the existing `ContextStrip`
- Driver attribution computed at render time from current data (snowpack % + dam release recency + precip past 14d)
- ContextItem resolution walks the scope hierarchy: section → corridor → watershed → reservoir(s)
- Severity-sorted; "critical" gets a callout treatment, "info" tucks at the bottom

## Open questions for when this becomes active

- Are driver percentages computed or editorial? Recommend: hybrid — heuristic computes a baseline from current data; admins can override per section.
- Should ContextItems have an "acknowledge" affordance (dismiss for this session)? Recommend: no for v2, yes when accounts ship.
- How far to walk the hierarchy? Recommend: section → its corridor → its watershed; resolve reservoir ContextItems through `RiverCorridor.governingReservoirIds`.

## References that will matter when active

- [vision/data-model-philosophy.md](../../vision/data-model-philosophy.md) — ContextItem hierarchy resolution
- [vision/ux-direction.md](../../vision/ux-direction.md) — interpretive card primitive
