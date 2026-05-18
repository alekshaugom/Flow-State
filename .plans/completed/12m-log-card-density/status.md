# Status — 12m log-card-density

## 2026-05-18
- Promoted from queued → active. Four small card refinements.

### Phase 1 complete — DetailViewModel.flowThresholds
- [app/src/types.ts](../../../app/src/types.ts): added `flowThresholds` field (full 7-threshold object, nullable) to `DetailViewModel`.
- [app/src/lib/transform.ts](../../../app/src/lib/transform.ts): `transformDetail` populates `flowThresholds` from `section.flowLow`/`Runnable`/`IdealMin`/`IdealMax`/`High`/`Expert`/`Dangerous`.

### Phase 2 complete — thresholds threaded
- [app/src/components/PastTripsStrip.tsx](../../../app/src/components/PastTripsStrip.tsx): added optional `sectionThresholds` prop; forwards to each `<RiverLogCard>`.
- [app/src/mobile/MobileDetail.tsx](../../../app/src/mobile/MobileDetail.tsx) + [app/src/desktop/DesktopDetail.tsx](../../../app/src/desktop/DesktopDetail.tsx): both pass `detail.flowThresholds` into the strip.

### Phase 3 complete — RiverLogCard rewrite
- [app/src/components/RiverLogCard.tsx](../../../app/src/components/RiverLogCard.tsx):
  - Dropped the craft-type chip and the `durationHours` span. Crew size stays in a quiet subtitle line.
  - Replaced the river-blue `ran at 435 cfs` inline chip with `<BigCFS size="card" />` (mirrors `<RiverCard>` and `<DesktopRiverRow>` styling).
  - When `sectionThresholds` is supplied and `flowAtTripCfs` is non-null, renders `<StatusPill size="sm" />` next to BigCFS via `mapStatusToDesign(getFlowStatus(...))` (`getFlowStatus` inlined to avoid Vite cross-root import; mirrors `lib/utils.ts`).
  - Reordered: flow + status → put-in/take-out → camping list → notes → **conditions chips (now last)** → optional profile footer.
  - Exported `RiverLogCardThresholds` type so `PastTripsStrip` can thread it without re-defining.

### Phase 4 complete — verification
- `npm test`: **203 / 203 green** (no test changes — presentation only).
- `npx vite build`: **green** in 144 ms.
- Browser at 1280×1100, authenticated on `/section/arkansas-fractions`:
  - Card eyebrow: `May 16th, 2026 · Slippery Pickle (Frame)` — unchanged from 12l.
  - **No craft chip, no `3.5h` duration** under the eyebrow. Just `5 crew` subtitle (well — `null` crew in this log, so subtitle absent here).
  - Flow row: `435 cfs` rendered in BigCFS mono style + green `Runnable` status pill next to it. Matches the home-page sidebar visual rhythm.
  - Put-in → take-out line, then the notes, then the four conditions chips as the last body block.

### Slice 12m closed — 2026-05-18
- Status: **done**. Moved to `.plans/completed/12m-log-card-density/`.
- ROADMAP: 12m → done, **12c (river-log-sharing)** restored to active.
