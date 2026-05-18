---
slice: 12l-card-and-flow-polish
status: done
value: 6
confidence: 9
effort: S
depends_on: [12-river-log-core, 12e-saved-crafts, 12k-saved-craft-only]
unlocks: []
opened: 2026-05-18
closed: 2026-05-18
---

# Slice 12l — RiverLogCard polish + section layout + GaugeReading flow fallback

## Goal

Four small refinements surfaced after living with the river-log surface for a session:

1. **Section detail: Past Trips moves to the very bottom** on both mobile and desktop. Today it sits between the hero and the chart; that draws too much attention away from the flow data on a section the user hasn't logged yet. Putting it last makes "what's the river doing right now" the lead and "what's the river been like for me" the tail.
2. **Drop the `// LOGGED` eyebrow on the card.** It's redundant — the card *is* a log.
3. **Format the trip date as `May 16th, 2026`** (with ordinal suffix). For multi-day, drop the year on the start side when the end is in the same year: `May 15th → May 17th, 2026 · 2 nights`.
4. **Put the boat name next to the date with a dot separator.** So the new eyebrow line reads: `May 16th, 2026 · Slippery Pickle · 2 nights`.
5. **Auto-populate `flowAtTripCfs` from stored `GaugeReading` rows** when `DailyGaugeRollup` isn't present (which it never is locally — 03b is deferred). Compute the daily average for the section's `primaryGaugeId` on the trip's start date. Also lift the 7-day retry cap so historical logs can resolve too.

## Acceptance criteria

1. **Layout.** Past Trips renders as the **last** section on `/section/:id` for both `<MobileDetail>` and `<DesktopDetail>`. No other section moves.
2. **Card eyebrow** on `<RiverLogCard>`:
   - Single-day: `May 16th, 2026 · Slippery Pickle`
   - Multi-day same-year: `May 15th → May 17th, 2026 · Slippery Pickle · 2 nights`
   - Multi-day cross-year: `December 30th, 2025 → January 2nd, 2026 · Slippery Pickle · 3 nights`
   - No `// LOGGED` prefix anywhere on the card.
3. **Body row** on the card no longer duplicates `craftName` (it's been promoted to the eyebrow). The craft type chip + crew + duration line stays.
4. **Flow fallback.**
   - `lib/log/flow-resolver.ts` first tries `tables.DailyGaugeRollup` (unchanged, for the future 03b case).
   - On a miss, falls back to `tables.GaugeReading.search(primaryGaugeId, [date 00:00 UTC, date + 1d 00:00 UTC))` and returns the average `value` as `cfs`.
   - Returns null only if there are zero readings in the window.
5. **Retry-on-read.** `shouldRetryFlowResolution` no longer caps at 7 days post-trip. Any past-date trip with `flowAtTripCfs === null` triggers a resolve attempt on read. Future-dated trips still skip (we don't have data yet).
6. **Tests cover** the new ordinal date formatter (single + multi-day + cross-year) and the relaxed retry-window rule.
7. **Backward compat.** A log with `craftName` but no `craftId` still renders the craft name in the new eyebrow position. A log with `flowAtTripCfs` already set is **not** overwritten on read; only null values get resolved.

## Files to create

- `lib/log/trip-date-pure.ts` — `formatTripDate(date, endDate, tripNights)` returns `{ label, nightsLabel }`. Pure, no Harper, no Intl side effects beyond `Date` parsing.
- `test/trip-date-pure.test.ts` — single-day, multi-day same-year, multi-day cross-year, ordinal-suffix edge cases (1st/2nd/3rd/11th/12th/13th/21st/22nd/23rd/etc.).

## Files to modify

- `lib/log/flow-resolver.ts`:
  - After the `DailyGaugeRollup` miss, run a filtered `tables.GaugeReading.search` for `[date 00:00 UTC, date + 1d 00:00 UTC)` and average the `value` field.
  - Return null only if no readings exist.
- `lib/log/flow-resolver-pure.ts`:
  - Change `shouldRetryFlowResolution` to allow any past or same-day date; remove the 7-day upper bound. Future-dated trips still return false (we don't have data yet).
  - Add `averageReadings(rows)` pure helper that computes the mean from `[{value: number}, ...]`, ignoring non-numeric values.
- `test/river-log-flow-resolver.test.ts` — update the 7-day-cap tests to the new rule.
- `app/src/components/RiverLogCard.tsx`:
  - Drop the `// LOGGED · ...` eyebrow and the inline date-formatter helpers in favor of the shared pure formatter (mirror-inlined to avoid Vite cross-root import — small enough to duplicate).
  - New eyebrow line reads: `{dateLabel} · {craftName?} · {nightsLabel?}`. Each part dropped when missing.
  - Remove `craftName` from the body row.
- `app/src/mobile/MobileDetail.tsx` — move the `<PastTripsStrip>` section so it renders **after** the Gauge section (the current last block).
- `app/src/desktop/DesktopDetail.tsx` — move the `<PastTripsStrip>` so it renders **after** the bottom "Forecast + Briefing + Context" grid.

## Out of scope

- Editing the flow value on the log form (it's resolver-only).
- Backfilling existing null-flow logs en masse — they'll auto-resolve next time they're read.
- A "snapshot" history line on the card (deferred to 12g).
- A per-day breakdown of flow for multi-day trips (also 12g territory).

## Risks / edge cases

- **Zero readings on the trip day.** Resolver returns null, log stays `ran at — cfs`. Acceptable.
- **Many readings.** Browns Canyon's USGS gauge reads every 15 minutes (~96/day). Averaging them in JS is trivial. No optimization needed.
- **Date-boundary edge cases.** Use UTC day boundaries consistently — that's what the existing flow-bands code does.
- **Card row width.** New eyebrow is one line; long craft names could wrap on mobile 320px. The card already wraps cleanly via `flexWrap: 'wrap'` for the body row; the eyebrow uses `letterSpacing` + small font so even `May 16th, 2026 · Slippery Pickle (Frame) · 2 nights` fits at 320px.
- **L004.** No new resources; existing static-import + non-empty-cache pattern still applies. `GaugeReading.search` is filtered by gaugeId + timestamp, not the empty-conditions form that L004 warned about.

## Verification

1. `npm test` — green including the new date-formatter + relaxed-retry tests.
2. `/section/arkansas-browns-canyon` (authenticated) — Past Trips strip is the **last** section on the page. The chart, forecast, context, gauge sections are all above it.
3. Same on mobile 320×568.
4. Log a trip for today on a section with active GaugeReading data. The card's flow chip shows the daily-average CFS within a second of save (resolver runs on first read).
5. Edit an old log that has `flowAtTripCfs: null` — open the section detail → its card now shows a resolved flow value (lifted retry cap).
6. Card eyebrow reads `May 16th, 2026 · Slippery Pickle` for a single-day log; `May 15th → May 17th, 2026 · Slippery Pickle · 2 nights` for a 2-night multi-day log.
7. Body row no longer shows the boat name (moved to eyebrow).

## Critical references

- Slice 12 schema + resolver: [completed/12-river-log-core/plan.md](../../completed/12-river-log-core/plan.md), [lib/log/flow-resolver.ts](../../../lib/log/flow-resolver.ts), [lib/log/flow-resolver-pure.ts](../../../lib/log/flow-resolver-pure.ts)
- GaugeReading source pattern: [resources/RiverDetail.ts](../../../resources/RiverDetail.ts) `getFlowData()` — already does filtered searches over the same window.
- 03b deferred: [slices/03b-forecast-snapshot-infra/](../03b-forecast-snapshot-infra/) — the rollup we're substituting for.
