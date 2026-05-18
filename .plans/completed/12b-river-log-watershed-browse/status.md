# Status — 12b river-log-watershed-browse

## 2026-05-18
- Promoted from queued → active after slice 12 shipped same day.
- Scope expanded per user direction:
  - Promote `Logs` to top-nav (next to Map)
  - Add multi-day schema (endDate + campingJson + tripNights) here so we don't migrate later
  - Reserved slots for section map + sparkline (filled in 12g)
  - Nostalgia framing on RiverLogCard
- Plan updated; ROADMAP rendered; intent files for 12d / 12e / 12f / 12g written; 12e promoted ahead of 12d per user direction.

### Phase 1 complete — multi-day schema + pure helpers
- `schemas/river-log.graphql` extended with `endDate: String @indexed`, `campingJson: String`, `tripNights: Int` (all additive nullables).
- `lib/log/multi-day-pure.ts` — `validateDateRange`, `tripNightsBetween`, `parseCamping`, `stringifyCamping`, `validateCampingAgainstRange`, `MAX_TRIP_NIGHTS = 14`.
- `test/multi-day-pure.test.ts` — 22 new tests covering single-day, multi-day, malformed dates, MAX_TRIP_NIGHTS cap, camping JSON roundtrip, range validation.
- `npm test`: **103 / 103 green** (22 new + 81 prior).

### Phase 2 complete — write extension + MyLogsView
- `lib/log/river-log-pure.ts` extended: `WRITABLE_FIELDS` adds `endDate` + `campingJson`; `BuildLogInput` takes the new fields; `buildNewLogRow` derives `tripNights` via `tripNightsBetween`.
- `resources/RiverLog.ts` POST validates `validateDateRange` + `validateCampingAgainstRange`, accepts either `data.camping` (array) or `data.campingJson` (string), persists `campingJson`. PATCH recomputes `tripNights` when date or endDate changes and re-validates camping against the new range; clears stale camping when an edit collapses to single-day.
- `resources/MyLogs.ts` → `class MyLogsView`. Single aggregate read returning `{watersheds[], yearGroups[], logs[], homeWatershedId, generatedAt}`. Builds watershed → corridor → section group structure from denormalized IDs on `RiverLog` rows. Year-group is a flat newest-first list per year.
- `vite.config.ts` proxy whitelist: `/MyLogsView`.
- `npm test`: **103 / 103 still green**.
- Live smoke test: `GET /MyLogsView` returns 401 unauth (correct gating).

### Phase 3 complete — frontend types + hook + api
- `app/src/types.ts`: `CampingNight`, extended `RiverLogEntry` / `RiverLogInput` with `endDate`/`campingJson`/`tripNights`, new `MyLogsSection`/`MyLogsCorridor`/`MyLogsWatershed`/`MyLogsYearGroup`/`MyLogsAggregateResponse`.
- `app/src/api.ts`: `myLogsAggregate()` → `GET /MyLogsView`.
- `app/src/hooks/useMyLogsAggregate.ts`: auth-gated react-query hook.
- `app/src/hooks/useLogMutations.ts`: invalidates `['myLogsAggregate']` on every log write so `/logs` stays fresh.

### Phase 4 complete — MultiDayDateField + LogTripPage upgrade
- `app/src/components/MultiDayDateField.tsx`: single date by default, `+ Make this a multi-day trip` chip expands to start + end + per-night camp location editor. "Back to single-day" collapses back and clears camping. Nights auto-realigned when range changes; max 14 nights.
- `app/src/pages/LogTripPage.tsx`: replaces the single-date input with `<MultiDayDateField>`. Hydrates `endDate` / `camping` from existing log on edit. Submit payload sends `endDate` + `camping` (array form). Cleaned-camping helper drops empty location rows before POST.
- Inline `parseCampingFromJson` helper avoids cross-root import from `lib/log/`.
- Verified visually: single-day form renders compact; multi-day toggle expands to dual date + camping list.

### Phase 5 complete — date-range + camping on the card
- `app/src/components/RiverLogCard.tsx`: `// LOGGED · {date}` becomes `// LOGGED · 2026-05-15 → 2026-05-17 · 2 nights` for multi-day. Renders `// CAMPED AT` mono block with each night listed.
- `PastTripsStrip` (existing) inherits the new card rendering — no separate edit needed.

### Phase 6 complete — /logs page + nav
- `app/src/components/LogFilterBar.tsx`: view toggle (watershed/year) + craft + tag + watershed selects. URL-bound state. Result summary line below.
- `app/src/pages/MyLogsPage.tsx`: chrome (desktop AppHeader / mobile back-bar), eyebrow + tagline, filter bar, watershed-view accordion (lazy expand) or year-view (flat `RiverLogCard` list per year), empty state with "Browse rivers →" CTA, error state on backend failure.
- Watershed-view filtering rebuilds the watershed → corridor → section tree from the filtered log set client-side; counts stay accurate after filter changes.
- Default-expanded watershed comes from `data.homeWatershedId` (set via `/profile`).
- `app/src/components/AppHeader.tsx`: `Logs` nav link between `Map` and `Admin` (auth-gated). New `activePage` type extended to `'rivers' | 'map' | 'logs' | 'admin'`.
- `app/src/mobile/MobileDashboard.tsx`: star-icon button added to top-right strip, navigates to `/logs` (auth-gated).
- `app/src/App.tsx`: `/logs` route registered as a lazy import.

### Phase 7 complete — verification
- `npm test`: **103 / 103 green** (22 new multi-day-pure tests + 81 prior).
- `npx vite build`: **green** in 172 ms.
- Browser walkthrough (dev-bypass, since no OAuth this session):
  - `/log/new?sectionId=arkansas-browns-canyon`: single-day form renders, `+ Make this a multi-day trip` chip works, multi-day expansion shows start/end + camp-location list, "Back to single-day" collapses cleanly.
  - `/logs`: desktop chrome with Logs highlighted in nav, error state ("Couldn't load your logs") for the dev-bypass user (correct: backend 401s).
  - 320×568 mobile: chrome bar with `< Rivers` + centered "Logs" title, error card visible without overflow.
- Multi-day end-to-end (POST → list → card render) requires a real OAuth session — same constraint as slice 12.

### Slice 12b closed — 2026-05-18
- All 11 acceptance criteria from [plan.md](plan.md) met by the shipped code.
- Status: **done**. Moved to `.plans/completed/12b-river-log-watershed-browse/`.
- ROADMAP advanced: 12b → done, **12e (saved-crafts)** promoted to active per the prior reorder.
