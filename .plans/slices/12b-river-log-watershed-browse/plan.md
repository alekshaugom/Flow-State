---
slice: 12b-river-log-watershed-browse
status: queued
value: 8
confidence: 7
effort: M
depends_on: [12-river-log-core]
unlocks: [12c-river-log-sharing]
opened: 2026-05-17
closed: null
---

# Slice 12b — River log: watershed-grouped filing system

## Goal

A `/logs` route that mirrors the watershed page's accordion rhythm: Watershed header → Corridor sub-header → Section row → click into `/section/:id/logs`. Surfaces "where have I been" across the user's whole boating history. A filter strip narrows by craft / conditions tag / watershed. An optional year-view toggle re-groups by trip year.

This slice turns slice 12's per-section logging into a navigable journal organized the way boaters actually think about their lives: across the watershed, year over year. Without this slice, slice 12 ends up as just per-section comments. With it, the journal becomes a filing system.

## Acceptance criteria

1. `/logs` renders the user's full filing system grouped Watershed → Corridor → Section in under 250 ms (most users will have <50 logs in year one; this should be one Harper round-trip via `MyLogs.ts`).
2. Each watershed header shows `// N TRIPS · M SECTIONS · LAST 2026-04-20`.
3. Each section row shows trip count + last-trip date + a small status pill colored by today's flow status.
4. Filter bar (top of page) narrows view by craft, conditions tag, watershed. URL state preserved on reload (`?craft=oar-raft&watershed=arkansas`).
5. Empty state (zero logs): "No trips logged yet — log your first trip on any section" with a section picker that drops into `/log/new`.
6. Year-view toggle (`?view=year`) re-groups by trip year instead of by watershed. Same drill-down rhythm.
7. `My Logs` entry visible in top nav (desktop) + mobile menu when authenticated.
8. Default watershed (when set in profile via slice 12) is expanded on first load; others collapsed.

## Files to create

- `resources/MyLogs.ts` — class `MyLogsView`. Aggregate read endpoint. Returns
  ```
  { watersheds: [{watershedId, name, tripCount, sectionCount, lastTripAt,
      corridors: [{corridorId, name, sections: [{sectionId, name, tripCount, lastTrip}]}] }] }
  ```
  Single round-trip — denormalized `watershedId` / `corridorId` columns on `RiverLog` (added in slice 12) make this a clean group-by.
- `app/src/pages/MyLogsPage.tsx` — `/logs` accordion view. Supports `?view=watershed|year` and `?craft=&watershed=&tag=`.
- `app/src/components/LogFilterBar.tsx` — craft / tag / watershed filters with URL-bound state.
- `app/src/components/WatershedLogSummary.tsx` — header row per watershed group.

## Files to modify

- `app/src/desktop/DesktopShell.tsx` — add `My Logs` link in top nav (after the watershed sidebar) once authenticated.
- `app/src/mobile/MobileDashboard.tsx` — surface `My Logs` entry in the mobile menu.
- `app/src/App.tsx` — register `/logs` route. Gate behind `useAuth()`.
- `app/src/api.ts` + `app/src/types.ts` — `MyLogsResponse` type.

## Out of scope

- Sharing UI (slice 12c)
- Full-text search across notes (slice 13+)
- Bulk operations / export (slice 13+)
- Year-over-year comparison charts (slice 13+)

## Known unknowns

- **Filter performance with many logs.** If users accumulate hundreds of logs across many watersheds, the in-memory client-side filter may need to move server-side. Defer until measured.
- **Year-view vs watershed-view default.** Don't lock in — observe usage once shipped. Default to watershed-view on first ship.
- **Empty corridors.** If a watershed has zero trips, do we render its header row in the accordion or skip it entirely? Decision: skip — only show what the user has been to.

## Verification (loose)

1. Log multiple trips across 2–3 watersheds and 3+ sections within Arkansas.
2. Hit `/logs` — accordion shape matches `/watershed/:slug` rhythm. Arkansas (or profile's homeWatershed) expanded; others collapsed.
3. Filter by `craft=oar-raft` — only matching trips visible; counts in headers update.
4. Year-view toggle — same trips re-grouped by year.
5. Reload with filter URL — state persists.
6. Mobile 320px — accordion still scannable.
7. Empty-state user (no logs) — sees the picker, can drop into `/log/new`.

## Critical references

- Watershed accordion shape to mirror: [app/src/desktop/DesktopWatershed.tsx](../../../app/src/desktop/DesktopWatershed.tsx)
- RiverLog schema (from slice 12): [12-river-log-core/plan.md](../12-river-log-core/plan.md)
- React Query hook pattern: [app/src/hooks/useWatershed.ts](../../../app/src/hooks/useWatershed.ts)
- L004 guard for new resource: [L004-harper-static-import-and-search-after-restart.md](../../lessons/L004-harper-static-import-and-search-after-restart.md)
