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
- **Harper imports made lazy** in `lib/flow-bands.ts` so the pure functions can be tested outside the Harper runtime. `loadBandsForSection` and `resolveFlowBand` do `await import('harper')` internally. — **Reverted on 2026-05-14**, see post-ship incident below.

## Closed: 2026-05-14

Shipped to GitHub ([ea21adf](https://github.com/alekshaugom/Flow-State/commit/ea21adf)) and Fabric ([flow.state.harperfabric.com](https://flow.state.harperfabric.com)). Production verified: all 5 Arkansas Headwaters sections resolve to `guide-input` source with their craft-specific descriptions; non-Arkansas sections fall back cleanly to legacy thresholds with the bumped descriptions.

## Post-ship incident — 2026-05-14

After the deploy + first production seed, section detail pages were sporadically returning `flow.current: null` and `flowBands: 0`, even though the Dashboard endpoint (same Harper instance, same prod) was returning the correct 63 bands per Arkansas section.

Root cause was two stacked Harper gotchas:

1. **Dynamic-imported `tables` is not data-consistent** with the static-imported `tables` proxy other Resources use. `lib/flow-bands.ts` used `await import('harper')` for testability, and the returned `tables.FlowBand.search()` view did not see the seeded rows on Fabric even though the same query worked via a Resource that statically imported `tables`. → Reverted to a static `import { tables } from 'harper'` and extracted the pure helpers into `lib/flow-bands-pure.ts` so tests don't need to boot Harper. ([187c90d](https://github.com/alekshaugom/Flow-State/commit/187c90d))

2. **Filtered `tables.X.search({conditions: [{attribute: 'sectionId', comparator: 'equals'}]})` returned 0 rows after a rolling restart**, while `search({conditions: []})` on the same table returned all 315 rows and the same row was queryable via REST. The indexed-search path apparently lags behind the full-scan path on Fabric for a window after restart. → Switched `loadBandsForSection` to a process-local cache: load all FlowBand rows once with empty conditions (cheap — table is small), keep them in module scope for 5 min, filter by sectionId in memory. Seed action now calls `invalidateFlowBandsCache()` + `invalidateDashboardCache()` so freshly seeded bands take effect immediately. ([c047180](https://github.com/alekshaugom/Flow-State/commit/c047180))

3. **`Resource.post()` takes `data` as the first positional arg** (not `(target, data)` like `put`/`patch`). This bit during initial seed wiring. → Already captured in [L003](../../lessons/L003-harper-resource-post-signature.md).

Defensive improvements added along the way:
- `RiverDetail` now falls back to `GaugeSnapshot.currentFlow` when `GaugeReading.search` returns empty. ([5bd5896](https://github.com/alekshaugom/Flow-State/commit/5bd5896))

New lesson captured: [L004 — Harper static-import requirement + indexed-search post-restart lag](../../lessons/L004-harper-static-import-and-search-after-restart.md).

Final production check across 5 sections + 2 fallback sections — all correct.
