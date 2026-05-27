---
slice: 13c-corridor-map-and-tiles
status: in-review
value: 9
confidence: 8
effort: L
depends_on: [13a-river-corridor-spine]
unlocks: [13b-multi-section-logs, 06-map-layering]
opened: 2026-05-27
closed: null
---

# Slice 13c — Corridor map + scroll-driven section tiles (Arkansas Headwaters)

## Context

13a shipped `/corridor/:slug` with a vertical SVG spine + sticky compact detail pane. The spine projects NHDPlus polylines via principal-axis projection onto a single vertical lane — so even though the line bends laterally, the real geographic shape is squashed into a "straightened" stripe. The user wants the left column to read like a real map of the river corridor — actual bends, surrounding terrain, named features visible at a glance — and the right column to be a vertical stack of full section detail tiles (parity with the deployed `/section/:id` page) instead of one swap-on-scroll compact pane. As the user scrolls the tile stack, a position dot floats along the real river path on the map, access points dim/light up by proximity, and a rectangular DOM callout anchored at the active section's midpoint points right toward the active tile.

The data we need exists: `RIVER_GEOMETRIES` (NHDPlus per-section polylines), `CURATED_ACCESS_POINTS` with `riverMile` + `lat/lng`, `IMPASSABLE_POINTS` for dams, `CURATED_GAUGES` with coordinates, `assembleCorridorPolyline` to chain them into one corridor polyline with cumulative miles. `pointAtMile()` in `corridor-spine-pure.ts` already converts mile → polyline point. The 13a scroll-driven `activeMile` logic is preserved — what changes is that the polyline now drives a map dot's geographic position (via `map.project()` → screen pixels) instead of an SVG y-coordinate.

## Goal

Ship `/corridor/arkansas-headwaters` with: a styled MapLibre GL JS basemap on the left (sticky, full viewport height), scroll-driven position dot tracking the river path, AP/dam/gauge markers with dim-until-passed lighting, a rectangular DOM callout pointing right at the active section, and a vertical stack of section tiles on the right where each tile is compact-by-default and expands to render the full deployed `DesktopDetail` content on right-side click. Other corridors keep the 13a spine fallback. Mobile collapses to map-on-top + tiles-below.

## Acceptance criteria

1. **MapLibre basemap renders the full style spec.** Paper `#f3ecd8` background, sage `#a8c08a` unified landcover (wood + grass + scrub + park), alpine `#f5efe0` overlay, dimmed roads (`0.28`), dashed purple boundaries, Esri hillshade (opacity `0.42`), OpenTopoMap contours (opacity `0.22`), and the three-tier navy `#1e3a8a` water hierarchy with the Arkansas River drawn as a halo + main pair. Custom layers inserted before the first symbol layer so labels stay on top.
2. **Fixed corridor bounds.** Map fits to the corridor polyline's bbox on load with reasonable padding. Pan/zoom interaction enabled but the initial frame stays put across scroll.
3. **Position dot tracks scroll.** As the right column scrolls, the dot floats along the polyline at `pointAtMile(activeMile)`. The dot is anchored geographically; on map pan/zoom it stays glued to the river point.
4. **Access points dim by progress.** APs at `riverMile <= activeMile` are "lit" (full opacity, river-700 fill); APs ahead are "dimmed" (ink-3 stroke, ~35% opacity).
5. **Active section glows.** The polyline sub-segment for the active section renders thicker + saturated; non-active sub-segments render thinner + 60% opacity.
6. **Right-pointing callout.** A DOM-rendered rounded rectangle with a right-pointing tip (CSS triangle) appears anchored at the active section's midpoint on the map, containing the section name. Repositions on map move/zoom and on active-section change.
7. **Section tile stack on the right.** One `<SectionTile>` per section in the corridor (top-level + child rows), rendered in upstream→downstream order. Compact by default: eyebrow (`river · classification · miles`), name, `BigCFS` hero, status pill + trend chip, small sparkline.
8. **Click-to-expand.** Clicking an "Expand →" affordance on the right edge of a compact tile expands it inline to render the full `DesktopDetail` body: ideal-band card, flow history chart with range selector (7/30/90/180/360) + tooltip, 14-day forecast band with confidence + verbal direction, weather strip with icons, "What's happening" notes, Context strip (snowpack + dams), past trips. Click again or "Collapse" to hide. Multiple tiles can be expanded independently.
9. **Active tile by viewport center.** The tile whose vertical midpoint is closest to viewport center is the "active" tile; `activeSectionId` is set from it. Works correctly when expanded tiles change heights. Within a tile's vertical range, `activeMile` interpolates linearly so the dot moves smoothly through the section's mile span.
10. **Arkansas Headwaters only.** `DesktopCorridor.tsx` routes corridor slug `arkansas-headwaters` to the new map+tiles layout. All other corridors continue using the 13a `CorridorSpineColumn` + `CorridorSpineDetailPane` path.
11. **Mobile parity.** Below 768 px, the layout stacks: map sticky-top at ~45vh, tiles below. Dot still tracks scroll. Callout points downward toward the tile when in mobile mode.
12. **No homepage regression.** `/` corridor tiles (`HomeCorridorSpineTile`) are untouched.

## Approach

### 1. Install MapLibre GL JS

Add `maplibre-gl@4.7.1` to dependencies. Import CSS once at app root.

### 2. New file: `app/src/lib/corridor-map-style.ts`

Pure helper that, given a map instance + `targetRiverName`, applies the full style spec (steps 0–7 from the user's brief, verbatim):

- Identify first symbol layer; insert custom layers before it.
- Recolor background to paper `#f3ecd8`.
- Hide default `waterway` layers (replaced by the tiered set).
- Roads: `line-opacity = 0.28` for every `transportation` line layer.
- Admin boundaries: `rgba(106,43,240,0.55)`, width `1.25`, blur `1.5`, dasharray `[3, 2]`.
- Esri hillshade raster (`raster-opacity 0.42`, `raster-saturation -0.15`).
- Sage landcover: park (wrap in try/catch), wood/grass/scrub at `#a8c08a` opacity `1.0`.
- Alpine overlay: ice/snow/glacier/rock at `#f5efe0` opacity `0.85`.
- OpenTopoMap contours raster (opacity `0.22`, sat `-0.45`, contrast `0.18`).
- Three-tier water hierarchy in order: streams (T3) → tributaries (T2, all rivers except target) → target river halo + main (T1), all using `#1e3a8a` with zoom-interpolated widths and tier-distinct opacities/blurs per spec.

Export: `applyCorridorMapStyle(map: maplibregl.Map, targetRiverName: string): void`.

### 3. New file: `app/src/lib/corridor-map-data.ts`

Pure helpers:
- `polylineToLineStringFeature(polyline, properties)` — GeoJSON conversion.
- `sectionSubPolyline(polyline, startMile, endMile)` — slices the assembled polyline at mile boundaries (interpolating endpoints).
- `pointAtMileGeographic(polyline, mile)` — thin wrapper around existing `pointAtMile`.
- `corridorBoundsFromPolyline(polyline): [west, south, east, north]` — bbox for `fitBounds`.

Pure-tested in `corridor-map-data.test.ts` (~10–12 tests).

### 4. New file: `app/src/components/CorridorMap.tsx`

Props:

```ts
interface CorridorMapProps {
  corridorPolyline: Array<[number, number, number]>; // [lng, lat, cumMile]
  targetRiverName: string;
  sections: Array<{ id: string; name: string; status: string; startMile: number; endMile: number }>;
  accessPoints: Array<{ id: string; name: string; kind: string; lng: number; lat: number; riverMile: number | null }>;
  dams: Array<{ id: string; name: string; lng: number; lat: number; riverMile: number | null }>;
  gauges: Array<{ id: string; name: string; lng: number; lat: number; riverMile: number | null; currentFlow: number | null; unit: string }>;
  activeMile: number | null;
  activeSectionId: string | null;
  onSelectSection?: (sectionId: string) => void;
}
```

Internal:
- Mounts a `maplibregl.Map` once with `style: 'https://tiles.openfreemap.org/styles/positron'`, `minZoom: 7`, `maxZoom: 14`.
- On `load`: calls `applyCorridorMapStyle(map, targetRiverName)`; adds GeoJSON sources for `sections-paths`, `aps`, `dams`, `gauges`, `active-dot`; adds corresponding paint layers.
- Calls `fitBounds(corridorBoundsFromPolyline(corridorPolyline), { padding: 40 })`.
- On `activeMile` change: updates `active-dot` source data; updates AP layer paint via `["case", ["<=", ["get", "riverMile"], <mile>], ...]` data-driven expression for dim/lit.
- On `activeSectionId` change: paint-updates section sub-paths to thicken the active one.
- Renders the callout as an absolutely-positioned div over the map; position recomputed from `map.project([midLng, midLat])` on `move`/`zoom` events and on prop change.

### 5. Refactor `DesktopDetail.tsx` → extract `SectionDetailBody.tsx`

Move the body of `DesktopDetail` (everything below the breadcrumb) into a new `app/src/components/SectionDetailBody.tsx`. `DesktopDetail` becomes a thin wrapper: breadcrumb + `<SectionDetailBody sectionId={sectionId} />`. `SectionTile` calls `SectionDetailBody` directly when expanded.

### 6. New file: `app/src/components/SectionTile.tsx`

Props:

```ts
interface SectionTileProps {
  section: CorridorSection;   // includes the compact-view fields already on /CorridorView response
  expanded: boolean;
  onToggle: () => void;
  onRefChange: (el: HTMLElement | null) => void;
}
```

Compact view: eyebrow (river · classification · miles), name, `BigCFS`, `StatusPill`, `TrendChip`, mini `Sparkline`, right-side "Expand →" affordance. Expanded view: renders `<SectionDetailBody sectionId={section.id} />` (which fetches the heavy data lazily via `useRiverDetail`). Both views share the same outer card styling so expand/collapse is smooth.

### 7. New file: `app/src/hooks/useActiveTile.ts`

Variable-height tile tracker. Pure helper + React hook:

- A `TileRegistry` context tracks `{ id: string; el: HTMLElement; startMile: number; endMile: number }` for every tile.
- The hook attaches a scroll listener (rAF-throttled), iterates tiles, finds the one whose vertical center is closest to viewport center, and interpolates `activeMile` linearly within its mile range.
- Returns `{ activeSectionId, activeMile }`.

Pure-test the interpolation math in `use-active-tile-pure.test.ts`.

### 8. New file: `app/src/components/CorridorMapColumn.tsx`

Top-level wrapper. Sticky-left `<CorridorMap>` + scrollable-right tile stack rendered via the tile registry. Owns `expandedById: Set<string>` state. Receives the assembled corridor polyline + section/AP/dam/gauge data from `useCorridor()`.

### 9. Refactor `DesktopCorridor.tsx`

Slug gate at the top:

```tsx
const USE_MAP_TILES = slug === 'arkansas-headwaters';
```

If true, render `<CorridorMapColumn>`; else keep the existing spine + detail pane path.

### 10. Refactor `MobileCorridor.tsx`

Same slug gate. Mobile layout: map sticky-top (45vh), tile stack below. Same `useActiveTile` semantics. Callout tip flips downward.

### 11. Resource

`resources/CorridorView.ts` already returns everything we need. No backend changes for 13c.

## Critical files

**New:**
- `app/src/lib/corridor-map-style.ts`
- `app/src/lib/corridor-map-data.ts`
- `test/corridor-map-data.test.ts` (~10–12 tests)
- `app/src/components/CorridorMap.tsx`
- `app/src/components/SectionDetailBody.tsx`
- `app/src/components/SectionTile.tsx`
- `app/src/components/CorridorMapColumn.tsx`
- `app/src/hooks/useActiveTile.ts`
- `test/use-active-tile-pure.test.ts`

**Modified:**
- `package.json` — add `maplibre-gl@4.7.1`
- `app/src/main.tsx` — import `maplibre-gl/dist/maplibre-gl.css`
- `app/src/desktop/DesktopCorridor.tsx` — slug-gated swap
- `app/src/mobile/MobileCorridor.tsx` — same
- `app/src/desktop/DesktopDetail.tsx` — extract body

## Verification

1. **Dependency.** `npm install` succeeds; Vite tree-shakes the bundle reasonably.
2. **Tests.** `npm test` — corridor-map-data + use-active-tile-pure suites pass; existing tests still green.
3. **Build.** `npm run ui:build` clean; no TS errors.
4. **Dev server.** `npm run dev` + `npm run ui:dev`. Load `/corridor/arkansas-headwaters`.
5. **preview_screenshot.** Confirm paper background, sage land, navy Arkansas River halo + main, hillshade visible, contours subtle, dashed purple admin lines.
6. **Dot motion.** `preview_eval window.scrollTo({ top: 1500, behavior: 'instant' })`; screenshot — dot should be ~halfway down corridor; callout reads e.g. "Milk Run" or "Browns Canyon" depending on tile positions.
7. **Expand.** `preview_click` the Expand → affordance on a tile; `preview_snapshot` to confirm flow chart + weather + dams render inline.
8. **AP brightness.** Scroll to bottom; `preview_inspect` to confirm previously-passed APs are lit; remaining are dimmed.
9. **Other corridors.** Load `/corridor/upper-colorado`; the old spine layout still renders.
10. **Mobile.** `preview_resize` to 375×812; verify map-on-top, tiles below, dot still tracks scroll.

## Open questions to resolve during work

1. **MapLibre + Vite.** MapLibre depends on `window` / WebGL. Verify standard Vite import works without dynamic-import gating; if not, lazy-import the component.
2. **OpenFreeMap stability.** If rate-limited or down during dev, fall back to CartoDB Positron and re-apply the style overrides (source-layer names may differ for Carto's schema).
3. **Map height on desktop.** Sticky map should be `calc(100vh - <header>)`. Confirm `AppHeader` height in `DesktopShell.tsx`.
4. **Section sub-polyline slicing for paint.** Emit separate GeoJSON LineString features per section (simpler) vs one LineString + data-driven expression. Default to per-section features.
5. **Tile expansion preserves scroll anchor.** When a tile mid-list expands by 600 px, the user's scroll position should stay anchored to the same tile — verify the click target doesn't get pushed off-screen.

## Slice paperwork

- This file (`13c-corridor-map-and-tiles/plan.md`) — created 2026-05-27
- `13c-corridor-map-and-tiles/status.md` — empty starter
- Close 13a: status: done, closed: 2026-05-27, move to `completed/13a-river-corridor-spine/`
- `.plans/ROADMAP.md`: Active → 13c, 13a → completed, 13b stays queued behind 13c
