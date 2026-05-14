# Status — slice 01

## 2026-05-13
- Slice opened. Plan written.
- Implementation complete. All acceptance criteria met:
  1. ✓ Craft+skill selector renders on section detail (desktop + mobile)
  2. ✓ Browns Canyon at 392 cfs (current actual flow) for raft+intermediate displays "Runnable (technical)" with hand-authored description and author note explaining the v1 mistake
  3. ✓ raft+beginner at 392 → "Too Low" (correct — beginner crews shouldn't be on Browns at low water; multiplier 1.4 puts low-runnable at 490+)
  4. ✓ raft+expert at 392 → "Runnable" (technical band, 375–524 via 0.75 multiplier)
  5. ✓ kayak+intermediate at 392 → "Ideal" (385–1,375 via 0.55 multiplier)
  6. ✓ Sidebar status pill on dashboard list updated — Browns/Fractions/Numbers now group under "Runnable" (12 sections), not "Low"
  7. ✓ `resolveFlowBand` falls back to legacy `flowLow/flowRunnable/...` Ints when no band matches (verified on Lower Clear Creek Canyon)
  8. ✓ Fallback surfaces "// GENERIC BANDS — CRAFT-SPECIFIC NOT YET CURATED" footer
  9. ✓ Legacy `getFlowStatus()` still exists; back-compat preserved
  10. ✓ Seeded 315 FlowBand rows for the 5 Arkansas Headwaters sections × 9 (craft, skill) combos × ~7 bands each
  11. ✓ 13 unit tests pass covering precedence rules, legacy fallback, the canonical Browns 396 case, and label/status helpers
  12. ✓ Selector persists craft/skill choice to localStorage and reads on mount
  13. ✓ Toggling craft/skill updates the band display client-side (no network roundtrip — all bands come down in initial response)

## Decisions made

- **Resolver precedence is locked**: exact `(craft, skill)` → `(craft, any skill)` → `(any craft, skill)` → `(any, any)` → legacy Ints. Documented in `lib/flow-bands.ts:selectByPrecedence`.
- **Seed bands are generated** from per-section baselines + craft/skill multipliers (raft+intermediate = 1.0; beginners shift up 1.2–1.4×; experts shift down 0.4–0.75×). One hand-authored override exists: the Browns Canyon raft+intermediate low-runnable band gets the explicit "v1 incorrectly labeled this as 'too low'" author note.
- **Frontend resolves locally on toggle** rather than re-fetching. The full `flowBands: FlowBand[]` array comes down in the `RiverDetail` response; client-side `resolveBandClient()` mirrors the server logic. Server-resolved band is included as `resolvedBand` for the default selection (raft + intermediate) to avoid a flash on first render.
- **Test runner switched to `npx tsx --test`** (from `node --test`) so tests can import `.ts` source directly without a separate build step.
- **Harper imports made lazy** in `lib/flow-bands.ts` so the pure functions can be tested outside the Harper runtime. `loadBandsForSection` and `resolveFlowBand` do `await import('harper')` internally.

## Closed: 2026-05-13

In-review pending user verification at http://localhost:5173/section/arkansas-browns-canyon.
