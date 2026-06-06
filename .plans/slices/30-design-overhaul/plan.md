---
slice: 30-design-overhaul
status: active
value: 13
depends_on: []
opened: 2026-06-06
---

# 30 — Plan

Design-kit reference (this session): `/tmp/flow-design-extract/` (mobile `ui_kits/app/*.jsx`,
desktop `ui_kits/web/*.jsx`, `colors_and_type.css`). Port JSX → real TSX wired to existing
hooks (`useDashboard`, `useCorridor`, `useRiverDetail`, `useCorridorTiles`, `useMyLogs`,
`useLogMutations`, `useMediaQuery`) + `api.ts`. Tokens already live in `app/src/tokens.css`.

## KEEP (data + truth, reskinned)
rivers, sections, corridors, watersheds (region grouping only), gauges/readings/snapshots,
weather, snowpack, reservoirs/dam releases, access points, rapids, flow bands, outfitters,
shuttle businesses, forecasts, simplified river logs, users/auth, ingestion/adapters/seed,
ledger (dormant).

## BUILD NEW
follow/bookmark (schema+resource+UI) · admin (data ops + waitlist) · small data fills
(historic context, optional water-temp/permit) · the full new IA frontend.

## STRIP (preserved on pre-redesign-archive)
bounties, contributions, trust/reputation, content flags, moderation · world rivers/requests ·
watershed pages · search hero · crafts/participants/sharing/multi-day logging · per-section
logs page · associated schemas/resources/lib/tests/components/routes.

## Phases
- **0** Plan docs + branch safety. *(this)*
- **1** Foundation: reconcile tokens; copy logo assets to `app/public`; port shared primitives
  (Icon, Module/frosted, BigStat, StatusBadge, SkyBg, FlowChart, Sparkline, CorridorSpark,
  CorridorMap/SectionMap, FlowMap) into `app/src/components`.
- **2** Shells & nav + routing: mobile tab bar, desktop nav rail + map rail, light/dark
  surface switching; rewrite `App.tsx` to the 4-tab IA.
- **3** Rivers home + follow/bookmark (backend + mobile + desktop).
- **4** Corridor screen (flow tile, map well, section tiles, weather/temp/permit/dam/snow/
  shuttle/guides).
- **5** Section screen (FlowGauge hero, discharge chart, section map, access accordion, rapids,
  historic context, gradient/velocity, guides).
- **6** Log (simplified) + Profile (+ sign-in) + Trips (outfitter listing + mock booking).
- **7** Admin (new light-surface style: data ops + waitlist users).
- **8** Strip-out pass (frontend routes/components, then backend schemas/resources/lib/tests).
- **9** Verify: `npm run ui:build` + `npm test` green; live mobile+desktop on every surface;
  data accuracy vs API/source; screenshots.

## Acceptance
- New 4-tab IA renders mobile + desktop; immersive sky surfaces + frosted modules; light
  content surfaces; Manrope/Inter/Spline type.
- Every surface shows correct real data (rivers, gauges cfs, status, weather, snow, dam,
  rapids, access, logs).
- No references to stripped features; `ui:build` + `npm test` green; no dead routes.

## Verification
`npm run ui:build` && `npm test`; `HDB_ROOT=.harper-dev harper run .` + vite; preview tools to
screenshot `/` Rivers, a Corridor, a Section, Log, Profile, Trips, Admin at desktop + mobile.

## Risks
Strip-out is destructive (mitigated by archive branch). IA change is large (phased + delegated
to Sonnet, diffs reviewed). Orphaned `currentContributionId`/`verifiedBy` fields after strip —
harmless, cleaned later. `harper dev` watcher thrash → use `harper run` (memory).
