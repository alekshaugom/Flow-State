---
slice: 00-v1-foundation
status: done
value: 10
confidence: 10
effort: XL
depends_on: []
unlocks: [01-flowband-browns-fix, 02-watershed-corridor-ia, 03-forecast-snapshot-infra, 04-nws-weather-pipeline]
opened: 2025-12-01
closed: 2026-05-13
---

# Slice 00 — v1 foundation (completed)

This is a record of what shipped in v1, kept for context handoff. v1 is the codebase as it stands on 2026-05-13. Live at https://flow.state.harperfabric.com.

## What shipped

### Backend
- Harper as runtime: database + REST + static file server
- Schemas: `River`, `RiverSection`, `Gauge`, `GaugeReading`, `GaugeSnapshot`, `SnowpackBasin`, `SnowpackReading`, `Reservoir`, `DamRelease`, `ForecastRun`, `ForecastOutput`, plus auth and config types
- 16 rivers, 25+ sections seeded with flow thresholds from American Whitewater
- Ingestion worker (`setInterval` + `globalThis` guard) running USGS, CDSS, SNOTEL, BOR adapters on per-source intervals
- `GaugeSnapshot` denormalized cache for fast dashboard render
- `ForecastPipeline` resource with `buildDataPackage()` that assembles section + current conditions + history + snowpack + reservoirs into a JSON package
- Stub forecaster: linear trend decay + crude seasonal multiplier, 30-day output
- `getFlowStatus()` ranking with 7 bands (no-flow → dangerous), per-section Int thresholds
- Custom REST resources: `Dashboard`, `RiverDetail`, `Ingestion`, `Seed`, `AdminWaitlist`, `Me`, `SpaRoutes`, `ForecastPipeline`
- OAuth via `@harperfast/oauth`; admin role
- Backfill action on `Ingestion` for historical reads
- LLM env vars wired (`LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`) with stub fallback

### Frontend
- React 19 + Vite + React Router v7 + TanStack Query v5
- Routing: `/`, `/section/:id`, `/map`, `/login`, `/admin` with SPA fallback routes
- Responsive shell pattern: `ResponsiveHome` / `ResponsiveSection` pick `Desktop*` vs `Mobile*` at 768px breakpoint
- `DesktopShell`: 440px sidebar + detail panel, status-grouped section list
- `DesktopDetail`: hero stat strip + main flow chart + ForecastBand + context cards
- `DesktopFlowChart` (custom SVG 880×280): area+line, gradient fill, ideal band shading, hover crosshair, auto-flip tooltip, threshold reference lines, responsive x-axis
- `Sparkline` (custom SVG 280×56): minimal, used in list cards with 7/14/30d picker
- `ForecastBand` (custom SVG 280×90): history solid + forecast dashed + confidence pattern fill
- `ForecastStrip`: verbal forecast translations ("Likely rising")
- `RiverMap` (Leaflet + react-leaflet): GeoJSON LineStrings per section, status colors, hover tooltips, OSM tiles
- Custom design token system: Ubuntu + Fira Code, 5-scale status palette, surface inks, river blue scale
- All styling via inline `React.CSSProperties` — no Tailwind, no CSS modules

### Tests
- `node --test` runner; tests in `test/*.test.js`
- Coverage: ingestion adapters, flow status logic, forecast pipeline assembly

### Deploy
- Harper Fabric deploy via `npm run deploy`
- `predeploy` script cleans worktree build artifacts (lesson L001)
- OAuth redirect URI configured for production

## What v1 explicitly doesn't do

- No watershed or corridor concept above sections
- No nuance by craft type or skill level
- No weather inputs to the forecast
- No "why" explanation for current flows (driver attribution)
- No forecast accuracy tracking
- No ContextItem / agency bulletin ingestion
- No rapid pages
- No formal access points (text fields only)
- No photos
- No editorial admin UI beyond seed + waitlist

These are the v2 frontier — slices 01–11.

## Closing notes

v1 took ~6 months of evening/weekend work. It's a solid foundation: the ingestion pattern, the custom chart vocabulary, the design token system, the Leaflet map, and the dashboard transform are all real assets. The biggest weakness is interpretive: it treats Browns Canyon at 396 cfs as "too low to float," which is wrong.

Slice 01 fixes exactly that. Everything else builds outward from the same foundation.
