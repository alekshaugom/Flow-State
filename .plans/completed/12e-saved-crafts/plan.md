---
slice: 12e-saved-crafts
status: done
value: 7
confidence: 8
effort: S
depends_on: [12-river-log-core]
unlocks: []
opened: 2026-05-18
closed: 2026-05-18
---

# Slice 12e — Saved crafts

## Goal

Let a user save the boats they boat with — once — and pick from that list when logging a trip. Most boaters paddle the same craft for years; re-typing `"14 ft / Slipper Pickle / oar-raft"` on every log is friction that compounds with each entry.

Crafts live in a small dedicated panel under `/logs/crafts` (and linkable from `/profile`). On the log form, a craft picker sits above the existing inline fields. Default behavior on a new log: prefill from the user's default craft. Selecting a different saved craft re-fills the inline values. A `+ New craft` chip in the picker opens an inline create form that saves a new craft **and** populates the current log — keeping the flow strictly linear for first-time and repeat users alike.

## Acceptance criteria

1. **CRUD ownership.** Authenticated user can create, list, edit, and archive their own crafts. Cross-user reads/writes return 403.
2. **Default craft.** Exactly one craft can be marked default per user. Marking another as default automatically unmarks the previous (atomic at the resource layer).
3. **Picker on log form.** `/log/new` (and `/log/:id/edit`) shows a `<CraftPicker>` above the existing `<CraftDetailsFieldset>`. Picker shows: default craft pre-selected, list of other saved crafts, `+ New craft` action.
4. **Inline-fill.** Selecting a saved craft populates `craftType`, `craftSize`, `craftName` in the log form. User can then override any field — saved craft is a starting point, not a lock.
5. **Inline create.** `+ New craft` opens an inline create form within the page (no modal, no navigation). Saving stores the new craft *and* fills the current log. Cancel discards.
6. **Linkage on log.** `RiverLog` gets a nullable `craftId` column. On write, the resource resolves the craft and **denormalizes** `craftType`/`craftSize`/`craftName` onto the log row. Historical accuracy: even if a craft is later edited or archived, the log row keeps the values from the day of the trip.
7. **Crafts management page.** `/logs/crafts` (with `Crafts` link visible inside the `/logs` page chrome and from `/profile`). Lists user's crafts with edit / set-default / archive controls. Archived crafts don't appear in pickers but stay in the DB.
8. **Profile link.** `/profile` page surfaces a `Manage your crafts →` link to `/logs/crafts`.
9. **Backward compat.** Existing logs from slice 12 with no `craftId` continue to render their denormalized strings exactly as before.
10. **Tests cover:** craft CRUD + ownership, default-craft promotion (only one default per user), archive-then-historical-log-still-displays, log write with craftId resolves denorm fields, log write without craftId keeps the inline values.

## Schema additions

### `schemas/user-craft.graphql` (new file)

```graphql
type UserCraft @table @export {
  id: ID @primaryKey                     # = compositeId([userId, createdAtMillis])
  userId: ID @indexed
  user: WaitlistUser @relationship(from: "userId")
  name: String                           # "Slipper Pickle"
  craftType: String @indexed             # "raft" | "paddle-raft" | "kayak" (matches CraftSkillControl)
  craftSize: String                      # "14 ft" | "Pyranha 9R"
  notes: String                          # free text, e.g. "stiffer floor, 18ft rowing frame"
  isDefault: Boolean @indexed
  archivedAt: String @indexed            # null = active
  createdAt: String @indexed
  updatedAt: String
}
```

### `schemas/river-log.graphql` (extend)

Add a single nullable field to the existing `RiverLog` type:

```graphql
craftId: ID @indexed                     # nullable; references UserCraft.id at write time. Denorm'd strings (craftType/Size/Name) are authoritative for display.
```

No migration needed — new field is nullable and pre-existing logs keep their inline craft strings.

## Files to create

### Backend

- `resources/UserCraft.ts` — class `UserCraftResource`.
  - `GET /UserCraftResource/` — list own active crafts (omit archived unless `?includeArchived=true`).
  - `GET /UserCraftResource/{id}` — own-craft only; 403 cross-user.
  - `POST /UserCraftResource/` — create. Validates `craftType` against CraftSkillControl enum. If `isDefault: true`, atomically unmark any other default.
  - `PATCH /UserCraftResource/{id}` — update. Same default-promotion semantics.
  - `DELETE /UserCraftResource/{id}` — soft delete (set `archivedAt`). Historical logs unaffected.
- `lib/log/user-craft-pure.ts` — pure helpers:
  - `validateCraftType(t: string): boolean` — matches CraftSkillControl enum.
  - `pickUserCraftWritable(data): partial` — whitelist.
  - `applyDefaultPromotion(allCrafts, newDefault): { toUnset: string[] }` — pure logic for which other crafts need `isDefault=false`.
- Modify `resources/RiverLog.ts` and `lib/log/river-log-pure.ts`:
  - Accept `craftId` in `POST` / `PATCH` body.
  - On write with `craftId`, look up `tables.UserCraft.get(craftId)`, verify `userId === currentUser.id` (403 if not), copy `craftType` / `craftSize` / `craftName` (use UserCraft.name) onto the log row.
  - On write without `craftId`, use the inline values exactly like today.
  - Add `craftId` to `WRITABLE_FIELDS` (or a sibling whitelist).

### Frontend

- `app/src/pages/CraftsPage.tsx` — `/logs/crafts`. Renders list + add-new-craft form. Mirrors `ProfileSetupPage` style.
- `app/src/components/CraftPicker.tsx` — dropdown-style picker. Shows default craft selected, expands to list, includes `+ New craft` row that opens inline creator.
- `app/src/components/CraftInlineCreator.tsx` — inline form: name, type (segmented control matching CraftSkillControl), size, notes, `Save craft` / `Cancel`. Calls `createCraft` then `onCreated(newCraft)`.
- `app/src/hooks/useCrafts.ts` — `useMyCrafts()` (list) + `useCraftMutations()` (create / update / archive / promote-default).

### Tests

- `test/user-craft-resource.test.ts` — CRUD + ownership scoping (using pure helpers and validators).
- `test/user-craft-default-promotion.test.ts` — pure `applyDefaultPromotion` cases.
- `test/river-log-craft-denormalization.test.ts` — write with craftId copies fields; write without craftId preserves inline values; archived craft still readable on existing log.

## Files to modify

- `schemas/river-log.graphql` — add `craftId: ID`.
- `resources/RiverLog.ts` — accept and denormalize `craftId`. Verify cross-user 403 if the craft doesn't belong to the writer.
- `lib/log/river-log-pure.ts` — extend `WRITABLE_FIELDS` and `buildNewLogRow` signature.
- `app/src/components/CraftDetailsFieldset.tsx` — accept an optional `prefilledFromCraft` flag for subtle styling ("auto-filled from Slipper Pickle"), but the field stays editable.
- `app/src/pages/LogTripPage.tsx` — wire `<CraftPicker>` above the fieldset. Hydration logic: when picker fires `onChange(craft)`, set craftId state + populate craftType/Size/Name from the selected craft.
- `app/src/pages/ProfileSetupPage.tsx` — add a `Manage your crafts →` link to `/logs/crafts`.
- `app/src/pages/MyLogsPage.tsx` (created in 12b) — surface a `Crafts ›` link in the page chrome.
- `app/src/api.ts` — `myCrafts()`, `createCraft(...)`, `updateCraft(id, ...)`, `archiveCraft(id)`, `setDefaultCraft(id)`.
- `app/src/types.ts` — `UserCraft`, `UserCraftInput`.
- `app/src/App.tsx` — register `/logs/crafts`. Gate behind `useAuth()`.
- `vite.config.ts` — proxy `/UserCraftResource`, plus auto-generated `/UserCraft`.

## Out of scope (defer)

- Sharing crafts between users
- Per-craft photo
- Per-craft skill or comfort level (might be slice 13)
- Trip count per craft surface (count this from RiverLog.craftId on demand — defer to slice 13)
- Default-craft auto-inference from recent log usage
- Bulk import / export

## Risks / edge cases

- **Inline-create flow.** The form must save the craft *and* keep the log form populated, all without navigation. If the create fails, the log form preserves whatever the user had typed. Use a local form state in `<CraftInlineCreator>` that bubbles up on success only.
- **Denormalization drift.** If a user renames a craft after a log is written, the log keeps the old name. This is **intentional** — historical accuracy. Document in the resource code.
- **Archived craft selected.** If a user opens an old log whose `craftId` references an archived craft, the picker should resolve and display the archived craft greyed out, not throw. The form still works; the denorm fields remain editable.
- **Default-promotion race.** Two simultaneous writes both setting `isDefault: true` → second one wins, both unmark the prior default. Acceptable; do not over-engineer.
- **L004 / L005.** Static `tables` import. No module-level cache (per-user data). Resource named `UserCraftResource`, schema named `UserCraft` — no collision.

## Verification

1. `npm test` — green including new craft tests.
2. `npm run dev` + `npm run ui:dev`. Log in (real OAuth, or email after 12d ships).
3. Open `/logs/crafts` — empty state. Create three crafts: "Slipper Pickle" (raft, 14 ft, default), "Pirate Ship" (paddle-raft, 16 ft), "Pyranha 9R" (kayak, 9 ft).
4. Open `/log/new?sectionId=arkansas-browns-canyon`. CraftPicker shows "Slipper Pickle" pre-selected; inline fields auto-filled.
5. Switch picker to "Pyranha 9R" — inline fields update to kayak / 9 ft / Pyranha 9R.
6. Submit. Open the new log on `/section/arkansas-browns-canyon` — card shows kayak chip + Pyranha 9R footer.
7. Back to `/logs/crafts`, rename "Pyranha 9R" to "Pyranha 9R+". Re-open the log — card still shows "Pyranha 9R" (denorm'd at write time, historical accuracy holds).
8. On `/log/new` again, click `+ New craft` → inline form opens, fill in "Sea Eagle 380x" / kayak / 12 ft, Save. The new craft saves and the log form populates from it without leaving `/log/new`.
9. Archive "Pirate Ship". It disappears from the picker. Open an old log that referenced it — card still shows "Pirate Ship" correctly.
10. Mobile 320×568 — picker dropdown, inline creator, and management page all render cleanly.

## Critical references

- Craft taxonomy: [app/src/lib/craftTypes.ts](../../../app/src/lib/craftTypes.ts) — `CraftType`, `CRAFTS` enum
- Existing inline fieldset: [app/src/components/CraftDetailsFieldset.tsx](../../../app/src/components/CraftDetailsFieldset.tsx) — keep editable, just gain a "prefilled from" cue
- Slice 12 patterns to mirror: [resources/UserProfile.ts](../../../resources/UserProfile.ts) (own-user CRUD), [lib/log/river-log-pure.ts](../../../lib/log/river-log-pure.ts) (writable-field whitelist)
- Log form: [app/src/pages/LogTripPage.tsx](../../../app/src/pages/LogTripPage.tsx) — hydration logic to extend
- Composite ID helper: [lib/utils.ts](../../../lib/utils.ts)
- L004 + L005: as in 12 / 12b / 12d.
