---
slice: 01-flowband-browns-fix
status: active
value: 10
confidence: 10
effort: M
depends_on: []
unlocks: [02-watershed-corridor-ia, 05-history-forecast-chart, 07-drivers-and-context-ui, 10-admin-editorial-ui]
opened: 2026-05-13
closed: null
---

# Slice 01 — FlowBand schema + Browns Canyon fix

## Goal

Browns Canyon at 396 cfs displays **"Runnable (technical)"** for raft+intermediate, not "too low to float." Craft and skill selector live on the section page. Bands are editable rows in a `FlowBand` table, not hardcoded thresholds. All five Arkansas Headwaters sections seeded with bands across `raft / paddle-raft / kayak` × `beginner / intermediate / expert`.

This is the canonical broken thing the user called out. Fixing it validates the whole FlowBand model and unblocks every downstream slice that interprets flow.

## Acceptance criteria

1. `/section/arkansas-browns-canyon` shows a craft+skill selector
2. Default selection (raft + intermediate) at current flow displays an appropriate FlowBand row from the database, with a description like "Runnable, but expect frequent scraping and technical moves"
3. Toggling to `raft + beginner` shows the marginal/not-recommended band
4. Toggling to `kayak + intermediate` shows kayak-specific copy
5. The status pill on the section list and detail hero matches the resolved band
6. `resolveFlowBand(sectionId, craft, skill, value)` falls back to legacy `flowLow/flowRunnable/...` Ints when no FlowBand row matches
7. Legacy `getFlowStatus()` calls still work (back-compat preserved)
8. Seed data includes ≈ 45 FlowBand rows for the 5 Arkansas Headwaters sections × 3 crafts × 3 skills
9. Tests cover the resolver precedence rules

## Files to create

### Backend
- `schemas/flow-band.graphql` — `FlowBand` type definition
- `resources/FlowBand.ts` — REST resource (mostly relies on Harper auto-generated endpoints)
- `lib/flow-bands.ts` — `resolveFlowBand(sectionId, craft, skill, value)` helper

### Frontend
- `app/src/components/FlowBandSelector.tsx` — craft chips + skill toggle + band display
- `app/src/components/BandChip.tsx` — large pill with color + label + description
- `app/src/lib/craftTypes.ts` — craft enum + icons + labels (small, shared)

### Tests
- `test/flow-bands.test.js` — resolver precedence + fallback behavior

## Files to modify

- `schemas/river.graphql` — no changes yet; `RiverSection.flowLow/...` Ints stay as fallback
- `lib/seed-data.ts` — add `FLOW_BANDS` array; ~45 rows for Arkansas Headwaters
- `resources/Seed.ts` — upsert `FlowBand` rows during seed; add `action: "expand-bands"` to auto-generate seeded-from-legacy rows for other sections
- `resources/RiverDetail.ts` — include `flowBands: FlowBand[]` and `resolvedBand: {bandName, description, rating}` in the detail response; accept `?craft=...&skill=...` query params (default raft+intermediate)
- `resources/Dashboard.ts` — include resolved band in each section card (default raft+intermediate, no per-card selector for now)
- `lib/utils.ts` — keep `getFlowStatus()` for back-compat; add a `resolveBandLabel(bandName)` helper that maps FlowBand bandName to existing status pill semantics
- `app/src/desktop/DesktopDetail.tsx` — render `<FlowBandSelector>` above the chart; consume `resolvedBand` from RiverDetail response
- `app/src/mobile/MobileDetail.tsx` — same
- `app/src/types.ts` — extend `DetailViewModel` with `flowBands`, `resolvedBand`, current `craft`/`skill`
- `app/src/lib/transform.ts` — map the new response fields
- `app/src/hooks/useRiverDetail.ts` (or wherever the detail query lives) — accept `craft` + `skill` arguments; persist last selection to localStorage

## Schema sketch

```graphql
# schemas/flow-band.graphql
type FlowBand @table @export {
  id: ID @primaryKey              # composite: sectionId_craft_commercial_skill_bandName
  sectionId: ID @indexed
  section: RiverSection @relationship(from: "sectionId")
  craftType: String @indexed      # raft | paddle-raft | oar-raft | kayak | ducky | sup | packraft
  commercial: Boolean @indexed    # null/false = either or private; true = commercial-only
  skillLevel: String @indexed     # beginner | intermediate | expert
  bandName: String                # too-low | low-runnable | technical | commercially-viable | ideal | pushy | high | expert-only | unsafe
  minCfs: Int
  maxCfs: Int
  rating: String                  # no-go | marginal | good | ideal | challenging | dangerous
  description: String             # 1-2 sentence human-readable copy
  authorNote: String              # editorial override / context
  source: String                  # american-whitewater | guide-input | user-curated | seeded-from-legacy
  sourceUserId: String
  updatedAt: String
  active: Boolean @indexed
}
```

## Resolver precedence (locked)

`resolveFlowBand(sectionId, craft, skill, value)`:

1. Find all `FlowBand` rows with `sectionId=X AND active=true`
2. Filter by `minCfs <= value <= maxCfs`
3. Among the matches, pick by precedence:
   - Exact `(craftType=craft AND skillLevel=skill)` — most specific
   - `(craftType=craft AND skillLevel=null)` — craft-only
   - `(craftType=null AND skillLevel=skill)` — skill-only
   - `(craftType=null AND skillLevel=null)` — generic
4. If no FlowBand row matches: derive a synthetic band from legacy `RiverSection.flowLow / flowRunnable / flowIdealMin / flowIdealMax / flowHigh / flowExpert / flowDangerous` and return it with `source: "legacy-fallback"` so the UI can surface "showing generic bands"

## Seed data plan

For each of the 5 Arkansas Headwaters sections (Numbers, Fractions, Browns, Bighorn, Royal Gorge):

- 3 crafts (raft, paddle-raft, kayak) × 3 skills (beginner, intermediate, expert) = 9 rows per section
- Each row has 3–5 bands depending on craft (e.g., kayak rarely hits "too low"; raft has a clear "expert only" upper edge)
- Total seeded rows: ~150 for Arkansas Headwaters

Specifically for **Browns Canyon at 396 cfs**:

```ts
{
  id: 'browns-canyon_raft_intermediate_low-runnable',
  sectionId: 'arkansas-browns-canyon',
  craftType: 'raft',
  skillLevel: 'intermediate',
  bandName: 'low-runnable',
  minCfs: 350,
  maxCfs: 500,
  rating: 'marginal',
  description: 'Runnable for experienced paddle crew. Expect frequent scraping and technical moves around exposed rocks. Slow day, scout the big features.',
  authorNote: 'Browns scrubs at this level; experienced guides report fine private trips. Not recommended for commercial trips.',
  source: 'guide-input',
  active: true,
},
{
  id: 'browns-canyon_raft_beginner_low-runnable',
  sectionId: 'arkansas-browns-canyon',
  craftType: 'raft',
  skillLevel: 'beginner',
  bandName: 'low-runnable',
  minCfs: 350,
  maxCfs: 500,
  rating: 'no-go',
  description: 'Not recommended at this level — technical maneuvering required. Consider Bighorn Sheep Canyon instead.',
  source: 'guide-input',
  active: true,
},
// ... and so on for other bands
```

## UI layout (DesktopDetail change)

```
[hero stat strip — unchanged]
[NEW: FlowBandSelector]
   Craft chips: [Raft*] [Paddle Raft] [Kayak]   <- selected = filled
   Skill toggle: [ Beginner | Intermediate* | Expert ]
   Band chip (big):
     ▮ Runnable (technical)
     Runnable for experienced paddle crew. Expect frequent scraping...
[main flow chart — unchanged]
[forecast band — unchanged]
[context cards — unchanged]
```

Mobile: same components, stacked vertically, chips wrap.

Selector persists to `localStorage` as `flowstate.craft` and `flowstate.skill`. Default values on first visit: `raft` + `intermediate`.

## Verification steps

1. `npm run dev` + `npm run ui:dev` — both start without errors
2. `npm run test` — new resolver tests pass; existing tests still pass
3. Open `http://localhost:5173/section/arkansas-browns-canyon` — see craft+skill selector above the chart
4. With current flow at whatever Browns is at (assume ~400 cfs): band chip reads "Runnable (technical)" + correct description
5. Toggle craft to "Paddle Raft" — chip and description update
6. Toggle skill to "Beginner" — chip and description update (likely shows "not recommended")
7. Toggle craft to "Kayak" — kayak-specific copy
8. Refresh page — selector remembers last selection (localStorage)
9. Visit `/section/arkansas-numbers`, `/section/arkansas-fractions`, `/section/arkansas-royal-gorge`, `/section/arkansas-bighorn-sheep` — all have bands seeded; selector works on each
10. Visit a non-Arkansas section (e.g. `/section/clear-creek-lower`) — selector still works, falls back to legacy thresholds, UI surfaces "showing generic bands"
11. Admin → trigger Seed action `expand-bands` — confirm seeded-from-legacy rows are written for all sections (not just Arkansas)
12. Hit `GET /FlowBand/?sectionId=arkansas-browns-canyon` — confirm rows are queryable directly via Harper's auto-generated REST

## Out of scope (deferred)

- Admin UI for editing FlowBands (slice 10)
- Forecast band interpretation through FlowBands (slice 05 — needs forecast pipeline first)
- Map tooltip showing resolved band (slice 06)
- Per-card craft selector on dashboard cards (deferred; dashboard uses default for now)
- Commercial vs private distinction in UI (schema supports it; UI flag deferred)
- Watershed/corridor pages (slice 02)

## Risks and mitigations

- **Risk**: resolver complexity makes detail page slow.
  **Mitigation**: bands are small; one query per section. If it becomes a problem, pre-resolve in `Dashboard.ts` snapshot.

- **Risk**: legacy Int fallback feels wrong when partial coverage exists (e.g., section has raft bands but not kayak).
  **Mitigation**: surface "showing generic bands" prominently when fallback fires, with a "request bands" link (no-op for now, signal of demand).

- **Risk**: seed data is wrong (specifically the Browns numbers).
  **Mitigation**: the user is a former Browns guide; have them review the seeded JSON before declaring done.

## Critical references

- Existing flow status logic: [lib/utils.ts:57-69](../../lib/utils.ts) `getFlowStatus()` — keep for back-compat, do not delete
- Section schema: [schemas/river.graphql](../../schemas/river.graphql) — legacy Int fields stay
- Detail rendering: [app/src/desktop/DesktopDetail.tsx](../../app/src/desktop/DesktopDetail.tsx)
- Detail response shape: [resources/RiverDetail.ts](../../resources/RiverDetail.ts)
- Seed pattern: [lib/seed-data.ts](../../lib/seed-data.ts) — existing arrays + new `FLOW_BANDS`
- Vision: [vision/data-model-philosophy.md](../../vision/data-model-philosophy.md) — FlowBand resolution rules
- Vision: [vision/ux-direction.md](../../vision/ux-direction.md) — band chip + craft chip visual primitives
