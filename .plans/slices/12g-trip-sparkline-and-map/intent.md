---
slice: 12g-trip-sparkline-and-map
status: queued
value: 6
confidence: 6
effort: S
depends_on: [12-river-log-core, 12b-river-log-watershed-browse, 03b-forecast-snapshot-infra]
unlocks: []
opened: 2026-05-18
closed: null
---

# Slice 12g — Trip sparkline + section map (intent)

## What success looks like

Each `<RiverLogCard>` shows two more nostalgia-amplifying details that turn it from a record into a memory:

1. **A 15-day flow sparkline** — 7 days before the trip, the trip days themselves, and 7 days after. Trip-window days drawn in **river-blue**; outside-window days drawn in **gray**. For multi-day trips, the full range is blue. For trips less than 7 days ago, the after-window fills in as days pass — the sparkline grows over the week post-trip.

2. **A small section map** — a static SVG (or tile) showing the section line with put-in and take-out marked. Click expands to a full section map view.

The two details together turn the card from "I went here on that date" into "this is what the river was doing before and after, and here's the path we took."

## What's NOT it

- Not an interactive flow chart with hover scrubbing — that's `<DesktopFlowChart>` territory, and lives on the section page.
- Not multiple log-sparklines stacked for comparison — single-log scope only.
- Not live-updating polls for newer post-trip data. The sparkline refreshes when the user reloads the page; we don't push it via websocket.
- Not a custom map per log (annotations, hazards, pinned spots) — the section map is just the section's existing line geometry. Per-log annotations are a future slice.
- Not satellite or topo tiles on the in-card map — that level of detail belongs on the full section page.
- Not a public chart — same access predicate as the log itself.

## Why this is intent-only

Sparkline rendering wants `DailyGaugeRollup` from slice 03b so we don't scan `GaugeReading` per log on every `/logs` page load. With ~50 logs × 15 days × N gauge readings, the un-rolled query is heavy enough to matter. Better to wait for 03b to ship and pull from one rollup row per day.

The section-map render is simpler — every section already has a `geometryJson` column (slice 02). The intent here is to defer the layout polish until the card design has lived in 12b for a while.

## Loose sketch (do not lock in)

### Backend

- Extend `resources/RiverLog.ts` (or the per-section endpoint) to embed `tripSparkline: { startDate, endDate, days: [{ date, cfs, isTripDay }] }` for each returned log. Compute on read by reading `DailyGaugeRollup` for the section's `primaryGaugeId` over `[date - 7d, endDate + 7d]`. Null entries where the rollup row doesn't exist yet (post-trip days that haven't materialized).
- Section line geometry is already on `RiverCorridor.geometryJson` (slice 02b). Add a per-section trimmed line if the section is a sub-stretch of its corridor — defer until 13 if we don't have that data yet.

### Frontend

- `app/src/components/TripSparkline.tsx` — 15-day vertical-bar mini-chart. Trip-day bars in `--river-700`, surrounding days in `--ink-4`. Falls back to a single `// FLOW · TBD` chip when no rollup data exists (e.g. logs from before 03b shipped, or trips so old the rollup window has been culled).
- `app/src/components/SectionMiniMap.tsx` — SVG render of section line + put-in/take-out pins. Reused across `<RiverLogCard>` and the section-detail hero. Click → navigates to `/section/:id`.
- Both render into the slots `<RiverLogCard>` reserved in slice 12b.

## Open questions for when this becomes active

- **Sparkline width on mobile 320px.** 15 day-bars at ~6px each = 90px. Comfortable inside the card if the surrounding chrome is tight. Test.
- **Multi-day trip date-range coloring.** If trip is `May 15 → May 17`, those 3 bars are blue; bars on May 13/14 (before) and May 18-20 (after) are gray. Confirm visually.
- **Pre-rollup logs.** Logs written before 03b ships have `flowAtTripCfs: null`. The sparkline can still render from `DailyGaugeRollup` once 03b backfills historical data (which 03b's plan implies it will). Verify by spot-checking a slice-12 log after 03b lands.
- **Section without `geometryJson`.** Fall back to a `// MAP · NO GEOMETRY` placeholder. Track which sections lack geometry as a data-completeness signal.
- **Multi-section trips.** Out of scope. If a user logs a trip that crosses sections, they make two logs.
- **Performance.** Eager-load all sparkline data with the `/logs` aggregate? Or lazy-fetch per-card-in-viewport? Sparkline is small per row; eager is fine for N < 500 logs.

## Open questions about the map specifically

- **Tile vs SVG.** SVG is preferred — no external network, no styling lock-in, scales cleanly. Tiles would force a Leaflet-mini per card which is overkill.
- **Pins for camping locations.** If a multi-day log has camp locations with lat/long (future enhancement), pin them on the mini-map. v1 free-text only, so no pins.

## References that will matter when active

- Slice 03b — `DailyGaugeRollup`: [03b-forecast-snapshot-infra/plan.md](../03b-forecast-snapshot-infra/plan.md)
- Slice 12 flow-resolver pattern (lazy retry against rollup): [lib/log/flow-resolver.ts](../../../lib/log/flow-resolver.ts) — extend to pull the 15-day window, same `tables.DailyGaugeRollup` guard.
- Slice 12b reserved card slots: [12b-river-log-watershed-browse/plan.md](../12b-river-log-watershed-browse/plan.md) — section-map and sparkline placeholders to fill.
- Existing sparkline component: [app/src/components/Sparkline.tsx](../../../app/src/components/Sparkline.tsx) — start by extending this rather than inventing a new one.
- Section geometry: [schemas/corridor.graphql](../../../schemas/corridor.graphql) (`geometryJson`), per-section line trimming TBD.
- Vision: [vision/ux-direction.md](../../vision/ux-direction.md) — "All crafted with custom SVG — don't bring in recharts or another lib."
