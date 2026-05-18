---
slice: 12b-river-log-watershed-browse
status: done
value: 8
confidence: 7
effort: M
depends_on: [12-river-log-core]
unlocks: [12c-river-log-sharing, 12d-email-auth, 12e-saved-crafts, 12f-trip-photos, 12g-trip-sparkline]
opened: 2026-05-17
closed: 2026-05-18
---

# Slice 12b — River log: `/logs` filing system + multi-day + nostalgia framing

## Goal

A top-level `/logs` route — promoted to the main nav next to **Map** — that turns the user's trip history into a journal worth coming back to. Two grouping modes: **by watershed** (mirrors the watershed accordion) and **by year** (re-groups chronologically). Card design tilted toward nostalgia: section name, status pill colored by today's flow, the trip's notes preview, a flow chip (`ran at 396 cfs · runnable`), the date or date range, and a placeholder for the section map + sparkline (full impl in 12g).

This slice also lands a **multi-day trip** schema extension that has to ship before logs accumulate — adding `endDate` and `camping` later is a real migration cost; doing it now is additive.

The framing of the page is "where have I been, and what was it like?" — not analytics, not metrics. Quiet, browsable, made to scroll through on a Sunday evening.

## Acceptance criteria

1. **Top-nav.** Header shows `Logs` between `Map` and `Admin` (when authenticated). Mobile menu surfaces it as a primary destination.
2. **Filing system.** `/logs` renders the user's full filing system grouped Watershed → Corridor → Section in under 250 ms. Single Harper round-trip via `MyLogs.ts` (denormalized `watershedId`/`corridorId` from slice 12).
3. **Watershed header rows.** Show `// N TRIPS · M SECTIONS · LAST 2026-04-20`. Section rows show trip count + last-trip date + a small status pill colored by *today's* flow status.
4. **Filter bar.** Narrows view by craft / conditions tag / watershed. URL-bound (`?craft=oar-raft&watershed=arkansas&tag=tons-of-rock`). State preserved on reload.
5. **Year-view toggle.** `?view=year` re-groups by trip year (Watershed → Year → Trip card, OR Year → Watershed → Trip card — pick the more nostalgic; see Known unknowns). Same drill-down rhythm.
6. **Card body.** Each trip card shows: section name + status pill, date (or date range for multi-day), craft chip, flow-at-trip chip, notes preview (3-line clamp, expand on click), conditions chips, a `// PAST TRIP` eyebrow. Reserved slots for section map and sparkline (placeholders this slice; 12g fills them).
7. **Multi-day trips.** Form accepts start + optional end date. When `endDate > date`, show a date range (`May 16 → May 18`) and a `// 3 DAYS` sub-eyebrow. Per-night camp location entries supported (free text, one per night).
8. **Empty state.** Zero logs → "No trips logged yet — log your first trip on any section." Section picker drops into `/log/new`.
9. **Default watershed expanded.** The user's `homeWatershedId` (from `UserProfile`) opens expanded on first load; others collapsed.
10. **Cross-page parity.** `<PastTripsStrip>` on section detail shows the date range (not just the start date) for multi-day trips.
11. **Tests cover:** multi-day schema additive load, end-date validation (`endDate >= date`), multi-night camping JSON parse, `/logs` group-by-watershed assembly, year-view re-grouping.

## Schema additions

### `schemas/river-log.graphql` (extend)

Add three nullable fields to the existing `RiverLog` type:

```graphql
endDate: String @indexed             # YYYY-MM-DD, optional. null = same-day trip.
campingJson: String                  # JSON array: [{date: "2026-05-16", location: "Sandstone Beach"}, ...]
tripNights: Int                      # denormalized: endDate - date in nights. 0 for single-day.
```

Existing `date` semantics: this is now the trip's **start date**. Single-day trips have `endDate = null` (or equal to `date`). All existing logs from slice 12 keep their meaning — no backfill needed.

## Files to create

- `resources/MyLogs.ts` — class `MyLogsView`. Single aggregate read.
  ```
  {
    watersheds: [{
      watershedId, name, tripCount, sectionCount, lastTripAt,
      corridors: [{ corridorId, name,
        sections: [{ sectionId, name, tripCount, lastTrip, currentStatus }],
      }],
    }],
    yearGroups: [{ year, tripCount, watersheds: [...same shape, filtered to year...] }],
    logs: RiverLog[]    // the full set, so the year view + filtering happens client-side without a refetch
  }
  ```
- `app/src/pages/MyLogsPage.tsx` — `/logs` accordion view. Supports `?view=watershed|year` and `?craft=&watershed=&tag=`.
- `app/src/components/LogFilterBar.tsx` — URL-bound filters (craft / tag / watershed).
- `app/src/components/WatershedLogSummary.tsx` — header row per watershed group.
- `app/src/components/YearLogSummary.tsx` — header row per year group.
- `app/src/components/MultiDayDateField.tsx` — start-date input + "Add end date" toggle + camp-by-night list editor.
- `lib/log/multi-day-pure.ts` — `validateDateRange(startDate, endDate)`, `parseCamping(json)`, `stringifyCamping(entries)`, `tripNightsBetween(startDate, endDate)`.
- `app/src/hooks/useMyLogs.ts` — extended (currently exists for slice 12 sectionId scoping) — add a no-sectionId mode that hits `MyLogsView`.

## Files to modify

- `schemas/river-log.graphql` — add `endDate`, `campingJson`, `tripNights` per Schema additions.
- `resources/RiverLog.ts` — POST/PATCH accept `endDate` + `camping` (array of `{date, location}`). Validate `endDate >= date`. Derive `tripNights`. Reject `endDate` more than 14 days after `date` (sanity bound).
- `resources/RiverDetail.ts` — already returns `myLogs`; ensure the response includes the new fields verbatim.
- `lib/log/river-log-pure.ts` — extend `buildNewLogRow` to accept `endDate` + `campingJson` + computed `tripNights`. Extend the `WRITABLE_FIELDS` whitelist.
- `app/src/types.ts` — extend `RiverLogEntry` / `RiverLogInput` with the new fields; add `CampingNight` shape.
- `app/src/pages/LogTripPage.tsx` — swap single date field for `<MultiDayDateField>`. Wire end date + per-night camping. Keep the form linear: end date is opt-in (chip toggle), camping section appears only when `endDate > date`.
- `app/src/components/RiverLogCard.tsx` — render date range when `tripNights > 0`. Add a `// CAMPED AT` line listing camp locations. Reserve top-right slot for section-map thumb and bottom for sparkline (both placeholder this slice).
- `app/src/components/PastTripsStrip.tsx` — same date-range surfacing.
- `app/src/components/AppHeader.tsx` — add `Logs` nav link between `Map` and `Admin` (auth-gated).
- `app/src/App.tsx` — register `/logs` route. Gate behind `useAuth()`.
- `app/src/api.ts` — add `myLogsAggregate()` → hits `MyLogsView`. Extend `RiverLogInput` type.
- `vite.config.ts` — proxy `/MyLogsView`.

## Out of scope

- Sharing UI → **12c**
- Saved-craft picker on the form → **12e** (this slice keeps the existing inline craft fields)
- Photo upload + gallery → **12f**
- Working flow sparkline + section map (placeholder reserved here, impl deferred) → **12g**
- Full-text search across notes → 13+
- Bulk operations / CSV export → 13+
- Year-over-year comparison charts → 13+

## Known unknowns

- **Year-view shape.** Is it `Year → Watershed → Section → trips` (groups time as the dominant axis) or `Year → trips (flat list, time-sorted)`? Initial ship: `Year → trips (flat, newest-first)` — less hierarchy, more "memory lane." Watershed-view keeps the hierarchy.
- **Multi-day flow-at-trip.** Trip spans multiple gauge-day readings. For now, use `date` (start day) for `flowAtTripCfs` resolution. 12g will surface the full range via sparkline. Document this on the card.
- **Camping locations on a non-camped trip.** Validation: only accept `campingJson` entries when `endDate > date`. Reject on the resource layer if a single-day trip submits camping rows.
- **Section map placeholder.** Just a `// MAP · COMING IN 12G` chip in the reserved slot. Don't try to render a map this slice — that's 12g.

## Risks / edge cases

- **L004 (empty-scan caching).** `MyLogsView` does one `RiverLog.search()` per user — no module-level cache (per-user data). Already covered by the slice-12 pattern.
- **Mobile 320px on `/logs`.** Three-level accordion (watershed → corridor → section) can crowd the smallest screens. Strategy: at <360px collapse corridor row labels into a single line `// arkansas-headwaters` mono eyebrow.
- **Empty corridors.** If a watershed has zero trips, skip its header — only show what the user has been to. (Carried from prior plan.)
- **Migration safety.** New fields are nullable; existing slice-12 logs remain valid. Verify by reading a pre-existing log via `GET /RiverLogResource/{id}` after the schema reload.

## Verification

1. `npm test` — green including new multi-day-pure tests.
2. `npm run dev` + `npm run ui:dev`.
3. Log a single-day trip on Browns Canyon. Card shows `2026-05-16` (no range).
4. Log a multi-day trip on Royal Gorge: start 2026-05-15, end 2026-05-17, camping nights `[2026-05-15: "Hayden Meadows", 2026-05-16: "Stone Bridge"]`. Card shows `May 15 → May 17 · 2 nights` and a `// CAMPED AT` line.
5. Open `/logs` — top nav highlight on `Logs`. Arkansas (home watershed) expanded; others collapsed.
6. Toggle `?view=year` — same trips re-grouped chronologically.
7. Filter `?craft=oar-raft` — both watershed and year views respect it.
8. Reload with URL state — filters persist.
9. Mobile 320×568 — accordion + multi-day form render cleanly.
10. Empty-state user (no logs) — sees picker, can drop into `/log/new`.

## Critical references

- Watershed accordion to mirror: [app/src/desktop/DesktopWatershed.tsx](../../../app/src/desktop/DesktopWatershed.tsx)
- RiverLog schema (slice 12): [schemas/river-log.graphql](../../../schemas/river-log.graphql)
- Slice 12 pure helpers to extend: [lib/log/river-log-pure.ts](../../../lib/log/river-log-pure.ts)
- React Query hook pattern: [app/src/hooks/useWatershed.ts](../../../app/src/hooks/useWatershed.ts), [app/src/hooks/useDashboard.ts](../../../app/src/hooks/useDashboard.ts)
- L004 guard for new resource: [L004-harper-static-import-and-search-after-restart.md](../../lessons/L004-harper-static-import-and-search-after-restart.md)
- L005 resource naming: [L005-harper-resource-class-name-collisions.md](../../lessons/L005-harper-resource-class-name-collisions.md) — class `MyLogsView`, not bare `MyLogs`.
