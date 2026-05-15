# Status — Slice 02 (Watershed → Corridor → Section IA)

## 2026-05-14
- Slice opened. Plan unchanged from authored version; executing top-to-bottom following dependency order (schema → seed → backend resources → frontend → mobile → verify).
- Following L004 patterns from slice 01: static `import { tables } from 'harper'`, module-scope cache + manual invalidation for new small reference tables (Watershed, RiverCorridor), full-scan + in-memory filter.
- Following L003: `Resource.post(data?: any)`, no `target` arg.
- Built backend: `schemas/watershed.graphql`, `schemas/corridor.graphql`; modified `schemas/river.graphql` (added `watershedId` to River; `corridorId` and `driver` to RiverSection, kept legacy `watershed: String` for migration discipline). Added `WATERSHEDS` (8) and `CORRIDORS` (20) arrays to `lib/seed-data.ts`; back-filled `watershedId` on all 16 rivers and `corridorId`/`driver` on all 36 sections.
- Added `lib/watersheds.ts` and `lib/corridors.ts` with the L004 cache pattern (module-scope cache + TTL + manual invalidation). Wired their `invalidate*Cache()` calls into `resources/Seed.ts` upserts (parent-first).
- Added custom rollup resources `resources/WatershedView.ts` (`GET /WatershedView/:id`) and `resources/CorridorView.ts` (`GET /CorridorView/:id`). First attempt named them `Watershed`/`Corridor` and hit "Conflicting paths for Watershed" from Harper (auto-generated `/Watershed/` from the schema's `@export` collided with our custom class). Renamed to `*View`. Wrote lesson L005.
- Modified `resources/Dashboard.ts` to include `watershedSlug`/`watershedName`/`corridorSlug`/`corridorName`/`driver` per section + top-level `watersheds` and `corridors` summaries. `resources/RiverDetail.ts` now resolves watershed + corridor via the cached lib helpers and emits a `breadcrumb` array. `resources/SpaRoutes.ts` exports new `watershed`/`corridor` SPA fallback classes.
- Front-end: created `app/src/components/Breadcrumb.tsx`, `hooks/useWatershed.ts`, `hooks/useCorridor.ts`, `components/WatershedGroupHeader.tsx`. Replaced `DesktopShell`'s status-based sidebar grouping with collapsible-by-watershed grouping (status filter chips still on top). Built `desktop/DesktopWatershed.tsx`, `desktop/DesktopCorridor.tsx`, `mobile/MobileWatershed.tsx`, `mobile/MobileCorridor.tsx`, `pages/WatershedPage.tsx`, `pages/CorridorPage.tsx`. Added the new routes to `App.tsx`. Integrated the breadcrumb at the top of `DesktopDetail.tsx` and `MobileDetail.tsx`.
- Extended `app/src/api.ts` with `watershed(slug)` and `corridor(slug)`, and added `/WatershedView`, `/CorridorView`, `/Watershed`, `/RiverCorridor`, `/FlowBand` to the Vite proxy (the front-end hits `/WatershedView/...` etc. via the dev proxy).
- **Verified locally** (`npm run dev` + `npm run ui:dev`):
  - `POST /Seed` backfill upserted 8 watersheds + 20 corridors + re-upserted 16 rivers + 36 sections.
  - `GET /Dashboard` returns the new shape; sample section has `watershedSlug: "san-juan"`, `corridorSlug: "animas-corridor"`.
  - `GET /RiverDetail/arkansas-browns-canyon` returns `breadcrumb: [Colorado, Arkansas River Basin, Arkansas Headwaters, Browns Canyon]` and populated `watershed` + `corridor` objects.
  - `GET /WatershedView/arkansas` returns watershed + corridors array + embedded sections with snapshots.
  - `GET /CorridorView/arkansas-headwaters` returns corridor + watershed + ordered sections.
  - Home sidebar shows the 8 watershed headers (Arkansas River Basin, Dolores / San Miguel, Gunnison Basin, North Platte, San Juan / Piedra, South Platte / Clear Creek / Cache la Poudre, Upper Colorado / Eagle / Roaring Fork, Yampa River Basin). Each is collapsible.
  - Clicking a watershed name routes to `/watershed/:slug` and renders the corridor grid with section pills + counts.
  - Clicking a corridor card routes to `/corridor/:slug` and renders the section list in upstream → downstream order with status pills, sparklines, and current flows.
  - Breadcrumb renders on every non-home page (watershed, corridor, section) with each segment clickable.
  - Legacy `/section/arkansas-browns-canyon` URL still works, now with the breadcrumb visible.
  - Mobile (375 viewport): `MobileWatershed` and `MobileCorridor` render with the same breadcrumb + content stacked vertically.
- `npm test` → 13/13 pass.
- Closing slice as `done`.
