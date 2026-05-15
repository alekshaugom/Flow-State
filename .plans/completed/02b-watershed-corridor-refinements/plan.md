---
slice: 02b-watershed-corridor-refinements
status: done
value: 8
confidence: 9
effort: M
depends_on: [02-watershed-corridor-ia]
unlocks: [06-map-layering]
opened: 2026-05-14
closed: 2026-05-14
---

# Slice 02b — Watershed page refactor + section ordering audit

## Goal

Refine the slice 02 IA based on live review:

1. Add explicit `sortIndex` to `RiverSection` and `RiverCorridor` so geographic ordering is data-driven, not inferred from name/scan-order.
2. Audit every watershed and corridor and assign sortIndex values in true upstream→downstream order.
3. Refactor the watershed page (desktop + mobile) so each corridor card embeds its section list inline — status pill, sparkline, current flow per section. Eliminate the obligatory extra click into the corridor page.
4. Reserve visual space at the top of each corridor card for a future aerial/map header image.

The slice keeps the existing route structure intact (the `/corridor/:slug` URL still works via breadcrumb and direct link), and keeps the watershed-grouped sidebar from slice 02 unchanged.

## Acceptance criteria

1. `RiverSection.sortIndex: Int @indexed` and `RiverCorridor.sortIndex: Int @indexed` exist in the schemas.
2. Every section and every corridor in `lib/seed-data.ts` has an explicit `sortIndex`.
3. `GET /WatershedView/arkansas` returns corridors sorted by `sortIndex`, each with sections sorted by `sortIndex`. Arkansas Headwaters returns Numbers → Fractions → Browns Canyon → Bighorn Sheep → Royal Gorge.
4. `GET /CorridorView/arkansas-headwaters` returns the same five sections in the same order.
5. `/watershed/:slug` desktop page renders corridor cards stacked vertically (one per row), each with:
   - A placeholder map-header region at the top of the card (~96 px tall, tinted block with `// MAP · COMING SOON` eyebrow).
   - Corridor name + driver tag.
   - A row per child section: `[status pill] [section name + class] [sparkline] [current flow + unit]` — same visual language as the current section list in `DesktopCorridor.tsx`.
   - Sections within each card are in upstream→downstream order.
   - Clicking a section row navigates to `/section/:slug` directly.
6. `/watershed/:slug` mobile page mirrors the same structure stacked vertically.
7. `/corridor/:slug` URL keeps working for deep links and breadcrumb back-navigation; no UI regression there.
8. `/section/arkansas-browns-canyon` breadcrumb still resolves correctly.
9. A comment block in `lib/seed-data.ts` documents the sortIndex convention.
10. Existing tests still pass.

## Schema additions

`schemas/river.graphql`: add `sortIndex: Int @indexed` to `RiverSection`.
`schemas/corridor.graphql`: add `sortIndex: Int @indexed` to `RiverCorridor`.

## Section / corridor ordering tables

Within each corridor (smaller = more upstream):

| Corridor | Section | sortIndex |
|---|---|---|
| arkansas-headwaters | arkansas-numbers | 10 |
| arkansas-headwaters | arkansas-fractions | 20 |
| arkansas-headwaters | arkansas-browns-canyon | 30 |
| arkansas-headwaters | arkansas-bighorn-sheep | 40 |
| arkansas-headwaters | arkansas-royal-gorge | 50 |
| upper-colorado | colorado-gore-canyon | 10 |
| upper-colorado | colorado-pumphouse | 20 |
| glenwood-canyon | colorado-shoshone | 10 |
| grand-valley | colorado-south-canyon | 10 |
| grand-valley | colorado-cameo-to-palisade | 20 |
| ruby-horsethief | colorado-ruby-horsethief | 10 |
| gunnison-headwaters | taylor-river-below-dam | 10 |
| gunnison-headwaters | gunnison-upper-almont | 20 |
| gunnison-gorge-corridor | gunnison-gorge | 10 |
| gunnison-gorge-corridor | gunnison-whitewater | 20 |
| clear-creek-canyon | clear-creek-upper | 10 |
| clear-creek-canyon | clear-creek-lower | 20 |
| poudre-canyon | poudre-upper-narrows | 10 |
| poudre-canyon | poudre-lower-canyon | 20 |
| south-platte-corridor | south-platte-deckers | 10 |
| south-platte-corridor | south-platte-waterton | 20 |
| north-platte-corridor | north-platte-northgate | 10 |
| yampa-corridor | yampa-cross-mountain | 10 |
| yampa-corridor | yampa-dinosaur | 20 |
| animas-corridor | animas-upper-silverton | 10 |
| animas-corridor | animas-durango | 20 |
| piedra-corridor | piedra-lower-box | 10 |
| san-juan-corridor | san-juan-pagosa | 10 |
| dolores-canyon | dolores-slick-rock | 10 |
| dolores-canyon | dolores-gateway | 20 |
| san-miguel-corridor | san-miguel-norwood | 10 |
| eagle-corridor | eagle-main | 10 |
| eagle-corridor | eagle-lower | 20 |
| roaring-fork-corridor | roaring-fork-slaughterhouse | 10 |
| roaring-fork-corridor | roaring-fork-lower | 20 |
| blue-corridor | blue-below-dillon | 10 |

Within each watershed (corridor order):

| Watershed | Corridor | sortIndex |
|---|---|---|
| arkansas | arkansas-headwaters | 10 |
| colorado-headwaters | upper-colorado | 10 |
| colorado-headwaters | blue-corridor | 20 |
| colorado-headwaters | eagle-corridor | 30 |
| colorado-headwaters | glenwood-canyon | 40 |
| colorado-headwaters | roaring-fork-corridor | 50 |
| colorado-headwaters | grand-valley | 60 |
| colorado-headwaters | ruby-horsethief | 70 |
| gunnison | gunnison-headwaters | 10 |
| gunnison | gunnison-gorge-corridor | 20 |
| south-platte | south-platte-corridor | 10 |
| south-platte | clear-creek-canyon | 20 |
| south-platte | poudre-canyon | 30 |
| north-platte | north-platte-corridor | 10 |
| yampa-green | yampa-corridor | 10 |
| san-juan | animas-corridor | 10 |
| san-juan | piedra-corridor | 20 |
| san-juan | san-juan-corridor | 30 |
| dolores | dolores-canyon | 10 |
| dolores | san-miguel-corridor | 20 |

## Files to modify

### Backend
- `schemas/river.graphql` — add `sortIndex` to RiverSection.
- `schemas/corridor.graphql` — add `sortIndex` to RiverCorridor.
- `lib/seed-data.ts` — add `sortIndex` to every CORRIDOR and every SECTION; prepend the sortIndex documentation comment.
- `resources/Seed.ts` — the existing `action: 'hierarchy'` branch re-upserts corridors and sections; no new action needed, just needs to re-run after seed-data update.
- `resources/WatershedView.ts` — sort `corridors` by `sortIndex`; sort embedded `sections` by `sortIndex`.
- `resources/CorridorView.ts` — sort `sections` by `sortIndex`.
- `resources/Dashboard.ts` — sort sections within a watershed group by `(corridor.sortIndex, section.sortIndex)` instead of by status.

### Frontend
- `app/src/components/SectionRow.tsx` (new) — shared section-row component used by both watershed embedded view and the standalone corridor page. Props `{ section, density: 'desktop' | 'mobile' }`.
- `app/src/desktop/DesktopWatershed.tsx` — replace the auto-grid of compact corridor cards with a vertical stack of expanded corridor cards (map-header placeholder + embedded section rows via `SectionRow`).
- `app/src/mobile/MobileWatershed.tsx` — same restructure (single-column stack).
- `app/src/desktop/DesktopCorridor.tsx` — adopt `SectionRow` to keep visual parity with the embedded watershed view.
- `app/src/mobile/MobileCorridor.tsx` — adopt `SectionRow`.

### Not modified
- `app/src/desktop/DesktopShell.tsx` — watershed-grouped sidebar from slice 02 stays.
- `app/src/components/Breadcrumb.tsx` — no change.

## Critical references

- `app/src/desktop/DesktopCorridor.tsx` — section-row layout to lift into `SectionRow.tsx`.
- `app/src/components/Sparkline.tsx` — props: `data`, `width`, `height`, `status`.
- `.plans/lessons/L004` — keep using the cached `listWatersheds()` / `listCorridors()` helpers, no new filtered `search`.

## Verification

1. Restart Harper; confirm no `Conflicting paths` errors.
2. `curl -u 'HDB_ADMIN:password' -X POST -H 'Content-Type: application/json' -d '{"action":"hierarchy"}' http://localhost:9926/Seed` to backfill `sortIndex`.
3. API: `GET /CorridorView/arkansas-headwaters` returns the five sections in the corrected order. `GET /WatershedView/colorado-headwaters` returns seven corridors in `(upper-colorado, blue-corridor, eagle-corridor, glenwood-canyon, roaring-fork-corridor, grand-valley, ruby-horsethief)`.
4. UI walk at 1400×900: `/watershed/arkansas` shows one Arkansas Headwaters card with five embedded section rows in correct order. `/watershed/south-platte` shows three corridor cards. `/watershed/colorado-headwaters` shows seven cards.
5. Clicking a section row → `/section/:slug` directly. `View corridor →` link still routes to `/corridor/:slug`.
6. Mobile 375 px viewport: `/watershed/arkansas` shows the same stack with compact rows.
7. Sidebar `/`: Arkansas group's "All" filter now starts at Numbers, not Bighorn Sheep.
8. `npm test` — 13/13 pass.
