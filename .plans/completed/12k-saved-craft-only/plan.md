---
slice: 12k-saved-craft-only
status: done
value: 6
confidence: 9
effort: S
depends_on: [12-river-log-core, 12e-saved-crafts]
unlocks: []
opened: 2026-05-18
closed: 2026-05-18
---

# Slice 12k — Saved-craft-only on the log form

## Goal

Drop the redundant inline `// CRAFT` fieldset on `/log/new` and `/log/:id/edit`. Crafts are always saved — the only craft surface on the log form is the `// SAVED CRAFT` picker. If a user has no saved crafts yet, the picker's empty state walks them through saving one inline (already shipped in 12e). Per-trip `crewSize` moves out of the craft fieldset into its own input next to duration.

The denormalized `craftType` / `craftSize` / `craftName` columns on `RiverLog` still exist (backend writes them at create time from the selected craft, per 12e) — they're just no longer admin-editable from the log form. To rename a boat, the user edits the craft itself at `/logs/crafts`.

## Acceptance criteria

1. **Single craft section.** `/log/new` and `/log/:id/edit` show `// SAVED CRAFT` only. The standalone `// CRAFT` fieldset is gone.
2. **Required craft.** Submit is blocked until a craft is selected (or created inline). Inline error: "Pick a saved craft, or save a new one."
3. **Empty state path.** A user with zero saved crafts sees the picker's existing empty state with `+ New craft`; saving creates the craft and populates the log's `craftId` in one step.
4. **Crew size relocated.** `crewSize` moves out of `<CraftDetailsFieldset>` (now deleted) into its own per-trip input, sitting next to `Duration (hrs)`.
5. **Editing legacy logs.** A log created before 12e (no `craftId`, only denormalized strings) renders the picker empty on edit. User must pick a craft to save changes — by design.
6. **Display unchanged.** `RiverLogCard` continues to render craft chip + name from the denormalized columns. No visual change to existing or new cards.
7. **Backend unchanged.** No schema or resource changes. `RiverLog.post` already requires `sectionId` + `date`; we add a frontend-side requirement that `craftId` is sent (server will continue to accept create without craftId for now, but the UI no longer offers that path).

## Files to modify

- `app/src/pages/LogTripPage.tsx`:
  - Drop the `craftType`/`craftSize`/`craftName` state and the `<CraftDetailsFieldset>` render.
  - Move `crewSize` into its own input next to Duration.
  - On craft pick, set `craftId` (no longer also writing back to the now-removed inline fields).
  - Validation: block submit unless `craftId` is set.
  - Hydration on edit: read `l.craftId` (drop the legacy hydration of craftType/Size/Name from the log row).

## Files to delete

- `app/src/components/CraftDetailsFieldset.tsx` — no longer referenced after this slice. Saved-craft creation form already lives in `<CraftInlineCreator>` (inside `<CraftPicker>` and on `/logs/crafts`).

## Out of scope

- Visual changes to `<RiverLogCard>` — still displays via denormalized columns.
- Backend changes — `RiverLog.post` still accepts a payload without `craftId` (used by curl + legacy callers). The UI just no longer exposes that path.
- Migrating existing logs that have denormalized strings but no `craftId` — they keep their denorm strings; on edit, user must pick a craft to save changes. No automated backfill.

## Risks / edge cases

- **Legacy logs.** A pre-12e log has denorm'd strings but no `craftId`. Edit-form picker is empty. User can't save without picking. Acceptable for first ship — there are very few such logs.
- **Archived craft.** If a log references a craft that's since been archived, the picker still shows it (the existing `<CraftPicker>` handles selected-but-not-in-active-list correctly).
- **Crew size validation.** It was free-form before; keep as `number | ''` with min 1, max 50.

## Verification

1. `npm test` — green.
2. `npm run dev` + `npm run ui:dev`. `/log/new?sectionId=...`:
   - User with at least one saved craft: only `// SAVED CRAFT` section is shown, with the default craft pre-selected. No `// CRAFT` fieldset below it. Crew size sits next to Duration.
   - User with no saved crafts: empty-state card with `+ New craft` is the only craft section. Clicking it opens the inline creator (existing component).
3. Try submitting without picking a craft → inline error blocks submit.
4. Open an existing log with a saved craft → picker shows it pre-selected; crew size is still editable.
5. Mobile 320px — picker + crew + duration stack legibly.

## Critical references

- 12e saved-crafts: [completed/12e-saved-crafts/](../../completed/12e-saved-crafts/)
- Picker (kept): [app/src/components/CraftPicker.tsx](../../../app/src/components/CraftPicker.tsx)
- Inline creator (kept): [app/src/components/CraftInlineCreator.tsx](../../../app/src/components/CraftInlineCreator.tsx)
- Form to simplify: [app/src/pages/LogTripPage.tsx](../../../app/src/pages/LogTripPage.tsx)
- Card (unchanged): [app/src/components/RiverLogCard.tsx](../../../app/src/components/RiverLogCard.tsx)
