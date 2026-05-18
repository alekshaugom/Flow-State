---
slice: 12-river-log-core
status: queued
value: 9
confidence: 8
effort: M
depends_on: [02b-watershed-corridor-refinements]
unlocks: [12b-river-log-watershed-browse, 12c-river-log-sharing]
opened: 2026-05-17
closed: null
---

# Slice 12 — River log: core

## Goal

Approved logged-in users can log a completed river trip in under 60 seconds, see their past trips surfaced on each section's detail page, and have home-page cards subtly indicate which sections they've been on. A basic user profile (skill, background) shows in their log cards. All logs are private to the user — no sharing in this slice.

This slice opens Flow-State's **second axis**: forecasts look forward, logs look backward, and past trips inform future trips. It walks back the existing "Not social" line in [product-vision.md](../../vision/product-vision.md) — bounded social only (private logs in 12 + invite-only friend sharing in 12c), never fully public. The app becomes bipolar by design.

## Acceptance criteria

1. Approved logged-in users can submit `/log/new?sectionId=arkansas-browns-canyon` in under 60 seconds and see the entry appear on the section detail page on next load.
2. Form auto-populates: `craftType` from `CraftSkillControl` context, `date` to today, `putIn`/`takeOut` from section defaults.
3. `flowAtTripCfs` is resolved from `DailyGaugeRollup` on write when available; otherwise stored null and retried up to 7 days post-trip on read.
4. `/section/:id` page shows the user's most recent 3 trips for that section in a `<PastTripsStrip>` below the context/drivers row.
5. `/section/:id/logs` shows all of the user's trips for that section, newest-first.
6. Home page section cards show a `// N TRIPS` corner badge when count > 0. **No other visual change** to cards — corner badge only, per user direction.
7. `/profile` lets the user set skill level / years boating / background / home watershed. UserProfile data appears in log card footer (e.g. "Former raft guide · guide · 10 yrs").
8. All log mutations are server-enforced to `userId = currentUser.id`. Cross-user PATCH/DELETE returns 403. Test coverage on this.
9. Logs default to `visibility: "private"`. Other values rejected at the resource layer.
10. Anonymous users see no log UI — the `+ Log a trip` affordance is gated behind `useAuth()`.
11. `npm test` — new tests cover: CRUD ownership scoping, flow resolution against rollup (with and without rollup hit), profile upsert, watershed/corridor denormalization on write.

## Schema additions

### `schemas/river-log.graphql` (new file)

```graphql
type RiverLog @table @export {
  id: ID @primaryKey                     # = compositeId([userId, sectionId, date, createdAtMillis])
  userId: ID @indexed
  user: WaitlistUser @relationship(from: "userId")
  sectionId: ID @indexed
  section: RiverSection @relationship(from: "sectionId")
  watershedId: ID @indexed               # denormalized from section.corridor.watershedId at write
  corridorId: ID @indexed                # denormalized at write

  date: String @indexed                  # YYYY-MM-DD, trip date
  craftType: String                      # "oar-raft" | "paddle-raft" | "kayak-sup" (matches CraftSkillControl)
  craftSize: String                      # free text — "14 ft", "Pyranha 9R"
  craftName: String                      # free text optional — "Slipper Pickle"
  crewSize: Int
  durationHours: Float
  putIn: String                          # defaults to section.putIn, editable
  takeOut: String                        # defaults to section.takeOut, editable
  notes: String                          # long-form journal entry
  conditionsTags: String                 # JSON array — ["tons-of-rock", "frequent-highsides", ...]

  flowAtTripCfs: Float                   # resolved from DailyGaugeRollup at write or first read
  flowSourceGaugeId: ID
  flowResolvedAt: String                 # null until resolved; retries up to 7 days post-trip on read

  visibility: String @indexed            # "private" only in slice 12 (12c extends)
  createdAt: String @indexed
  updatedAt: String
}
```

### `schemas/user-profile.graphql` (new file)

One row per user max — profile is singular.

```graphql
type UserProfile @table @export {
  id: ID @primaryKey                     # = userId
  userId: ID @indexed
  user: WaitlistUser @relationship(from: "userId")
  skillLevel: String                     # "novice" | "intermediate" | "advanced" | "expert" | "guide"
  yearsBoating: Int                      # optional
  background: String                     # free text, ~120 chars — "Former raft guide, AW Class V"
  homeWatershedId: ID                    # optional FK — sets default watershed for /logs view in 12b
  preExistingTripCountsJson: String      # JSON map { sectionId: int } — self-reported pre-app history
  createdAt: String
  updatedAt: String
}
```

### Schema notes

- Denormalize `watershedId` + `corridorId` on the log row. Avoids join walks on watershed-browse queries (slice 12b) and home-card per-section counts. Section.corridor.watershed lookup happens once at write time, never again.
- `craftType` mirrors `CraftSkillControl` enum exactly. Auto-populate from current selection so the boater doesn't double-pick.
- `conditionsTags` is JSON-stored string for write-flex; surfaced as chip multi-select with a curated suggestion set (`tons-of-rock`, `frequent-highsides`, `precision-oar-required`, `advanced-maneuvers`, `mellow-float`, `cold-water`, `crowded`, `pristine`, `wind`, `swam`) but accepts arbitrary user-added strings.
- `flowAtTripCfs` resolution is lazy: on write, attempt resolve from `DailyGaugeRollup(section.primaryGaugeId, trip.date)`; if null, retry up to 7 days post-trip on read. This handles the case where the rollup nightly job hasn't caught up yet (slice 03b dependency — must ship first).
- `preExistingTripCountsJson` on UserProfile captures the "200 trips down this river before the app existed" claim without retroactively fabricating log rows. Surfaces in the log card footer as `+ 200 prior trips`.
- Single `visibility` column. Only `"private"` accepted on write this slice; rejected otherwise. 12c extends the allowed values.

## Files to create

### Resources

- `resources/RiverLog.ts` — class `RiverLogResource` (not bare `RiverLog`, per L005). Exposes:
  - `GET /RiverLog/` — auth-scoped: returns only the current user's logs
  - `GET /RiverLog/{id}` — 403 if not your own
  - `POST /RiverLog/` — server sets `userId = currentUser.id`; resolves `watershedId`, `corridorId` from `tables.RiverSection.get(sectionId)`; resolves `flowAtTripCfs` via `lib/log/flow-resolver.ts`; rejects `visibility !== "private"`
  - `PATCH /RiverLog/{id}` — server enforces ownership before write
  - `DELETE /RiverLog/{id}` — server enforces ownership
- `resources/UserProfile.ts` — class `UserProfileResource`. `GET /UserProfile/{userId}` and `PUT /UserProfile/{userId}` — both own-user only.
- `resources/SectionLogs.ts` — class `SectionLogsView`. `GET /SectionLogs/{sectionId}` returns current user's logs for one section, newest-first. Joins author's `UserProfile` once for display.
- `lib/log/flow-resolver.ts` — `resolveFlowForTrip(sectionId, date) → { cfs, gaugeId } | null`. Used by RiverLog write and SectionLogs read for retry on null.

### Frontend pages

- `app/src/pages/LogTripPage.tsx` — `/log/new?sectionId=...&date=...` route. Full-page form (no modals per `ux-direction.md`).
- `app/src/pages/EditLogPage.tsx` — `/log/:id/edit` — same form, prefilled.
- `app/src/pages/SectionLogsPage.tsx` — `/section/:id/logs` — vertical stack of `RiverLogCard`s for one section.
- `app/src/pages/ProfileSetupPage.tsx` — `/profile` — form for skill / years / background / home watershed.

### Frontend components

- `app/src/components/RiverLogCard.tsx` — cornerstone visual. Mirrors `RiverCard.tsx` proportions. Eyebrow `// LOGGED · YYYY-MM-DD`. Body: craft chip + crew + duration line, flow-at-trip chip (`ran at 396 cfs · runnable`), conditions tag chips, notes preview (3-line clamp, click-to-expand inline). Edit/delete icons in card corner. Footer (when profile present): `<author background> · <skill level> · +<preExistingCount> prior trips`.
- `app/src/components/PastTripsStrip.tsx` — section-detail strip. Eyebrow `// PAST TRIPS · N LOGGED` + up to 3 stacked log cards + "See all N trips" link to `/section/:id/logs`. If 0 logs: quiet `// LOG YOUR FIRST TRIP` CTA chip.
- `app/src/components/HomeCardLoggedBadge.tsx` — corner-of-card mono label, `// N TRIPS` in `--ink-3`, top-right. **Corner badge only — no other visual change to the card.**
- `app/src/components/ConditionsTagChips.tsx` — chip multi-select with curated suggestions + free-form add.
- `app/src/components/CraftDetailsFieldset.tsx` — grouped inputs: craft type segmented (mirrors `CraftSkillControl`), craft size text, craft name text, crew size number.

### Frontend hooks (`app/src/hooks/`)

- `useMyLogs.ts`, `useSectionLogs.ts`, `useLogMutations.ts`, `useProfile.ts` — react-query wrappers matching the existing pattern (see `useDashboard.ts`).

### Tests

- `test/river-log-resource.test.js` — CRUD + ownership scoping (403 across users)
- `test/river-log-flow-resolver.test.js` — rollup hit / miss / lazy retry
- `test/user-profile-resource.test.js` — upsert + own-only scoping
- `test/river-log-denormalization.test.js` — watershed/corridor copy-on-write
- `test/river-log-visibility-guard.test.js` — rejects non-private visibility writes this slice

## Files to modify

### Resources

- `resources/RiverDetail.ts` — append `myLogs: RiverLogEntry[]` (capped at 3, newest first) and `myLogTotalCount: number` to the response by inlining `SectionLogs` logic. Drives `<PastTripsStrip>`.
- `resources/Dashboard.ts` — for each section in the response, attach `myTripCount: number` and `lastLoggedAt: string | null` (current-user-scoped). Drives the home-card corner badge.
- `resources/Me.ts` — append `profile: UserProfile | null` to the response so frontend can decide whether to prompt for profile setup.

### Frontend

- `app/src/App.tsx` — register: `/log/new`, `/log/:id/edit`, `/section/:id/logs`, `/profile`. Gate behind `useAuth()` — redirect anonymous users to `/login`.
- `app/src/desktop/DesktopDetail.tsx` + `app/src/mobile/MobileDetail.tsx` — insert `<PastTripsStrip>` below the context/drivers row, above the flow chart. Add `+ Log a trip` chip in the hero stat row (auth-gated).
- `app/src/mobile/RiverCard.tsx` + `app/src/components/SectionRow.tsx` — read `myTripCount` from props; conditionally render `<HomeCardLoggedBadge>` in the corner.
- `app/src/desktop/DesktopShell.tsx` — add a `+ Log` chip in the top-right user-menu strip when authenticated.
- `app/src/api.ts` — type defs: `RiverLogEntry`, `RiverLogInput`, `UserProfileEntry`, mutation payloads.
- `app/src/types.ts` — same.
- `app/src/lib/transform.ts` — surface `myTripCount` / `lastLoggedAt` through to section card props.

## Vision doc edits (land with this slice)

- `.plans/vision/product-vision.md`:
  - Replace the "Not social" bullet (line 36) with: *"Bounded social: private logs with friend-only sharing — no public discovery, comments, or feed."*
  - Add a new "Past trips: the second axis" section near the top describing the bipolar product model.
- `.plans/vision/ux-direction.md`:
  - Add `/log/new`, `/section/:slug/logs`, `/profile` rows to the "Information hierarchy per route" table.
  - Add `RiverLogCard`, `HomeCardLoggedBadge`, conditions tag chips to "New visual primitives."

## Out of scope (deferred)

- `/logs` watershed-grouped browse view → **slice 12b**
- Search / filter across own logs → **slice 12b**
- Any sharing UI / mechanics → **slice 12c**
- Photos on logs → defer to slice 13+
- Admin moderation of logs → slice 10 territory (not in slice 12)
- Comment / like / reply primitives → never (per vision boundary)
- Meal planning, pre-trip checklists, packing lists → "not ready yet" per user direction

## Risks / edge cases

- **Flow-at-trip null at write.** Common when a log is created on the day of the trip and `DailyGaugeRollup` hasn't run yet. The resolver retries on read up to 7 days; after that, leaves it null and the card shows `ran at — cfs`. Document this in the form's helper text.
- **DailyGaugeRollup dependency.** Slice 12 ships *after* 03b so the rollup table exists. If 03b slips, slice 12 can still ship — the field is nullable from day one and the form / cards handle null gracefully.
- **L004 (Harper static-import + empty-scan caching).** All three new resources use `import { tables } from 'harper'` statically. None cache empty result sets. Add a regression test that restarts Harper between writes and reads.
- **L005 (Resource class name collisions).** Resources named `RiverLogResource`, `UserProfileResource`, `SectionLogsView` — never bare `RiverLog`. Verify with `grep "@export" schemas/` for collisions before merge.
- **Composite ID stability.** `compositeId([userId, sectionId, date, createdAtMillis])` includes millis to allow multiple logs per section per date (e.g. morning + afternoon runs).
- **Form abandonment.** User starts a log, navigates away. No autosave this slice — accepted tradeoff. Add a `confirm` prompt on navigate-away if form is dirty.
- **Mobile 320px width.** Form has 8+ inputs; validate fieldsets stack cleanly at the smallest target.

## Verification

1. `npm test` — full suite green including new tests.
2. `npm run dev` (Harper, port 9926) + `npm run ui:dev` (Vite, port 5173).
3. Log in as an approved waitlist user. Fill profile at `/profile` (skill=guide, background="Former raft guide", years=10, home=Arkansas).
4. Hit `/log/new?sectionId=arkansas-browns-canyon`. Use the canonical example: 14ft oar boat / Slipper Pickle / 2026-05-16 / 5+guide / 3.5h / conditions: tons-of-rock + frequent-highsides + precision-oar-required + advanced-maneuvers / notes: free text.
5. Submit. Confirm redirect to `/section/arkansas-browns-canyon`. New trip appears in `<PastTripsStrip>` as the top card, with footer showing "Former raft guide · guide · 10 yrs."
6. Navigate to `/`. Browns Canyon card shows `// 1 TRIP` corner badge. No other visual change.
7. Open `/section/arkansas-browns-canyon/logs`. Same card appears in vertical list.
8. Edit the log via the edit icon. Confirm changes round-trip.
9. Open the same `/section/...` page in an incognito session (anonymous). No PastTripsStrip. No `+ Log a trip` chip. No badge on home card.
10. Log in as a different approved user. Their `/section/arkansas-browns-canyon` shows zero past trips — they don't see user A's logs.
11. Resize to 320×568 mobile. Form, log card, home card badge, past-trips strip all render cleanly. No overflow.
12. Stop Harper; restart; reload the section page. Past trips still render (L004 guard — no cached empty-scan after restart).

## Critical references

- Auth foundation: [schemas/auth.graphql](../../../schemas/auth.graphql) — WaitlistUser table; users gated by status
- Current-user endpoint: [resources/Me.ts](../../../resources/Me.ts) — returns currentUser
- Section/Watershed/Corridor schemas: [schemas/river.graphql](../../../schemas/river.graphql), [schemas/corridor.graphql](../../../schemas/corridor.graphql), [schemas/watershed.graphql](../../../schemas/watershed.graphql)
- Craft taxonomy to reuse: [app/src/desktop/DesktopShell.tsx](../../../app/src/desktop/DesktopShell.tsx) — `CraftSkillControl` segments oar-raft / paddle-raft / kayak-sup
- Existing card visual to mirror: [app/src/mobile/RiverCard.tsx](../../../app/src/mobile/RiverCard.tsx)
- Existing compact row: [app/src/components/SectionRow.tsx](../../../app/src/components/SectionRow.tsx)
- Section detail backend to extend: [resources/RiverDetail.ts](../../../resources/RiverDetail.ts)
- Dashboard backend to extend: [resources/Dashboard.ts](../../../resources/Dashboard.ts)
- Daily rollup dependency (must ship first): slice [03b](../03b-forecast-snapshot-infra/plan.md) — `DailyGaugeRollup` table
- Vision to amend: [vision/product-vision.md](../../vision/product-vision.md) "Not social" line + new "Past trips: second axis" section; [vision/ux-direction.md](../../vision/ux-direction.md) route hierarchy + new primitives
- Composite ID helper: [lib/utils.ts](../../../lib/utils.ts) — `compositeId()`
- Lesson L004: [L004-harper-static-import-and-search-after-restart.md](../../lessons/L004-harper-static-import-and-search-after-restart.md) — static-import + empty-scan caching
- Lesson L005: [L005-harper-resource-class-name-collisions.md](../../lessons/L005-harper-resource-class-name-collisions.md) — rename to *Resource / *View
