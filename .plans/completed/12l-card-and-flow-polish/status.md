# Status — 12l card-and-flow-polish

## 2026-05-18
- Promoted from queued → active. Four refinements that surfaced after living with the river-log surface.

### Phase 1 complete — trip-date formatter + tests
- [lib/log/trip-date-pure.ts](../../../lib/log/trip-date-pure.ts): `ordinalSuffix`, `formatDayWithOrdinal`, `formatTripDateLong`, and `formatTripDate(date, endDate, tripNights)` that returns `{ label, nightsLabel }`.
  - Single day → `May 16th, 2026`
  - Multi-day same-year → `May 15th → May 17th, 2026` + `2 nights`
  - Multi-day cross-year → `December 30th, 2025 → January 2nd, 2026` + `3 nights`
- 12 new tests in [test/trip-date-pure.test.ts](../../../test/trip-date-pure.test.ts) covering ordinal edge cases (1st/2nd/3rd, 11th/12th/13th, 21st/22nd/23rd, 31st), single + multi-day + cross-year, malformed input.
- `npm test`: **197 / 197 green**.

### Phase 2 complete — GaugeReading flow fallback + relaxed retry
- [lib/log/flow-resolver-pure.ts](../../../lib/log/flow-resolver-pure.ts):
  - `shouldRetryFlowResolution` no longer caps at 7 days. Returns true for any past or same-day trip, false for future-dated.
  - New `dayWindowUtc(yyyymmdd)` → `{ start, end }` ISO strings one day apart.
  - New `averageReadings(rows)` mean of `.value`, skipping non-numerics.
- [lib/log/flow-resolver.ts](../../../lib/log/flow-resolver.ts) refactored:
  - Tries `tables.DailyGaugeRollup` first (cheap when 03b lands).
  - Falls back to `tables.GaugeReading.search({gaugeId, timestamp gte day-start})` walking forward until the timestamp crosses the day boundary. Harper's filtered search doesn't reliably combine two conditions on the same attribute (gte + lt), so we use single-attribute gte + JS short-circuit.
  - Returns null only when zero readings exist for the day.
- 6 new tests added + 2 existing tests rewritten in [test/river-log-flow-resolver.test.ts](../../../test/river-log-flow-resolver.test.ts).
- `npm test`: **203 / 203 green**.

### Phase 3 complete — card eyebrow rewrite
- [app/src/components/RiverLogCard.tsx](../../../app/src/components/RiverLogCard.tsx):
  - Dropped the `// LOGGED · …` mono eyebrow.
  - New primary line (body-size, weight 600): `{date} · {craftName} · {nightsLabel}`, with dot separators and the nights label rendered in mono small caps.
  - Inline date formatter mirrors `lib/log/trip-date-pure.ts` (kept local to avoid Vite cross-root imports).
  - Removed `craftName` from the body row since it's been promoted to the eyebrow.

### Phase 4 complete — PastTripsStrip moved to bottom
- [app/src/mobile/MobileDetail.tsx](../../../app/src/mobile/MobileDetail.tsx): the `<PastTripsStrip>` section now renders after the Gauge section (last) instead of between hero and chart.
- [app/src/desktop/DesktopDetail.tsx](../../../app/src/desktop/DesktopDetail.tsx): same — moved out of the under-hero slot to below the Forecast + Briefing + Context grid.
- Order: anonymous users see no change (PastTripsStrip is auth-gated). Authenticated users see the strip as the final block of the page.

### Phase 5 complete — verification
- `npm test`: **203 / 203 green**.
- `npx vite build`: **green** in 141 ms.
- Browser walkthrough at 1280×1100, logged in as a real email user with an existing log on `/section/arkansas-fractions`:
  - Scrolled the right pane to the bottom — `// PAST TRIPS · 1 LOGGED` is the last section, below Forecast, Briefing, Context, and Gauge.
  - Card eyebrow reads exactly `May 16th, 2026 · Slippery Pickle (Frame)`. No `// LOGGED`.
  - Flow chip resolved to `ran at 435 cfs` — the daily average from GaugeReading rows for 2026-05-16 (this log had `flowAtTripCfs: null` from creation; the lazy retry path now succeeds via the GaugeReading fallback).
- **Bug surfaced + fixed** mid-verification: Harper's `tables.RiverLog.search()` returns read-only proxy rows. `Object.assign(r, patch)` on a proxy throws "Cannot assign to read only property". Fixed `getMyLogsForSection` in [resources/RiverDetail.ts](../../../resources/RiverDetail.ts) and the list path in [resources/RiverLog.ts](../../../resources/RiverLog.ts) to spread each row into a plain object before mutating. `SectionLogs.ts` already returned `{...log, ...patch}` and was unaffected.

### Slice 12l closed — 2026-05-18
- Status: **done**. Moved to `.plans/completed/12l-card-and-flow-polish/`.
- ROADMAP: 12l → done, **12c (river-log-sharing)** restored to active.
- The river-log surface now feels right: hero → flow data → context → past trips at the tail, with formatted dates, craft name in the eyebrow, and auto-populated CFS averages.
