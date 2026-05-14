---
slice: 06-map-layering
status: queued
value: 7
confidence: 8
effort: M
depends_on: [02-watershed-corridor-ia]
unlocks: []
opened: 2026-05-13
closed: null
---

# Slice 06 — Map layering, tile providers, zoom-adaptive display

## Goal

Refactor the global map into a layered composition with selectable tile providers, zoom-adaptive feature visibility, and deep-link focus to watersheds/corridors. Same `<RiverMap>` component embeds in watershed/corridor pages with prop-driven focus.

## Acceptance criteria

1. `<MapBase>` handles tile selection (CartoDB Positron / USGS Topo / Esri Satellite / OSM)
2. `<MapLayers>` handles features with zoom-adaptive filtering
3. Tile selector dock visible on `/map`
4. Watershed polygons visible at z ≤ 8, fade in at z ≤ 7
5. Corridor lines visible z 6–10 (simplified geometry); section lines z 8+ (full fidelity)
6. Gauge markers appear at z 9+; access points and rapids at z 11+
7. Weather overlay toggle (icons at section centroids — uses `WeatherForecast`)
8. Snowmelt overlay toggle (placeholder for now)
9. Deep-link `/map?focus=corridor:arkansas-headwaters` fits + filters
10. Watershed page embeds `<MapBase>` zoomed to watershed bbox; corridor page same for corridor bbox

## Approach (light)

- Split existing `app/src/components/RiverMap.tsx` into `MapBase.tsx` + `MapLayers.tsx`
- Add layer toggles to a small floating dock
- Extend `scripts/generate-geometries.ts` to emit a simplified geometry per corridor (turf.simplify, tolerance ~0.001) plus existing per-section geometries
- New tile URLs:
  - CartoDB Positron: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png`
  - USGS Topo: `https://basemap.nationalmap.gov/ArcGIS/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}`
  - Esri World Imagery: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`
- Tooltip improvement: render `<Popup>` from react-leaflet with embedded `<Sparkline>` component (extract from current inline HTML)

## Open questions to resolve when active

- Watershed polygon source: USGS WBD HUC8 boundaries (free, authoritative) — confirm attribution
- Performance of zoom-adaptive filtering — does the existing `RIVER_GEOMETRIES` need pre-simplification or is it fine? Test with all 25 sections + ~10 corridors first.
- Layer toggle persistence — localStorage per-user? Recommend: yes for tile choice + overlays, no for zoom focus.

## Critical references

- Existing map: [app/src/components/RiverMap.tsx](../../app/src/components/RiverMap.tsx)
- Geometries: [app/src/lib/river-geometries.ts](../../app/src/lib/river-geometries.ts) (or wherever they live)
- Generator: [scripts/generate-geometries.ts](../../scripts/generate-geometries.ts)
- Vision: [vision/ux-direction.md](../../vision/ux-direction.md) — map UX section
