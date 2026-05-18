---
slice: 12m-log-card-density
status: done
value: 5
confidence: 9
effort: S
depends_on: [12-river-log-core, 12l-card-and-flow-polish]
unlocks: []
opened: 2026-05-18
closed: 2026-05-18
---

# Slice 12m — Log card density: drop craft chip + duration, BigCFS flow, chips at the bottom

## Goal

Four small visual cleanups on `<RiverLogCard>` that surfaced after the 12l polish:

1. **Drop the craft-type chip** (e.g. "Oar-Raft"). The craft *name* in the eyebrow already implies the type.
2. **Drop the on-river duration** (e.g. "3.5h"). Not enough signal vs. visual noise on the card; we still store it.
3. **Restyle the flow display** to match the home-page sidebar (`<DesktopRiverRow>` / mobile `<RiverCard>` BigCFS pattern): big mono number + small "cfs" label, with the appropriate status pill rendered next to it when section thresholds are available.
4. **Move conditions tag chips to the bottom** of the card so the flow + notes lead and the chips become a quiet tag-cloud tail.

## Acceptance criteria

1. The body row beneath the eyebrow **no longer contains** the craft-type chip (`Oar-Raft` / `Paddle Boat` / `Kayak/SUP`) or the `3.5h` duration text. Crew size stays.
2. Flow renders via `<BigCFS>` (mono number + small "cfs"), same as the home-page sidebar's per-section rows.
3. When `<RiverLogCard>` receives a `sectionThresholds` prop, a colored `<StatusPill>` renders next to the BigCFS using the legacy `getFlowStatus` mapping + `STATUS_COLORS`.
4. When no thresholds are provided (e.g. `/logs` year view), the BigCFS renders alone (no status pill); the card still looks fine.
5. Conditions chips render as the **last** block of the card body, below the flow, the put-in/take-out line, the camping list, and the notes preview, but **above** the profile-footer dashed-border block.
6. On `/section/:id`, the cards in `<PastTripsStrip>` get the section's thresholds threaded through from `DetailViewModel` so the status pill renders.
7. Mobile 320×568 still wraps cleanly. The BigCFS sits left, the pill wraps under it on narrow widths.

## Files to modify

- `app/src/types.ts` — extend `DetailViewModel` with a `flowThresholds` field (same shape as `DashboardSection.legacyThresholds`) so the section page can thread all seven flow thresholds to its child components.
- `app/src/lib/transform.ts` — populate `flowThresholds` in `transformDetail` from `section.flowLow` / `flowRunnable` / `flowIdealMin` / `flowIdealMax` / `flowHigh` / `flowExpert` / `flowDangerous`.
- `app/src/components/PastTripsStrip.tsx` — accept an optional `sectionThresholds` prop and forward it to each `<RiverLogCard>`.
- `app/src/components/RiverLogCard.tsx`:
  - Drop the craft chip and the `durationHours` span from the body row.
  - Replace the inline `ran at … cfs` chip with `<BigCFS cfs={log.flowAtTripCfs} />` plus `<StatusPill>` when `sectionThresholds` is provided.
  - Reorder so the conditions chips render last (after notes, before the profile footer).
- `app/src/mobile/MobileDetail.tsx` + `app/src/desktop/DesktopDetail.tsx` — pass `detail.flowThresholds` into `<PastTripsStrip>`.

## Out of scope

- Threading thresholds into `/logs` year view (would require extending `MyLogsView` to return sections + thresholds). Cards there render without a status pill — acceptable, the view is a chronological journal, not a flow snapshot.
- Storing a denormalized status on `RiverLog` rows.
- Changing how `flowAtTripCfs` is resolved or stored (handled in 12l).

## Risks / edge cases

- **`flowAtTripCfs` null.** `BigCFS` already renders `—` for null; the card just shows the dash instead of a number. Status pill is suppressed in that case.
- **Thresholds incomplete on legacy sections.** `getFlowStatus` already tolerates missing thresholds (treats them as 0 and returns the safer "low/no-flow" bands). No new failure modes.
- **Mobile 320px.** With BigCFS at ~28px font + a pill, the flow row may need to wrap. `flexWrap: 'wrap'` handles it.

## Verification

1. `npm test` — green (no test changes expected; this is presentation only).
2. `/section/arkansas-fractions` (authenticated, with the existing log): card shows `May 16th, 2026 · Slippery Pickle (Frame)` eyebrow, BigCFS-styled `435 cfs` row with a runnable-colored status pill, no craft chip, no `3.5h`. Conditions chips appear below the notes block.
3. Mobile 320×568: same content, BigCFS may wrap under the pill or vice-versa but the row stays legible.

## Critical references

- 12l shipped state: [completed/12l-card-and-flow-polish/](../../completed/12l-card-and-flow-polish/)
- Home-page sidebar style to mirror: [app/src/desktop/DesktopRiverRow.tsx](../../../app/src/desktop/DesktopRiverRow.tsx), [app/src/mobile/RiverCard.tsx](../../../app/src/mobile/RiverCard.tsx) — both use `<BigCFS>` + `<StatusPill>`.
- Shared CFS component: [app/src/components/BigCFS.tsx](../../../app/src/components/BigCFS.tsx)
- Status helpers: [app/src/constants.ts](../../../app/src/constants.ts) (`STATUS_COLORS`, `mapStatusToDesign`, `STATUS_LABEL`) + [lib/utils.ts](../../../lib/utils.ts) `getFlowStatus` (already importable as a pure helper).
