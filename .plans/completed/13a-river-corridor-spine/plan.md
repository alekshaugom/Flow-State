---
slice: 13a-river-corridor-spine
status: done
value: 9
confidence: 7
effort: L
depends_on: [02-watershed-corridor-ia]
unlocks: [13b-multi-section-logs, 06-map-layering, 13c-corridor-map-and-tiles]
opened: 2026-05-25
closed: 2026-05-27
---

# Slice 13a — River corridor spine (Arkansas + Upper Colorado)

## Context

The corridor view today is abstract. [app/src/components/CorridorTile.tsx](../../../app/src/components/CorridorTile.tsx) renders sections as CSS-positioned divs on a vertical rail — useful as a dashboard tile but not river-shaped. The dedicated `/corridor/:slug` page falls back to a flat list of `SectionRow` cards: no spatial sense, no scroll-locked active section, no detail pane. We have everything to do better:

- NHDPlus HR polylines for every modeled section in [app/src/lib/river-geometries.ts](../../../app/src/lib/river-geometries.ts) (generated 2026-05-12 via `scripts/generate-geometries.ts`)
- 30+ curated access points on the Arkansas with snapped riverMiles in [lib/curated-river-data.ts](../../../lib/curated-river-data.ts) (commit 9397a95)
- 7 Arkansas USGS gauges + the terminal Pueblo Dam as an `ImpassablePoint`
- A schema model where sections link AP→AP via `fromAccessPointId` / `toAccessPointId`

This slice turns the corridor page into a vertical SVG river spine that mirrors actual river shape (Y = true river-mile, X = lateral deviation from a smoothed centerline), tracks the active section by scroll position, and drives a sticky right-side detail pane with section metadata, gauge readout, and access points. Sections gain a `parentSectionId` so Browns Canyon can split into Upper/Lower and Milk Run into its sub-runs without losing the parent identity. Arkansas + Upper Colorado are the two corridors that ship in this slice; other corridors keep the existing `SectionRow` fallback until a follow-up.

The currently-active 12c-river-log-sharing slice is still an `intent.md` (never expanded). 13a supersedes it; 12c re-queues behind 13b.

## Goal

Ship `/corridor/arkansas-headwaters` and `/corridor/upper-colorado` with: real river-shape SVG spine, hierarchical sections, scroll-driven active selection, sticky gauge readout that locks per section, click-to-scroll, mobile parity. No log schema change in this slice — multi-section logging is 13b.

## Acceptance criteria

1. **Real river shape.** Both corridor pages render the corridor as a single continuous SVG path derived from NHDPlus polylines — visibly mirrors the real bends, never crosses or doubles back.
2. **Vertical scroll.** Total spine height = `totalRiverMiles × pixelsPerMile` (default 80 px/mile). Scrolls top-to-bottom in a fixed left column.
3. **Hierarchical sections.** Arkansas has these named sections in downstream order, with parent/child relationships where listed:
   - The Numbers *(existing — becomes parent for Pine Creek)*
     - Pine Creek *(new, child)*
   - Town / Boat Chute *(new, top-level)*
   - The Fractions *(existing)*
   - Milk Run *(new, top-level parent)*
     - Upper Milk Run *(new, child)*
     - Lower Milk Run *(new, child)*
   - Browns Canyon *(existing — becomes parent)*
     - Upper Browns *(new, child)*
     - Lower Browns *(new, child)*
   - Big Bend *(new, top-level)*
   - Bighorn Sheep Canyon *(existing)*
   - Royal Gorge *(existing)*

   Upper Colorado retains its current 3 sections (Gore Canyon, Pumphouse, Shoshone) with no new sub-divisions yet.
4. **Active section by scroll.** The viewport's vertical center maps to a river-mile via the spine's Y-axis. The section whose mile range contains that mile is "active." Active state visually distinguishes on the spine and updates the right pane within 16 ms of scroll.
5. **Position dot.** A horizontal indicator dot sits at the viewport's vertical center, anchored to the path's (x, y) at the current river-mile. It moves laterally as the river bends.
6. **Click to scroll.** Clicking an access point, gauge, dam, or section label on the spine smoothly scrolls so that mile is at the viewport center.
7. **Sticky gauge lock.** The right pane shows the active section's primary gauge readout. As the user scrolls into the next section whose primary gauge differs, the readout swaps. Within a section the readout is "locked."
8. **Right pane content.** Active section's: name, parent (if any), difficulty, length, status pill, primary gauge readout, up to 4 access points (put-in / take-out / alternates), 0–N subtle access-norm notes ("Fisherman's Bridge: commercial AP", "Ruby Mountain: private boaters"), 0–1 impassable-point notice.
9. **Access norm notes.** Notes render as small italic ink-3 lines beneath each AP, not chips or badges.
10. **Existing sections preserved.** Logs and section detail pages for `arkansas-numbers`, `arkansas-browns-canyon`, etc. continue to work. The hierarchical rollout is additive.
11. **Mobile parity.** On viewports < 768 px the layout collapses to spine-on-top, detail-below, with the same scroll-driven active-section update.

## Approach

### 1. Schema — add `parentSectionId` to RiverSection

Add one nullable indexed field to `RiverSection` in [schemas/river.graphql](../../../schemas/river.graphql):

```graphql
parentSectionId: ID @indexed
```

Null = top-level section. Set = child of the referenced section. The detail page for a parent shows aggregate metadata + a list of children; the corridor spine renders both levels (parents as a wider band behind their children).

### 2. Section seed extension — Arkansas

Add new rows to the SECTIONS array in [lib/seed-data.ts](../../../lib/seed-data.ts):

| id | parentSectionId | name | put-in → take-out (mile) | primary gauge |
|---|---|---|---|---|
| `arkansas-pine-creek` | `arkansas-numbers` | Pine Creek | Granite → Clear Creek (0–2) | `usgs-07086000` |
| `arkansas-town-boat-chute` | null | Town / Boat Chute | Railroad Bridge → BV WW Park (13–18) | `usgs-07087050` |
| `arkansas-milk-run` | null | Milk Run | Fisherman's Bridge → Ruby Mountain (34–38) | `usgs-07091200` |
| `arkansas-milk-run-upper` | `arkansas-milk-run` | Upper Milk Run | Fisherman's Bridge → Frog Rock (34–36) | `usgs-07091200` |
| `arkansas-milk-run-lower` | `arkansas-milk-run` | Lower Milk Run | Frog Rock → Ruby Mountain (36–38) | `usgs-07091200` |
| `arkansas-browns-upper` | `arkansas-browns-canyon` | Upper Browns | Ruby Mountain → Hecla Junction | `usgs-07091200` |
| `arkansas-browns-lower` | `arkansas-browns-canyon` | Lower Browns | Hecla Junction → Stone Bridge | `usgs-07091200` |
| `arkansas-big-bend` | null | Big Bend | Stone Bridge → Salida WW Park | `usgs-07091500` *(merged via CURATED_GAUGES)* |

`usgs-07091500` is already in CURATED_GAUGES; it gets pushed into the `GAUGES` array at module load (lib/seed-data.ts:263), so no new gauge row is needed.

Frog Rock AP (`ap_arkansas-headwaters_frog-rock`) exists in CURATED_ACCESS_POINTS but lacks lat/lng/riverMile. The Milk Run Upper/Lower split assumes this AP gets a coordinate populated either by re-running `scripts/compute-river-miles.mjs` after manual curation, or by accepting an approximate position interpolated between Fisherman's Bridge (mile 33.95) and Ruby Mountain (mile 37.58) — pick ~mile 35.5 as a placeholder until field-curated.

### 3. SECTION_LEG_MAPPING — new entries

Add to [scripts/access-points-draft.json](../../../scripts/access-points-draft.json) (the codegen source for [lib/curated-river-data.ts](../../../lib/curated-river-data.ts)) — one section-leg entry per new section:

```json
"arkansas-pine-creek":        { fromAccessPointId: "ap_arkansas-headwaters_granite",              toAccessPointId: "ap_arkansas-headwaters_clear-creek" },
"arkansas-town-boat-chute":   { fromAccessPointId: "ap_arkansas-headwaters_railroad-bridge",      toAccessPointId: "ap_arkansas-headwaters_buena-vista-whitewater-park" },
"arkansas-milk-run":          { fromAccessPointId: "ap_arkansas-headwaters_fisherman-s-bridge-browns-top", toAccessPointId: "ap_arkansas-headwaters_ruby-mountain" },
"arkansas-milk-run-upper":    { fromAccessPointId: "ap_arkansas-headwaters_fisherman-s-bridge-browns-top", toAccessPointId: "ap_arkansas-headwaters_frog-rock" },
"arkansas-milk-run-lower":    { fromAccessPointId: "ap_arkansas-headwaters_frog-rock",            toAccessPointId: "ap_arkansas-headwaters_ruby-mountain" },
"arkansas-browns-upper":      { fromAccessPointId: "ap_arkansas-headwaters_ruby-mountain",        toAccessPointId: "ap_arkansas-headwaters_hecla-junction" },
"arkansas-browns-lower":      { fromAccessPointId: "ap_arkansas-headwaters_hecla-junction",       toAccessPointId: "ap_arkansas-headwaters_stone-bridge" },
"arkansas-big-bend":          { fromAccessPointId: "ap_arkansas-headwaters_stone-bridge",         toAccessPointId: "ap_arkansas-headwaters_salida-whitewater-park" }
```

Regenerate via `node scripts/generate-curated-data.mjs`.

### 4. Geometry pipeline extension

Extend [scripts/generate-geometries.ts](../../../scripts/generate-geometries.ts) to:
- Read SECTION_LEG_MAPPING + AP coords for the 8 new sections (or 6 if we skip the parent Milk Run / use child concatenation).
- Query NHDPlus HR for each new section's AP-to-AP range.
- Emit polylines into [app/src/lib/river-geometries.ts](../../../app/src/lib/river-geometries.ts) keyed by section id.

For parent sections (Milk Run, Browns Canyon), geometry = concatenation of children's polylines downstream — no separate fetch needed.

Also emit a **corridor-level cumulative-mile lookup** alongside the per-section geometries — `CORRIDOR_GEOMETRIES: Record<corridorId, { totalMiles: number; polyline: [lon, lat, cumMile][] }>` covering the whole corridor end-to-end. The spine uses this; sections are mile-ranged windows into it.

### 5. Path transformation (pure helper)

New file: `app/src/lib/corridor-spine-pure.ts`. Exports:

- `cumulativeMiles(polyline: [lon, lat][]): number[]` — haversine per segment, prefix sum
- `projectToVertical(polyline, cumMiles): { x, y, mile }[]` — principal axis via 2D covariance + eigenvector; `y = mile`, `x = signed perpendicular distance from axis (in projected meters)`
- `smoothLateral(points, window = 5): points` — moving-average over X to dampen tight bends
- `normalizeLateral(points, laneHalfWidthPx, ampPx): points` — scale X so the 95th-percentile of |x| fits inside the lane
- `catmullRomPath(points): string` — generate an SVG `d` attribute via Catmull-Rom-to-cubic-Bezier
- `pointAtMile(points, mile): { x, y }` — binary search + linear interpolation

All pure, unit-tested in `test/corridor-spine-pure.test.js`.

Vertical pixel density (`pixelsPerMile`) is a prop with default 80 (so a 100-mile corridor is 8000 px tall). Lane half-width = 64 px.

### 6. Components — frontend

New components in [app/src/components/](../../../app/src/components/):

- **`CorridorSpine.tsx`** — the SVG spine itself. Renders the path, markers (APs, gauges, dams), section bands, and an active-section highlight. Props: `tile: CorridorTileData` + corridor geometry + `pixelsPerMile` + `activeMile` (controlled) + `onSelectMile` (callback).
- **`CorridorSpineColumn.tsx`** — page-level wrapper that owns scroll state. Uses scroll position / IntersectionObserver to track which mile is at viewport center; emits `activeMile`. Renders `CorridorSpine` inside a scroll container with a fixed-position dot indicator at vertical center.
- **`CorridorSpineDetailPane.tsx`** — sticky right pane. Takes `activeSectionId` + derived data. Shows: section name + parent, status pill, primary gauge readout (reuses `BigCFS` + `StatusPill`), sparkline, length, difficulty, AP list, notes.

Refactor:
- **[app/src/desktop/DesktopCorridor.tsx](../../../app/src/desktop/DesktopCorridor.tsx)** — replace the `SectionRow` list with `<CorridorSpineColumn>` (left) + `<CorridorSpineDetailPane>` (right) inside a two-column grid. Sticky title remains.
- **[app/src/mobile/MobileCorridor.tsx](../../../app/src/mobile/MobileCorridor.tsx)** — single-column spine + collapsible detail card pinned below.

The homepage `CorridorTile.tsx` rail does **not** change in this slice.

### 7. Resource — extend CorridorView

[resources/CorridorView.ts](../../../resources/CorridorView.ts):
- Return `parentSectionId` per section.
- Return `corridorMileSpan: { startMile, endMile }` per section (computed from the AP riverMiles).
- Return corridor geometry summary (`totalMiles`, polyline array). Source: the new `CORRIDOR_GEOMETRIES` constant. Verify the import path works in Harper's runtime; otherwise create a server-side mirror at `lib/corridor-geometries.ts`.
- Sort sections by `sortIndex` ascending = upstream → downstream.

[resources/CorridorTiles.ts](../../../resources/CorridorTiles.ts) does NOT change in 13a.

### 8. Hooks

- Extend [app/src/hooks/useCorridor.ts](../../../app/src/hooks/useCorridor.ts) to return the new fields. No new hook needed.
- New scroll hook: `app/src/hooks/useActiveMile.ts` — wraps IntersectionObserver / scroll position math. Pure-test the mile math separately.

## Critical files (modified)

- [schemas/river.graphql](../../../schemas/river.graphql) — add `parentSectionId`
- [lib/seed-data.ts](../../../lib/seed-data.ts) — 8 new Arkansas section rows
- [scripts/access-points-draft.json](../../../scripts/access-points-draft.json) — new SECTION_LEG entries; possible Frog Rock coords
- [scripts/generate-curated-data.mjs](../../../scripts/generate-curated-data.mjs) + [lib/curated-river-data.ts](../../../lib/curated-river-data.ts) — regenerate
- [scripts/generate-geometries.ts](../../../scripts/generate-geometries.ts) — fetch new polylines + emit corridor-level cumulative mile array
- [app/src/lib/river-geometries.ts](../../../app/src/lib/river-geometries.ts) — regenerated (auto)
- [resources/CorridorView.ts](../../../resources/CorridorView.ts) — hierarchy + mile spans + corridor geometry
- [app/src/lib/corridor-spine-pure.ts](../../../app/src/lib/corridor-spine-pure.ts) — **new**
- [app/src/hooks/useActiveMile.ts](../../../app/src/hooks/useActiveMile.ts) — **new**
- [app/src/components/CorridorSpine.tsx](../../../app/src/components/CorridorSpine.tsx) — **new**
- [app/src/components/CorridorSpineColumn.tsx](../../../app/src/components/CorridorSpineColumn.tsx) — **new**
- [app/src/components/CorridorSpineDetailPane.tsx](../../../app/src/components/CorridorSpineDetailPane.tsx) — **new**
- [app/src/desktop/DesktopCorridor.tsx](../../../app/src/desktop/DesktopCorridor.tsx) — swap section list for spine + pane
- [app/src/mobile/MobileCorridor.tsx](../../../app/src/mobile/MobileCorridor.tsx) — same
- [test/corridor-spine-pure.test.js](../../../test/corridor-spine-pure.test.js) — **new**, ~15 tests

## Verification

1. **Tests.** `npm test` — corridor-spine-pure suite passes; all existing tests still green.
2. **Build.** `npm run ui:build` clean; no TypeScript errors.
3. **Dev server.** `npm run dev` + `npm run ui:dev`; load `/corridor/arkansas-headwaters`.
4. **Visual check — Arkansas.**
   - Spine is one continuous curve from Granite to near Pueblo Dam.
   - Bends match real river (verify against satellite for Browns + Royal Gorge S-curves).
   - Section labels at correct downstream positions; sortIndex order verified by scrolling top→bottom.
   - Parent sections (Browns Canyon, Milk Run, Numbers-with-Pine-Creek) render as wider bands behind their children.
5. **Scroll interaction.**
   - Active section updates without lag during scroll.
   - Position dot follows the curve laterally through Numbers and Royal Gorge bends.
   - Gauge readout swaps when crossing primary-gauge boundaries (Fractions 07091200 → Big Bend 07091500), no flicker within a section.
6. **Click interaction.**
   - Clicking an AP centers it; right pane updates within 200 ms.
   - Clicking a section label centers its midpoint.
7. **Visual check — Upper Colorado.** Load `/corridor/upper-colorado`. Gore Canyon's drop is visible; Pumphouse → State Bridge looks distinct.
8. **Mobile.** 375 × 812 — spine + detail-below layout intact.
9. **Regression.** Unconverted corridors (Clear Creek Canyon, Poudre, etc.) still render via the old `SectionRow` fallback or via the new spine without errors.
10. **Use `preview_*` tools** for browser verification per CLAUDE.md.

## Open questions to resolve during work

1. **Frog Rock coords.** No riverMile or lat/lng. Either populate from a NHDPlus snap at approx position (estimate ~mile 35.5) or skip Upper/Lower split and ship Milk Run as a single section. Default: ship Milk Run + a single placeholder child if AP data is missing.
2. **Existing section spans.** Verify the current Fractions section's mile range (BV WW Park 17.64 → Fisherman's 33.95 = ~16 mi). User spec ordering ("Fractions" #3, "Town/Boat Chute" #4) suggests their mental model has "Fractions" upstream of BV; we keep the existing Fractions span (downstream of BV) to avoid breaking existing logs, and Town/Boat Chute slots upstream of BV (Railroad Bridge → BV WW Park). Note in commit message + flag to user.
3. **Pine Creek overlap with Numbers.** Pine Creek (0–2 mi) is nested inside Numbers (0–13 mi). Modeled as child via `parentSectionId`. Active-section precedence: child wins when active mile falls inside child's range.
4. **Royal Gorge dam portage notes.** Pueblo Dam is downstream of Royal Gorge, not inside it. The existing `notes` field on `ImpassablePoint` carries portage prose — surface in the right pane when scrolling past one. No new schema needed.

## Slice paperwork

- This file (`13a-river-corridor-spine/plan.md`) — created 2026-05-25
- `13a-river-corridor-spine/status.md` — empty, ready for dated bullets
- `13b-multi-section-logs/plan.md` — created (queued)
- `.plans/ROADMAP.md` — updated: 12c re-queued, 13a active, 13b queued
