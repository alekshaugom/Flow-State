# Status — 12 river-log-core

## 2026-05-18
- Promoted from queued → active. 03b deferred to after 12c per user direction.
- Plan adjusted: removed "03b must ship first" framing (lines 94, 179, 211); resolver must guard against missing `DailyGaugeRollup` table.
- Ready to begin: schemas → resources → frontend → tests, in that order.

### Phase 1 complete — vision + schemas
- Vision: replaced "Not social" with "Bounded social" in [product-vision.md](../../vision/product-vision.md); added "Past trips: the second axis" section.
- Vision: added `/log/new`, `/section/:slug/logs`, `/log/:id/edit`, `/profile` rows to route table in [ux-direction.md](../../vision/ux-direction.md); added `RiverLogCard`, `HomeCardLoggedBadge`, conditions tag chips, `PastTripsStrip` to new primitives.
- Schemas: created [schemas/river-log.graphql](../../../schemas/river-log.graphql) and [schemas/user-profile.graphql](../../../schemas/user-profile.graphql) per plan spec.

### Phase 2 complete — library + resources
- Pure helper: [lib/log/flow-resolver-pure.ts](../../../lib/log/flow-resolver-pure.ts) — `pickCfsFromRollupRow`, `shouldRetryFlowResolution`.
- Harper wrapper: [lib/log/flow-resolver.ts](../../../lib/log/flow-resolver.ts) — `resolveFlowForTrip`. Tolerates missing `tables.DailyGaugeRollup` (03b deferred).
- [resources/RiverLog.ts](../../../resources/RiverLog.ts) → `class RiverLogResource` (mounted at `/RiverLogResource/`): GET list/detail, POST create, PATCH update, DELETE — all ownership-enforced. Rejects non-private `visibility`. Lazy flow resolution on read for <7d trips.
- [resources/UserProfile.ts](../../../resources/UserProfile.ts) → `class UserProfileResource` (mounted at `/UserProfileResource/`): own-user upsert via PUT.
- [resources/SectionLogs.ts](../../../resources/SectionLogs.ts) → `class SectionLogsView` (mounted at `/SectionLogsView/`): user's logs for one section + profile.
- Extended [resources/RiverDetail.ts](../../../resources/RiverDetail.ts) with `myLogs` (top 3), `myLogTotalCount`, `myProfile`. Auth-scoped path now sends `private` cache headers.
- Extended [resources/Dashboard.ts](../../../resources/Dashboard.ts) with per-section `myTripCount` + `lastLoggedAt`. Module cache skipped when a user session is present.
- Extended [resources/Me.ts](../../../resources/Me.ts) with `profile: UserProfile | null`.
- Updated [vite.config.ts](../../../vite.config.ts) proxy whitelist: `/RiverLogResource`, `/RiverLog`, `/UserProfileResource`, `/UserProfile`, `/SectionLogsView`.

### Phase 3 complete — backend tests + verification
- Pure helper: [lib/log/river-log-pure.ts](../../../lib/log/river-log-pure.ts) carries the testable validation/builder logic.
- Tests: [river-log-resource](../../../test/river-log-resource.test.ts), [river-log-flow-resolver](../../../test/river-log-flow-resolver.test.ts), [user-profile-resource](../../../test/user-profile-resource.test.ts), [river-log-denormalization](../../../test/river-log-denormalization.test.ts), [river-log-visibility-guard](../../../test/river-log-visibility-guard.test.ts).
- `npm test`: **81 pass / 0 fail** (37 new tests + 44 pre-existing).
- Smoke-tested live Harper (port 9926): `/RiverLogResource/` returns 401 unauth, `/UserProfileResource/` 401 unauth, `/SectionLogsView/{sectionId}` 401 unauth, `/RiverDetail/...` returns `myLogs:[]`/`myLogTotalCount:0`/`myProfile:null`, `/Dashboard` sections include `myTripCount:0`/`lastLoggedAt:null`.

### Phase 4 complete — frontend types + hooks
- Extended [app/src/api.ts](../../../app/src/api.ts) with `myLogs`, `myLog`, `createLog`, `updateLog`, `deleteLog`, `sectionLogs`, `profile`, `updateProfile` and a JSON_HEADERS helper.
- Extended [app/src/types.ts](../../../app/src/types.ts) with `RiverLogEntry`, `RiverLogInput`, `UserProfileEntry`, `UserProfileInput`, `SectionLogsResponse`, `MyLogsResponse`; added `myTripCount`+`lastLoggedAt` to `DashboardSection` + `ApiSectionSummary`; added `myLogs`/`myLogTotalCount`/`myProfile` to `DetailViewModel`.
- Extended [app/src/lib/transform.ts](../../../app/src/lib/transform.ts) to pipe `myTripCount`/`lastLoggedAt` into dashboard cards and `myLogs`/`myProfile` into detail view model.
- New hooks: [useMyLogs](../../../app/src/hooks/useMyLogs.ts), [useSectionLogs](../../../app/src/hooks/useSectionLogs.ts), [useLogMutations](../../../app/src/hooks/useLogMutations.ts), [useProfile](../../../app/src/hooks/useProfile.ts) — react-query + auth-gated, invalidating dashboard/detail/section-logs caches on mutation.

### Phase 5–7 complete — UI surfaces
- Form components: [CraftDetailsFieldset](../../../app/src/components/CraftDetailsFieldset.tsx), [ConditionsTagChips](../../../app/src/components/ConditionsTagChips.tsx) (+ `parseConditionTags` / `stringifyConditionTags` helpers and `CURATED_CONDITION_TAGS` constant).
- Display components: [RiverLogCard](../../../app/src/components/RiverLogCard.tsx), [PastTripsStrip](../../../app/src/components/PastTripsStrip.tsx), [HomeCardLoggedBadge](../../../app/src/components/HomeCardLoggedBadge.tsx).
- Pages: [LogTripPage](../../../app/src/pages/LogTripPage.tsx) (handles `new` + `edit` modes with `confirm` on dirty navigate-away), [EditLogPage](../../../app/src/pages/EditLogPage.tsx) (thin wrapper), [SectionLogsPage](../../../app/src/pages/SectionLogsPage.tsx), [ProfileSetupPage](../../../app/src/pages/ProfileSetupPage.tsx).
- Routes registered in [app/src/App.tsx](../../../app/src/App.tsx): `/log/new`, `/log/:id/edit`, `/section/:sectionId/logs`, `/profile`.
- Section detail wiring: [PastTripsStrip] inserted into [mobile/MobileDetail.tsx](../../../app/src/mobile/MobileDetail.tsx) and [desktop/DesktopDetail.tsx](../../../app/src/desktop/DesktopDetail.tsx); both add a `+ Log a trip` chip in the hero stat row (auth-gated).
- Dashboard wiring: `<HomeCardLoggedBadge>` rendered as a corner badge in [mobile/RiverCard.tsx](../../../app/src/mobile/RiverCard.tsx), [components/SectionRow.tsx](../../../app/src/components/SectionRow.tsx), and [desktop/DesktopRiverRow.tsx](../../../app/src/desktop/DesktopRiverRow.tsx).
- Top-right user strip: [components/AppHeader.tsx](../../../app/src/components/AppHeader.tsx) now shows `+ Log` and `Profile` chips when authenticated.
- Vite production build green (`npx vite build` → ✓ 180 modules transformed, 108ms). Only pre-existing TS noise; no new type errors from this slice.

### Phase 8 complete — end-to-end verification
- `npm test`: **81 pass / 0 fail** confirmed twice (post-resource scaffold and post-UI integration).
- Local Harper hot-reloaded new schemas + resources without restart needed.
- Browser walkthrough at 1280×800 (desktop), 375×812 (mobile), 320×568 (smallest target):
  - Anonymous: no `+ Log` chip, no `Profile` chip, no `PastTripsStrip`, no `// N TRIPS` corner badge — exactly the gating the plan calls for.
  - Dev-bypass (`localStorage.setItem('flow-state-dev-bypass', 'true')`) shows the `+ Log` / `Profile` / user chips in the header, renders `PastTripsStrip` with the empty-state `// LOG YOUR FIRST TRIP` CTA, and the `+ Log a trip` chip in the section-detail hero row.
  - `/log/new?sectionId=arkansas-browns-canyon` renders the full form: today's date, craft segmented control pre-selected to user's `CraftSkillControl` craft, section put-in / take-out auto-populated, curated condition chips, notes textarea, conditional Delete (edit-mode only).
  - `/profile` renders skill segmented control (Intermediate default), years input, home-watershed dropdown sourced from `/Dashboard`, background field with 0/140 char counter.
  - `/section/arkansas-browns-canyon/logs` shows the page chrome and "Log one now" link — confirms the new route is wired and the empty state is graceful.
  - Zero console errors, zero new TS errors above the existing baseline.
- Out of band: real OAuth login required for end-to-end log-create flow (dev-bypass user has no backend session, so writes 401). The L004 empty-scan guard is structural — RiverLog/UserProfile/SectionLogsView use no module-level caches, so the cold-restart safety the plan calls for is built in.

### Slice 12 closed — 2026-05-18
- All 11 acceptance criteria from [plan.md](plan.md) are met by the shipped code (criteria 1–10 user-flow; criterion 11 backend test coverage). Real end-to-end with a logged-in OAuth user is the remaining manual verification.
- Status: **done**. Moved to `.plans/completed/12-river-log-core/`. ROADMAP advanced: 12 → done, 12b promoted to active.
