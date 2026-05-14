---
slice: 02-watershed-corridor-ia
status: queued
value: 9
confidence: 8
effort: L
depends_on: []
unlocks: [06-map-layering, 07-drivers-and-context-ui, 08-llm-interpretive-summaries, 11-rapid-stub-pages]
opened: 2026-05-13
closed: null
---

# Slice 02 — Watershed → Corridor → Section hierarchy

## Goal

Introduce `Watershed` and `RiverCorridor` as first-class entities. Reorganize the dashboard around watersheds. Add `/watershed/:slug` and `/corridor/:slug` pages with interpretive summaries, maps, and section lists. Breadcrumb on every page.

## Acceptance criteria

1. `/` sidebar groups sections under their watershed (collapsible), with status filter chips on top
2. `/watershed/arkansas` renders watershed summary, snowpack mini-stat, corridor grid
3. `/corridor/arkansas-headwaters` renders corridor map (zoomed) + ordered section list + corridor weather summary
4. Breadcrumb on every non-home page: `Colorado / Arkansas / Arkansas Headwaters / Browns Canyon`
5. Every breadcrumb segment is clickable and goes to the right place
6. Legacy `/section/:id` URLs continue working unchanged
7. Mobile renders the same routes via `ResponsiveX` shells
8. Seed data includes Watersheds and Corridors for all 16 rivers in v1 seed

## Schema additions

```graphql
# schemas/watershed.graphql
type Watershed @table @export {
  id: ID @primaryKey              # "arkansas"
  name: String
  region: String @indexed
  state: String @indexed
  description: String
  summaryMd: String
  summaryUpdatedAt: String
  dominantDriver: String
  peakRunoffMonth: Int
  hucCode: String
  bboxJson: String
  corridors: [RiverCorridor] @relationship(to: "watershedId")
}

# schemas/corridor.graphql
type RiverCorridor @table @export {
  id: ID @primaryKey              # "arkansas-headwaters"
  watershedId: ID @indexed
  watershed: Watershed @relationship(from: "watershedId")
  riverId: ID @indexed
  river: River @relationship(from: "riverId")
  name: String
  shortName: String
  description: String
  summaryMd: String
  summaryUpdatedAt: String
  geometryJson: String
  governingReservoirIds: String
  primaryGaugeId: String
  driver: String @indexed
  sections: [RiverSection] @relationship(to: "corridorId")
}
```

Modify `schemas/river.graphql`:
- `River`: add `watershedId: ID @indexed`. Keep `watershed: String` during transition.
- `RiverSection`: add `corridorId: ID @indexed`, `driver: String @indexed`.

## Files to create

### Backend
- `schemas/watershed.graphql`
- `schemas/corridor.graphql`
- `resources/Watershed.ts` — `GET /Watershed/:id` returns the watershed with embedded corridors + their section snapshots
- `resources/Corridor.ts` — `GET /Corridor/:id` returns corridor with section list + corridor-wide weather summary

### Frontend
- `app/src/pages/WatershedPage.tsx`, `pages/CorridorPage.tsx` — ResponsiveX wrappers
- `app/src/desktop/{DesktopWatershed,DesktopCorridor}.tsx`
- `app/src/mobile/{MobileWatershed,MobileCorridor}.tsx`
- `app/src/components/Breadcrumb.tsx`
- `app/src/hooks/useWatershed.ts`, `hooks/useCorridor.ts`

## Files to modify

- `lib/seed-data.ts` — add `WATERSHEDS` and `CORRIDORS` arrays; group existing `SECTIONS` under corridors via `corridorId`; classify `driver` per section
- `resources/Seed.ts` — upsert Watersheds and Corridors before Sections
- `resources/Dashboard.ts` — group response by watershed; include corridor as the immediate parent of each section
- `resources/RiverDetail.ts` — include `watershed`, `corridor`, breadcrumb data
- `resources/SpaRoutes.ts` — add the new routes to the SPA fallback list
- `app/src/App.tsx` — add `/watershed/:slug` and `/corridor/:slug` routes
- `app/src/desktop/DesktopShell.tsx` — sidebar group-by-watershed; status filter chips on top
- `app/src/lib/transform.ts` — handle new response shape
- `app/src/types.ts` — new view models

## Corridor groupings (seed)

Start with these corridors; expand later:

- `arkansas-headwaters` — Numbers, Fractions, Browns, Bighorn Sheep, Royal Gorge
- `upper-colorado` — Pumphouse, Gore Canyon, Shoshone
- `glenwood-canyon` — Shoshone (overlap with above; pick one)
- `grand-valley` — South Canyon, Cameo to Palisade
- `ruby-horsethief` — Ruby-Horsethief
- `gunnison-headwaters` — Upper Gunnison Almont, Taylor Below Dam
- `gunnison-gorge-corridor` — Gunnison Gorge, Whitewater
- `clear-creek-canyon` — Upper Clear Creek, Lower Clear Creek
- `poudre-canyon` — Upper Poudre Narrows, Lower Poudre Canyon
- `animas-corridor` — Upper Animas, Animas Durango
- `dolores-canyon` — Slick Rock, Gateway
- `eagle-corridor` — Eagle Main, Lower Eagle
- `roaring-fork-corridor` — Slaughterhouse, Lower Roaring Fork
- `yampa-corridor` — Cross Mountain, Dinosaur
- `blue-corridor` — Below Dillon
- `san-miguel-corridor` — Norwood Canyon
- `piedra-corridor` — Lower Piedra Box
- `san-juan-corridor` — Pagosa
- `north-platte-corridor` — Northgate
- `south-platte-corridor` — Waterton, Deckers

(Single-section corridors are fine — corridor is a useful unit even when it has one section, because it sets up multi-section growth.)

## Watershed list (seed)

- `arkansas` — Arkansas River Basin
- `colorado-headwaters` — Upper Colorado / Eagle / Roaring Fork
- `gunnison` — Gunnison Basin
- `south-platte` — South Platte / Clear Creek / Cache la Poudre
- `north-platte` — North Platte
- `yampa-green` — Yampa River Basin
- `san-juan` — San Juan / Piedra
- `dolores` — Dolores / San Miguel

Maps `watershed: String` field to `watershedId` during migration.

## Verification

1. `npm run dev` + `npm run ui:dev`. `/` shows watershed-grouped sidebar.
2. Click watershed name in sidebar → expand/collapse corridors.
3. Click corridor name → navigate to `/corridor/:slug`. Map zoomed to corridor, section list ordered correctly upstream→downstream.
4. Click watershed in breadcrumb → `/watershed/:slug` renders with summary + corridor grid.
5. Hit `GET /Watershed/arkansas` directly — response includes corridors + sections.
6. Mobile: same routes work; ResponsiveX picks mobile shells.
7. Legacy `/section/arkansas-browns-canyon` URL still works; now shows breadcrumb.

## Out of scope (deferred)

- Watershed/corridor interpretive summaries from LLM (slice 08 — for now use manually written Markdown or empty)
- Map layering / tile providers (slice 06)
- Drivers panel UI on watershed/corridor pages (slice 07)
- ContextItem display (slice 07)
- New tiles / styling (slice 06)

## Critical references

- Existing routing: [app/src/App.tsx](../../app/src/App.tsx)
- Existing shell: [app/src/desktop/DesktopShell.tsx](../../app/src/desktop/DesktopShell.tsx)
- River schema: [schemas/river.graphql](../../schemas/river.graphql)
- Vision: [vision/data-model-philosophy.md](../../vision/data-model-philosophy.md) — hierarchy is a one-way door
- Vision: [vision/ux-direction.md](../../vision/ux-direction.md) — information hierarchy per route
