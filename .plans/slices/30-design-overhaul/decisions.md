# Decisions — 30-design-overhaul

## 2026-06-11 — RiversHome basin clustering: tributary classification lives in the frontend, not the schema

**Context.** Added subtle per-basin grouping on the home screen (`app/src/screens/RiversHome.tsx`):
corridors that share a watershed render inside a translucent dark box (`--module-fill-dark`) with a
quiet header, main-stem runs listed first and tributary runs marked with a muted `↳` + "{MainStem}
tributary" subtitle. A basin is boxed only when a list contains ≥2 distinct rivers of that watershed;
single-river basins (Arkansas, Gunnison, Yampa, North Platte) render exactly as before (no box, no
header). Applies to both "Your rivers" and "Other rivers" via one shared `BasinBox` + `splitIntoBasins`.

**Decision.** The one fact not already in the dashboard payload is which river is the main stem vs. a
tributary within a basin. We encoded it as a small, commented frontend constant
(`app/src/lib/riverSystems.ts` — `TRIBUTARY_OF` keyed by river display name) rather than adding a
`mainStem`/`tributaryOf` field to the `River` schema.

**Why.**
- It's a pure presentation concern for a curated 15-river dataset; no backend consumer needs it.
- Avoids a schema migration + reseed (and the Harper hot-reload thrash that reseeding can trigger).
- Frontend-only blast radius: two files, no API/type/transform changes.

**Tradeoff / when to revisit.** If main-stem↔tributary linkage is ever needed by the API, the map, or
breadcrumbs, promote it to `River` (e.g. `tributaryOf: ID`) and have the map import from the seed
instead. Classification is **basin-relative**: Gunnison and Dolores are hydrologically Colorado
tributaries but each heads its own basin in this data model, so each is a main stem of its own box.

**Verified.** Live on the `.harper-home` backend ("Other rivers"): 4 boxed basins, exactly 8 `↳`
tributaries (Blue/Eagle/Roaring Fork→Colorado, Clear Creek/Poudre→South Platte, Animas/Piedra→San
Juan, San Miguel→Dolores), 4 loose basins untouched, `↳` rendered in `--fg-on-sky-3`. tsc clean for
both touched files. "Your rivers" uses the identical code path (empty without follows in this session).

## 2026-06-11 — Basin hover highlights the whole basin on the map

Hovering a basin box highlights every section in the basin on the map rail (the existing per-corridor
halo, fanned out to the basin's full section-id set). Kept the finer-grained per-row highlight: rows
override with their own corridor on enter, and on leave restore the basin (not clear) via
`onHoverChange={(ids) => setHoveredSectionIds(ids ?? basinSet)}` while the box-level enter/leave owns
the basin set + final clear. Desktop-only (mobile has no map rail). Verified live: Colorado box → 17
halos, Platte → 14, single row → its corridor, row-leave → basin restored, box-leave → cleared.

## 2026-06-11 — Display basins use a "{major river} Basin" formula; Plattes merge

Renamed the home-screen basin labels to a clean "{major river} Basin" scheme and introduced a
display-grouping layer (`WATERSHED_TO_BASIN` + `basinFor()` in `riverSystems.ts`) that maps watershed
slugs → a `{ key, name }` basin. **Forks of the same river merge**: the `south-platte` and
`north-platte` watersheds both roll into **Platte Basin** (North Platte left its own loose row and
joined the Platte box; both forks are main stems, Clear Creek/Poudre stay "South Platte tributary").
Distinct major rivers (Gunnison, Dolores, San Juan, Yampa, Arkansas) each remain their own basin —
they are Colorado tributaries hydrologically but not *forks*, so they are not merged upward.
`splitIntoBasins` now buckets by `basinKey` instead of `watershedSlug`; the main-stem sort gained a
section-count tiebreak so the larger fork leads (South Platte above North Platte). Presentation-only —
the underlying `Watershed` records and `/watershed` pages are unchanged.
