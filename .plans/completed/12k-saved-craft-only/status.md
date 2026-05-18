# Status — 12k saved-craft-only

## 2026-05-18
- Promoted from queued → active. Small UX simplification on the log form.

### Phase 1 complete — LogTripPage refactor
- [app/src/pages/LogTripPage.tsx](../../../app/src/pages/LogTripPage.tsx) rewritten:
  - Dropped `craftType` / `craftSize` / `craftName` state and all related setters.
  - Dropped the `<CraftDetailsFieldset>` render and its import.
  - `crewSize` lifted into its own input next to **Duration (hrs)**, two-column grid.
  - `// SAVED CRAFT` is now the only craft surface; on a fresh log it pre-selects the user's default craft, and the picker's existing empty-state handles "no crafts yet" with the inline `+ New craft` flow.
  - Submit blocked until `craftId` is set; the existing `submitError` line shows `"Pick a saved craft, or save a new one."` if the user tries.
  - Edit hydration now reads `craftId` only — denormalized craft fields are display-only on the card.
  - Cleaned out the unused `CraftType` import.

### Phase 2 complete — delete unused component
- Removed `app/src/components/CraftDetailsFieldset.tsx`. It had only one consumer (`LogTripPage`); craft creation lives in `<CraftInlineCreator>` inside `<CraftPicker>` and on `/logs/crafts`.

### Phase 3 complete — verification
- `npm test`: **185 / 185 green**.
- `npx vite build`: **green** in 145 ms.
- Browser walkthrough at 1280×1000 (dev-bypass user with no saved crafts):
  - Form shows: eyebrow → title → date + multi-day toggle → Duration + Crew size in a 2-col grid → **only** `// SAVED CRAFT` (no separate `// CRAFT` fieldset) → empty-state card "No saved crafts yet. Save one to reuse it on every log." with `+ New craft` button → Put-in/Take-out → Conditions → Notes → Log this trip (disabled, 60% opacity).
  - DOM check confirms: `<legend>// CRAFT</legend>` is gone; `// SAVED CRAFT` is present.
  - Submit disabled while `craftId === null` — clicking it does nothing; if the form were submitted manually, the inline error path triggers.
- Mobile 320×700: Duration + Crew size still side-by-side, picker empty-state wraps but stays readable, `+ New craft` button accessible.

### Slice 12k closed — 2026-05-18
- Status: **done**. Moved to `.plans/completed/12k-saved-craft-only/`.
- ROADMAP: 12k → done, **12c (river-log-sharing)** restored to active.
- The craft picker is the single source of craft truth on the log form. Renaming a boat now happens at `/logs/crafts`, not on each log.
