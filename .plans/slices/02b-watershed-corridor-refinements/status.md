# Status — Slice 02b (Watershed refinements)

## 2026-05-14
- Slice opened. Driven by post-ship feedback on slice 02: section order is wrong (alphabetical scan order, not geographic), corridor browsing requires an extra click, and corridor cards need room for future aerial/map header imagery.
- Approach: add `sortIndex` data field; refactor `DesktopWatershed`/`MobileWatershed` to embed section rows directly; extract a shared `SectionRow` component to avoid divergence with `DesktopCorridor`/`MobileCorridor`.
- Added `sortIndex: Int @indexed` to `RiverSection` and `RiverCorridor` schemas; assigned values (increments of 10) to all 20 corridors and all 36 sections in `lib/seed-data.ts`, plus a documentation comment explaining the convention.
- Wired `sortIndex` sorts into `resources/WatershedView.ts`, `resources/CorridorView.ts`, and `resources/Dashboard.ts`. Dashboard now sorts within a watershed group by `(corridor.sortIndex, section.sortIndex)` instead of the old `STATUS_ORDER` (which I removed as dead code).
- Extracted `app/src/components/SectionRow.tsx` with `density: 'desktop' | 'mobile'` prop, reused by `DesktopWatershed`, `DesktopCorridor`, `MobileWatershed`, `MobileCorridor`. Same visual language across the embedded watershed view and the standalone corridor page.
- Refactored watershed pages (desktop + mobile): vertical stack of expanded corridor cards, each with a `// MAP · COMING SOON` placeholder header (~96px desktop, 72px mobile) reserved for future aerial imagery. Each card embeds its section rows in upstream→downstream order; the corridor name retains a small `View corridor →` link to `/corridor/:slug`.
- **Verified locally** (Harper + Vite running):
  - `POST /Seed { "action": "hierarchy" }` re-upserts 8 watersheds + 20 corridors + 16 rivers + 36 sections, picking up sortIndex.
  - `GET /CorridorView/arkansas-headwaters` returns `[arkansas-numbers, arkansas-fractions, arkansas-browns-canyon, arkansas-bighorn-sheep, arkansas-royal-gorge]` — geographic order confirmed.
  - `GET /WatershedView/colorado-headwaters` returns corridors in `[upper-colorado, blue-corridor, eagle-corridor, glenwood-canyon, roaring-fork-corridor, grand-valley, ruby-horsethief]`.
  - `GET /CorridorView/south-platte-corridor` returns `[south-platte-deckers, south-platte-waterton]`.
  - `/watershed/arkansas` desktop: single Arkansas Headwaters card, map placeholder, five section rows in correct order. Section rows link to `/section/:slug`. `View corridor →` link routes to `/corridor/arkansas-headwaters`.
  - `/watershed/south-platte` desktop: three corridor cards stacked (South Platte Corridor → Clear Creek Canyon → Poudre Canyon).
  - `/watershed/colorado-headwaters` desktop: seven corridor cards stacked in `[upper-colorado, blue-corridor, eagle-corridor, glenwood-canyon, roaring-fork-corridor, grand-valley, ruby-horsethief]`.
  - Home sidebar Arkansas group now starts with Numbers (not Bighorn Sheep).
  - Mobile 375px viewport: `/watershed/arkansas` shows the same stacked structure with compact section rows; map placeholder still visible.
- `npm test` → 13/13 pass.
- No console errors on the preview.
- Closing slice as `done`.
