# Status — 12e saved-crafts

## 2026-05-18
- Promoted from queued → active after slice 12b shipped same day. 12d (email-auth) follows.

### Phase 1 complete — schema + pure helpers
- Created [schemas/user-craft.graphql](../../../schemas/user-craft.graphql): `UserCraft` table with `id` (composite of `userId_createdAtMillis`), `userId @indexed`, `name`, `craftType @indexed`, `craftSize`, `notes`, `isDefault @indexed`, `archivedAt @indexed` (soft-delete), `createdAt`/`updatedAt`.
- Extended [schemas/river-log.graphql](../../../schemas/river-log.graphql) with `craftId: ID @indexed` (nullable; the denormalized `craftType`/`craftSize`/`craftName` strings on the log row remain authoritative for display).
- Created [lib/log/user-craft-pure.ts](../../../lib/log/user-craft-pure.ts): `validateCraftType`, `validateCraftName`, `pickUserCraftWritable`, `applyDefaultPromotion`, `pickReplacementDefault`, `denormalizeCraftToLog`, `VALID_CRAFT_TYPES`, `USER_CRAFT_WRITABLE_FIELDS`.
- 19 new tests in [test/user-craft-pure.test.ts](../../../test/user-craft-pure.test.ts) → `npm test`: **122 / 122 green**.

### Phase 2 complete — resource + write extension
- Created [resources/UserCraft.ts](../../../resources/UserCraft.ts) → `class UserCraftResource` at `/UserCraftResource/`:
  - `GET /` lists own active crafts (defaults first, then by `updatedAt` desc). `?includeArchived=true` includes soft-deleted rows.
  - `GET /{id}` cross-user check returns 403.
  - `POST /` validates name + type, auto-marks `isDefault=true` if it's the user's first active craft, runs `applyDefaultPromotion` to atomically unset any prior default.
  - `PATCH /{id}` ownership check, same default-promotion logic when `isDefault: true`.
  - `DELETE /{id}` soft-delete (sets `archivedAt`), promotes the next-most-recent active craft to default if the archived one held that flag (`pickReplacementDefault`).
- Extended [lib/log/river-log-pure.ts](../../../lib/log/river-log-pure.ts): `craftId` added to `WRITABLE_FIELDS` and to `BuildLogInput`; `buildNewLogRow` writes the new `craftId` column.
- Extended [resources/RiverLog.ts](../../../resources/RiverLog.ts): `resolveCraftForUser` looks up `tables.UserCraft.get(craftId)`, returns 403 if the craft belongs to another user. On POST + PATCH the resolved craft's `name`/`craftType`/`craftSize` are denormalized onto the log row at write time. PATCH also re-denormalizes when `craftId` changes, and clears craftId cleanly when set to null.
- [vite.config.ts](../../../vite.config.ts) proxy whitelist: `/UserCraftResource`, `/UserCraft`.
- `npm test` still **122 / 122 green**. Smoke test: `GET /UserCraftResource/` returns 401 unauth.

### Phase 3 complete — frontend types + api + hook
- [app/src/types.ts](../../../app/src/types.ts): `UserCraftEntry`, `UserCraftInput`, `MyCraftsResponse`; added `craftId` to `RiverLogEntry` + `RiverLogInput`.
- [app/src/api.ts](../../../app/src/api.ts): `myCrafts()`, `createCraft()`, `updateCraft()`, `archiveCraft()` (DELETE).
- [app/src/hooks/useCrafts.ts](../../../app/src/hooks/useCrafts.ts): `useMyCrafts()` query + `useCraftMutations()` (create / update / archive / setDefault) with shared `['myCrafts']` invalidation.

### Phase 4 complete — picker + inline creator + LogTripPage wiring
- [app/src/components/CraftPicker.tsx](../../../app/src/components/CraftPicker.tsx): collapsed default state showing the selected craft (name + type + size + `default` chip when applicable). Dropdown lists the user's other active crafts with star-marker for default, `+ New craft` action at the bottom, and a "Clear selection (type in inline fields)" escape hatch. Empty-state card for users with zero saved crafts goes straight to `+ New craft`.
- [app/src/components/CraftInlineCreator.tsx](../../../app/src/components/CraftInlineCreator.tsx): river-tinted card embedded inside the log form. Name / segmented type / size / notes. Save persists via `useCraftMutations().create` then bubbles up the new craft via `onCreated`. Stops event propagation so nested change/click events don't dirty the parent form or trigger its submit.
- [app/src/pages/LogTripPage.tsx](../../../app/src/pages/LogTripPage.tsx): now stores `craftId` state. `CraftPicker` renders above `CraftDetailsFieldset`. Picking a saved craft populates the inline fields. Hand-editing any inline field clears `craftId` (so the typed values aren't re-overwritten on next picker change). On a new log with no edit and the user has a default craft saved, the form auto-populates from the default. POST/PATCH payload includes `craftId`.

### Phase 5 complete — CraftsPage + nav links
- [app/src/pages/CraftsPage.tsx](../../../app/src/pages/CraftsPage.tsx): full management page at `/logs/crafts`. Shows active crafts as rows with default chip + edit / make-default / archive controls. Edit mode swaps the row to an inline editor (same form shape as create). Archived section listed below in dashed style with the date.
- [app/src/App.tsx](../../../app/src/App.tsx): `/logs/crafts` route registered as a lazy import.
- [app/src/pages/ProfileSetupPage.tsx](../../../app/src/pages/ProfileSetupPage.tsx): new `// CRAFTS` block below the form with a `Manage your crafts →` link.
- [app/src/pages/MyLogsPage.tsx](../../../app/src/pages/MyLogsPage.tsx): `Crafts ›` chip in the top-right of the page header next to the title.

### Phase 6 complete — verification
- `npm test`: **122 / 122 green** (19 new craft tests + 103 prior).
- `npx vite build`: **green** in 141 ms.
- Live smoke test on `/UserCraftResource/`: 401 unauth (correct gating).
- Browser walkthrough (dev-bypass):
  - `/log/new?sectionId=arkansas-browns-canyon`: new `// SAVED CRAFT` section appears above the inline `// CRAFT` fieldset. Empty-state shows "No saved crafts yet. Save one to reuse it on every log." + `+ New craft` button.
  - Clicking `+ New craft` expands the `// NEW CRAFT` inline form (name, type segmented, size, notes) inside the same page — no modal, no navigation.
  - `/logs/crafts`: empty-state with `+ Add a craft` primary button + `← Back to /logs` link. AppHeader Logs nav highlighted.
  - All chrome renders cleanly at 1280×900 desktop.

### Slice 12e closed — 2026-05-18
- Status: **done**. Moved to `.plans/completed/12e-saved-crafts/`.
- ROADMAP advanced: 12e → done, **12d (email-auth)** promoted to active.
