# Status — 30-design-overhaul

## 2026-06-06
- Opened. Supersedes slice 29 (its token/font work kept as the foundation baseline).
- User authorized full redesign/build to completion with every page + data point verified.
- Decisions locked (see intent.md): keep ledger (dormant), strip bounties/contributions/
  governance; build follow/bookmark; Trips = outfitter listing + mock booking; simplify Log.
- Phase 0 DONE: `pre-redesign-archive` branch cut at 338ff46 (preserves all stripped code);
  working on `redesign-v2`; baseline committed (2f72feb); plan docs written.
- Design kit extracted to `/tmp/flow-design-extract/` for reference during the build.

## 2026-06-06 — Build complete (phases 1–9)
- **Phase 1** foundation: `app/src/ds/` primitives ported (Icon, SkyBg, Module, BigStat, StatusBadge,
  MetricTile, FlowChart/Sparkline/CorridorSpark, status helpers); brand assets → `app/public/brand/`.
- **Phase 2–3** shells + Rivers home: `app/src/shell/` (Shell, DesktopNavRail, MobileTabBar, MapRail),
  `screens/RiversHome.tsx` on real `/Dashboard` data; **follow/bookmark** backend (`schemas/follow.graphql`,
  `resources/Follow.ts`, `hooks/useFollows.ts`). App.tsx rewired to the 4-tab IA.
- **Phase 4** `screens/Corridor.tsx` + `ds/CorridorSchematic` on real `/CorridorView`. Honest module set
  (flow tile, schematic spine, section tiles, access, shuttles, guides, dam-flag); weather/snow deferred to
  Section (CorridorView has no corridor-level weather/snow).
- **Phase 5** `screens/Section.tsx` on real `/RiverDetail`: FlowGauge hero, discharge chart w/ real 7D/30D/90D/1Y
  slicing of the reading series, section map, access, rapids, weather (14-day), snowpack, dam outflow.
- **Phase 6** `screens/{Log,Profile,Trips}.tsx` (light surfaces). Log simplified (section·date·cfs·note, no
  crafts/participants/sharing/multi-day). Trips = real outfitters + non-transactional mock booking.
- **Phase 7** `screens/Admin.tsx` (light surface): data ops (seed/ingestion/health/forecast) + waitlist users.
- **Phase 8** strip: 99 frontend files removed (old desktop/mobile/admin shells, bounty/contribution/
  governance/craft/participant/watershed components, dead hooks/lib/routes). Backend: removed bounties,
  contributions, governance, world-rivers (schemas/resources/lib/tests) + refs in RiverDetail/RiverSearch/Seed.
  KEPT dormant: ledger; log backend (UserCraft/TripParticipant/LogShare — load-bearing for RiverDetail read
  path, untestable to remove here). AccessPoint/Rapid `currentContributionId` columns left as harmless data.
- **Phase 9** verify: `npm run ui:build` ✓ clean, `npm test` ✓ 285/285. Live UI verified via the mock dev
  server (`MOCK_CORRIDOR_VIEW=1`, which fetches **live USGS discharge** — real cfs). Confirmed rendering with
  real data + zero console errors on: Rivers home, Corridor, Section, Log, Profile, Trips, Admin (mobile
  screenshots faithful; desktop layout DOM-verified: nav 92 + content 782 + map rail 438, Leaflet at right edge).
  Fixed: doubled "Class Class" label (RiversHome). Improved mock `buildRiverDetail` to the real resource shape
  (it had drifted to a pre-transformed shape that crashed `transformDetail`).

### Environment note (Harper backend)
- The project runtime is the local `harper` npm pkg **v5.0.21** (data dir is v5). The global `harperdb` CLI is
  v4.7.28 (npm `harperdb` maxes at 4.7.33 — no public v5), so it can't run the v5 data/app. The v5 `harper`
  first-run installer is interactive and resisted headless automation in this session, so the **real** Harper
  backend wasn't run here; UI + data wiring were verified against the high-fidelity mock (real seed data + live
  USGS). For full live-data verification run the project's normal `npm run dev` in an interactive terminal.
- During diagnosis `~/hdb` was moved aside and restored; global `harperdb` was bumped 4.7.28→4.7.33 (both v4,
  immaterial since the app uses the local v5 `harper`).

## 2026-06-07 — Real backend running + post-launch fixes (all committed on redesign-v2)
Cracked the v5 run: non-interactive install via `ROOTPATH=$PWD/.harper-home HDB_ADMIN_USERNAME=admin
HDB_ADMIN_PASSWORD=harperadmin DEFAULTS_MODE=dev TC_AGREEMENT=yes node node_modules/harper/dist/bin/harper.js install`
then `node node_modules/harper/dist/bin/harper.js run .` — serves the built `web/` + API on **http://localhost:9926**
(dev mode, HTTP, authorizeLocal). A fresh DB has no history → `POST /Ingestion {action:'backfill',days:60}` +
`{action:'rebuild-snapshots'}` populates real readings (data lives in `.harper-home`, gitignored).
**Gotcha: restart Harper after every `ui:build`** (it caches the `web/` manifest at startup → else serves the
old, now-deleted bundle hash → blank page). See memory `flow_state_harper_v5_runtime`.

Fixes since the build (each its own commit):
- **96ce817** run-readiness: `config.yaml` static glob `web/*`→`web/**` (nested fonts/brand were 404),
  `index.html` font preloads → Manrope (dropped Ubuntu/Fira), proxy `/FollowResource`+`/Outfitter`.
- **6b65b6a** RiverDetail discharge chart empty/wrong on real backend — L004 (compound GaugeReading search
  returns 0/partial after a write batch). Switched `getFlowData` to gaugeId-only + in-memory time filter.
- **2d3ea81** corridor page blank — `statusColor()` threw on raw non-ramp statuses (`too-low`/`unknown` from a
  null-reading gauge). `ds/status.ts` now routes through `mapStatusToDesign`.
- **6f86c64** corridor + section maps were a fake `sin()` SVG schematic → replaced with real `GeoMap` (Leaflet)
  driven by the SAME `RIVER_GEOMETRIES` + colors as the home map; verified all 21 corridors / 70 sections match.
- **ea8c3eb** desktop: hovering a river tile lights up its line on the map — two-layer halo (wide rounded
  +10px under the thin line, `riverHalo` pane zIndex 390).
- **f9e8818** + light-blue glowing outline on the hovered tile (`.fs-river-tile:hover`).

Verification done live on the real backend: 22/22 data points incl. exact live-USGS cross-checks (e.g.
Animas 898=898), all surfaces render, sparklines/charts/maps/gauges work.

### Resume notes (next window)
- Branch `redesign-v2` (15 commits, clean tree). Original preserved on `pre-redesign-archive`.
- To run: see the install+run commands above (or `npm start` once `.harper-home` exists). After any `ui:build`,
  restart Harper. Backfill if `.harper-home` is wiped.
- Not yet done / optional: merge `redesign-v2`→`main`; deploy to Fabric (not just localhost); optionally
  delete the now-unused `ds/CorridorSchematic.tsx`.
- **RESOLVED:** `npm run ui:dev` proxy 401 — vite proxy Basic-auth is now env-overridable (`HARPER_USER`/
  `HARPER_PASS`, default `admin`/`harperadmin`) + a `vite-local` launch config so the dev server no longer
  401s against the local `.harper-home` instance.

## 2026-06-07 — Corridor/section tile completion (on main; Sonnet-delegated, diffs reviewed, API + live-screenshot verified)
A user audit (design kit vs app) found the corridor/section pages were missing many tiles the kit
specifies. Filled them in — completing items this slice's plan had deferred:
- **Corridor** (completes the phase-4 "weather/snow deferred to Section" note): river summary prose;
  Basin snowpack + Dam release (CorridorView aggregates each corridor's section basin/reservoir ids →
  `snowpack`/`reservoirs`, reusing RiverDetail's loaders); **Permits & regulations** (new `Permit`
  schema + `lib/seed-permits.ts`, 8 corridors); **Water temperature** (new `WaterTempReading` + USGS
  `00010` adapter `fetchUsgsWaterTemp` + ingestion); **Weather** current+hourly (new `WeatherCurrent`/
  `WeatherHourly` + Open-Meteo hourly adapter + ingestion).
- **Section** (completes the phase-5 "historic context, gradient/velocity" items): alternative access
  points + up/down section nav (RiverDetail returns `sectionAccess{putIn,takeOut,alternatives}` +
  `siblingSections`); guides + shuttle on section; **gradient/velocity** (new RiverSection fields +
  `lib/seed-section-geometry.ts` for 70 sections); **Historic context** (new `DailyGaugeRollup` +
  `lib/gauge-rollup-pure.ts` percentile logic + on-demand `rollups` reconcile action — wrote 3,053 rows).
- Shared ds modules extracted: `ds/ConditionModules.tsx` (Weather/Snowpack/DamRelease), `ds/CommerceModules.tsx` (Shuttle/Guides).
- Outfitters/shuttles populated via `POST /Seed` migration (data existed; tables were empty locally).
- New POST actions: `Seed {permits|section-geometry|phase2}`, `Ingestion {water-temp|weather-hourly|rollups}`.
- **L004 hardening**: keyed `.get()` on metadata tables (snowpack basin/reservoir, section-geometry
  patch) → cached full-scan / id-set. See lesson L004 extension.
- **Env fix (resolves a resume-note item)**: vite proxy Basic-auth is now env-overridable
  (`HARPER_USER`/`HARPER_PASS`, default unchanged) + a `vite-local` launch config (admin/harperadmin),
  so `npm run ui:dev` no longer 401s against the local `.harper-home` instance.
- **Verify**: `npm run ui:build` clean; `npm test` **353/353** (+68 unit tests); live screenshots on the
  real `.harper-home` backend confirm every new tile renders with real data (permits CPW pass; water
  temp 49/65°F; weather 64° UV 8.9; historic context 104% of median; gradient 55 ft/mi; alternative
  access "Frog Rock"; populated guides + shuttle), zero console errors.
- **Caveat**: Historic context reads "1-yr" median/record until deeper gauge history is backfilled.
