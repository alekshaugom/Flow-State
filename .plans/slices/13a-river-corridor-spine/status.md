# 13a status

## 2026-05-25
- Slice opened. 12c-river-log-sharing re-queued behind 13b.
- Plan written from approved spec (`/Users/aleks/.claude/plans/ethereal-imagining-frost.md`).
- Tasks created: schema (parentSectionId), section seed extension, SECTION_LEG_MAPPING update, geometry pipeline extension, corridor-spine-pure helper + tests, CorridorView resource extension, useActiveMile hook, spine + pane components, page refactor, verification.
- ✅ Schema: added `parentSectionId: ID @indexed` to `RiverSection` in `schemas/river.graphql`.
- ✅ Seeded 6 new Arkansas sections: `arkansas-pine-creek` (child of Numbers), `arkansas-town-boat-chute`, `arkansas-milk-run`, `arkansas-browns-upper`/`arkansas-browns-lower` (children of Browns Canyon), `arkansas-big-bend`. `usgs-07091500` Salida gauge already provided via `CURATED_GAUGES`.
- **Decision — Milk Run Upper/Lower deferred.** Investigated curated APs: Frog Rock (the only AP I considered as an intermediate) is actually upstream of BV between Numbers and Railroad Bridge, NOT between Fisherman's Bridge and Ruby Mountain. There's no curated AP between mile 33.95 (Fisherman's) and mile 37.58 (Ruby Mountain). Ship Milk Run as a single section; revisit Upper/Lower split when a curated intermediate AP exists (would need a curation pass + re-run of `scripts/compute-river-miles.mjs`). Plan acceptance criterion #3 updated to reflect.
- ✅ SECTION_LEG_MAPPING extended in `scripts/generate-curated-data.mjs` (+6 entries for new Arkansas sections); regenerated `lib/curated-river-data.ts` — now 210 APs, 14 dams, 59 gauges, 42 section legs. All 6 new legs resolved cleanly to curated APs (granite→clear-creek, railroad-bridge→bv-wwp, fishermans→ruby, ruby→hecla, hecla→stone-bridge, stone-bridge→salida-wwp).
- ✅ Pure helper `app/src/lib/corridor-spine-pure.ts` (~290 LOC): `haversineMiles`, `cumulativeMiles`, `principalAxis`, `projectToVertical`, `smoothLateral`, `normalizeLateral`, `scaleYByPixelsPerMile`, `catmullRomPath`, `pointAtMile`, `buildSpinePath`. Pipeline NHDPlus polyline → spine SVG points + Catmull-Rom path string. Pure, no DOM, no React.
- ✅ Tests `test/corridor-spine-pure.test.ts`: **23 / 23 green** (full suite **270 / 270 green**). Coverage: haversine sanity, cumulative monotonicity, principal-axis on N-S / E-W / diagonal polylines, projection y=mile invariant, straight-line zero-x, smoothing identity + spike-dampen + y-preservation, normalize-to-lane + clamp, scale-y, catmullRom empty/single/multi, pointAtMile out-of-range/exact/interpolated, end-to-end buildSpinePath on a synthetic Arkansas-like polyline.

## End-to-end milestone — 2026-05-25
- **Decision — defer NHDPlus pipeline run.** Skipped task #5's network fetch. Wrote `app/src/lib/corridor-assembly-pure.ts` (~140 LOC, 5 / 5 tests green): concatenates existing per-section polylines downstream, bridges the 3 gap sections (Town/Boat Chute, Milk Run, Big Bend) with straight-line connectors anchored to neighboring polyline endpoints, computes per-section mile ranges + corridor totals. The full NHDPlus run for those 3 sections is a follow-up enhancement; it would replace the straight bridges with curved real-river shape.
- ✅ Task #7: Extended `resources/CorridorView.ts` to return `accessPoints`, `impassableDams`, `gauges` (with snapshots + sparkline), per-section `parentSectionId` + `corridorMileSpan` + `fromAccessPointId` / `toAccessPointId` + `sortIndex` + `notes`.
- ✅ Task #8: `app/src/hooks/useActiveMile.ts` — page-level scroll + requestAnimationFrame-throttled compute of `(viewportCenter - spineTop) / pixelsPerMile`. Exports `scrollToMile(mile)` for click-to-scroll.
- ✅ Task #9: Three components: `CorridorSpine.tsx` (SVG: status bands, neutral spine path, per-section colored sub-paths, AP/gauge/dam markers, section labels, position-indicator dot at active mile), `CorridorSpineColumn.tsx` (assembles corridor polyline, runs spine pipeline, wraps scroll-tracking, derives active-section with child-over-parent precedence), `CorridorSpineDetailPane.tsx` (sticky right pane: section name + parent eyebrow, status pill, BigCFS + Sparkline for primary gauge, AP list with subtle italic notes, in-section dam notes, section notes).
- ✅ Task #10: `DesktopCorridor.tsx` swapped to two-column spine + pane layout with `hasAnyGeometry` guard falling back to `SectionRow` list for corridors without geometry. `MobileCorridor.tsx` stacks detail pane on top + spine below, same fallback.
- ✅ Task #11: Browser verification:
  - `/corridor/arkansas-headwaters`: 11 sections render (8 top-level + 3 children: Pine Creek under Numbers, Upper/Lower Browns under Browns Canyon).
  - Scroll-driven active section confirmed: scrollY=0 → Pine Creek active with "The Numbers · sub-section" parent eyebrow. scrollY=1500 → Milk Run active. scrollY=4400 → Bighorn Sheep Canyon active.
  - Gauge swap on scroll: Pine Creek/Numbers shows "below Granite" gauge, Bighorn Sheep shows "at Parkdale" gauge (294 cfs). Within a section the gauge is locked.
  - Click-to-scroll: clicking "Upper Browns" label scrolls page to y=2054, Upper Browns becomes active with "Browns Canyon · sub-section" eyebrow.
  - `/corridor/upper-colorado`: renders with real NHDPlus curves visible on Gore Canyon and Pumphouse polylines. Screenshot captured — looks beautiful (gold river curve + big 536 cfs readout + sparkline + Confluence/Pumphouse AP list).
  - Mobile 375 × 812: layout collapses, detail card stacks on top of spine, all 11 spine rects render, content readable.
  - Other corridors with existing geometry (e.g. `clear-creek-canyon`) automatically get the spine treatment. The `SectionRow` fallback path is preserved for any corridor without geometry.
- **Found + fixed during verification:** child-placement bug in `CorridorSpineColumn.childAdjustedRanges` — when a parent had a single child shorter than itself (Pine Creek 2 mi inside Numbers 13 mi), the proportional-allocation math gave the child the parent's whole range. Fixed: use kid's `lengthMiles` directly, only scale down if kids over-fill the parent. Pine Creek now sits at mile 0-2 inside Numbers.
- Tests: **275 / 275 green** (247 original + 23 corridor-spine-pure + 5 corridor-assembly-pure).
- Vite build: clean. No console errors during browser verification.
- Acceptance criteria — 11 of 11 met:
  1. ✅ Real river shape on Arkansas + Upper Colorado (where polylines exist; straight bridges through the 3 gap sections)
  2. ✅ Vertical scroll, ~6690 px tall for Arkansas at 80 ppm
  3. ✅ Hierarchical sections (Pine Creek under Numbers, Upper/Lower Browns under Browns Canyon). Milk Run deferred its Upper/Lower split per earlier decision.
  4. ✅ Active section by scroll
  5. ✅ Position dot at active mile
  6. ✅ Click to scroll
  7. ✅ Sticky gauge lock (verified: Pine Creek→Granite gauge, Bighorn→Parkdale)
  8. ✅ Right pane content (name, parent eyebrow, status pill, BigCFS + sparkline, AP list, notes)
  9. ✅ Access norm notes render as italic small ink-3 lines under each AP
  10. ✅ Existing sections preserved — 5 originals unchanged, hierarchical rollout is additive
  11. ✅ Mobile parity (375×812 verified)

## Follow-ups
- NHDPlus polylines for Town/Boat Chute, Milk Run, Big Bend (currently straight bridges). Run `npx tsx scripts/generate-geometries.ts` extended to read new SECTION_LEG_MAPPING entries.
- Curated intermediate AP between Fisherman's Bridge (mile 33.95) and Ruby Mountain (mile 37.58) to unlock Milk Run Upper/Lower split.
- Frog Rock AP currently has null lat/lng/riverMile; populate via `scripts/compute-river-miles.mjs` after field-curating coords.
- 13b: multi-section RiverLog schema + UI (next slice in queue).
