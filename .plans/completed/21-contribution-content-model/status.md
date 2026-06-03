# Slice 21 status

## 2026-06-02
- Slice opened, set `status: active`. Slice 20 closed + moved to completed/ after user confirmed the capability model in-browser.
- This slice was an intent.md; entering Plan phase to expand it into a full plan.md grounded against the current codebase (schemas/, resources/, lib/). Plan being authored by the main session.
- Next: surface the expanded plan at the Plan→Execute boundary for user confirmation before building.

## 2026-06-02 — Phase A1 (spine + AccessPoint backend)

Files added:
- `schemas/contribution.graphql` — new Contribution table (id, entityType, entityId, op, version, authorId, author relationship, submittedAt, verificationState, verifiedBy, verifiedAt, changesetJson, bountyId)
- `lib/contributions/entity-registry.ts` — ENTITY_REGISTRY with `access-point` config; FieldDescriptor + EntityConfig interfaces; getEntityConfig(); newId via compositeId(['ap', slug, timestamp])
- `lib/contributions/contribution-pure.ts` — pure: VerificationState type; slugify; validateContribution (whitelist + per-descriptor validation incl. enum, numeric range, latlng bounds, boolean coercion); buildChangeset (sparse diff); applyChangeset; nextVersion; canTransition (full state machine)
- `resources/Contribution.ts` — generic resource over entityType/registry; get (by id OR ?entityType+entityId history); post (auth→isContributor→validate→edit pending / create seeds base row); patch (isAdmin→canTransition→verify applies changeset + stamps provenance / reject/dispute state-only)
- `test/contributions-pure.test.ts` — 44 new tests covering all pure functions

Files changed:
- `schemas/access-point.graphql` — additive: +directions, +permitRequired, +feeUsd, +parkingSpaces, +lastVerifiedAt, +verifiedBy, +currentContributionId
- `lib/auth/capabilities-pure.ts` — canContribute: approved (was false stub)
- `test/auth-capabilities-pure.test.ts` — updated stub-flags test to check only canFund+canReceivePayout; added canContribute true/false assertions

Key decisions:
- entity-registry.ts imports slugify from contribution-pure.ts (no cycle — pure file has no Harper imports; registry has no Harper imports either)
- validateContribution takes the EntityConfig as a parameter (caller passes it), keeping pure file free of registry import
- `target` param in get() carries both path segment `id` and query params (`entityType`, `entityId`) per Harper Resource convention — matches UserCraft/RiverLog pattern
- Live entity NOT mutated for `op:edit` pending; for `op:create` a base row is seeded immediately (unverified, no currentContributionId)
- isContributor dev-bypass matches isAdminUser pattern in AdminAuth.ts
- tables[config.tableName] dynamic accessor used for generic entity table access

Test result: 352/352 pass (308 prior + 44 new)
Build result: `✓ built in 312ms` — clean, no TS errors (pre-existing chunk-size warning only)

## 2026-06-02 — Phase A1 fixes (found during live curl verification)

The A1 backend landed but live testing surfaced 5 bugs (all fixed; backend now verified E2E on real APs):
1. **Dev-bypass defeated** — `post()` did a standalone `getUserId`→401 *before* `isContributor`, so curl (no session) 401'd before the dev bypass. Reordered to check the capability helper first (mirrors `AdminAuth`/`patch`).
2. **Required enforced on edits** — `validateContribution` required `name` even for a partial edit. Added `{partial}` opt; edits skip `required`, creates enforce it.
3. **Changeset not sparse** — `buildChangeset` iterated all descriptor keys, so an omitted field was recorded as "changed → undefined" and would null real fields on verify. Fixed to `if (!(key in after)) continue` → only supplied fields diff. `name` now preserved across a partial edit.
4. **Stale read after patch** — verify returned `pending` though the DB was `verified` (read-after-write). Now returns the authoritative merged object.
5. **Query params unread** — `GET /ContributionResource?entityType=&entityId=` read `target?.entityType` (always empty). Harper surfaces query as a URLSearchParams-like object; fixed with the `target.get(name) ?? target[name]` idiom (mirrors `RiverSearch`).

Also: **`resources/CorridorView.ts`** AP mapping extended to surface the new contributable fields + provenance (directions, permitRequired, feeUsd, parkingSpaces, lastVerifiedAt, verifiedBy, currentContributionId) so the frontend cards have data.

**Endpoint note:** the custom resource is `class ContributionResource` → REST path **`/ContributionResource`** (NOT `/Contribution`, which is the auto-generated raw table endpoint). Frontend api.ts must target `/ContributionResource`.

Verified E2E (curl, real APs): submit partial edit → pending (AP untouched) → verify → AP patched (directions+parking applied, name/sortIndex preserved, provenance stamped); GET history returns versions; unknown entityType → 400; re-verify → 409; whitelist drops id/sortIndex. 352 tests green.

## 2026-06-02 — Phase A2 (frontend)

Files added:
- `app/src/components/ContributionBadge.tsx` — presentational provenance strip; state pill (pending=amber, verified=green, disputed/rejected=muted) + relative date; no lib/ imports
- `app/src/components/AccessPointCard.tsx` — presentational card; renders name, kind label, chips (directions/permitRequired/feeUsd/parkingSpaces/vehicleAccess), directions text, notes, ContributionBadge when provenance exists; exports `AccessPointData` interface
- `app/src/components/EditContributionForm.tsx` — generic versioned-edit form; field descriptors re-declared inline (mirrors RiverLogCard pattern — no cross-root lib/ import); `RequireCapability` gate with sign-in fallback; `useMutation` + invalidates `['corridor']` + `['riverDetail']` on success

Files changed:
- `app/src/api.ts` — added `submitContribution`, `listContributions`, `verifyContribution` methods (three new entries at bottom of api object, after `adminRiverRequests`)
- `app/src/components/SectionDetailBody.tsx` — added `accessPoints?: AccessPointData[]` + `corridorMileSpan?` props; new `CommunitySection` subcomponent (below Past Trips) renders filtered APs; `AdminContributionControls` sub-component fetches pending contributions per AP and renders Verify/Reject buttons for admins; `PendingContributionRow` drives the action calls
- `app/src/components/SectionTile.tsx` — added `accessPoints?: AccessPointData[]` prop; passes it + `section.corridorMileSpan` down to `SectionDetailBody`
- `app/src/components/CorridorMapColumn.tsx` — added `accessPoints` to destructured props; passes `accessPoints as AccessPointData[]` to each `SectionTile`
- `test/contributions-pure.test.ts` — added 4 regression tests for `validateContribution {partial}` and `buildChangeset` sparse-omission behavior

SectionDetailBody AP data wiring:
- `CorridorView` response (`data.accessPoints`) already lives in `DesktopCorridor` and is passed to `CorridorMapColumn` via existing `accessPoints` prop (was already in the interface but not destructured).
- `CorridorMapColumn` now destructures it and passes the full array to each `SectionTile` as `accessPoints`.
- `SectionTile` passes it + `section.corridorMileSpan` to `SectionDetailBody`.
- `SectionDetailBody` filters APs to those whose `riverMile` falls within `[corridorMileSpan.startMile, corridorMileSpan.endMile]`.
- No additional fetch: the AP list is already in the React Query cache from the corridor query.

lib/ import decision: re-declared `AccessPointFields` inline in `EditContributionForm` (mirrors the `RiverLogCard`/`getFlowStatus` inline pattern established in slice 12c). `AccessPointData` interface is re-declared in `AccessPointCard.tsx` and exported. No cross-root `lib/` imports in `app/src`.

Test result: 356/356 pass (352 prior + 4 new regression tests)
Build result: `✓ built in 263ms` — clean, no TS errors (pre-existing chunk-size warning only)

## 2026-06-02 — Phase A verified in-browser + dev-cap fix

- Browser (preview, dev bypass): expanded a corridor section tile → **Community → Access points** block renders typed AP cards (PUT-IN/TAKE-OUT, name, alt-names, mile, notes) + **"Suggest an edit"** per card, inline (no route). Screenshot captured.
- **Fix:** `DEV_CAPABILITIES` in `useAuth.tsx` still had `canContribute:false` (stale from slice 20's stub). Set to `true` so the dev bypass exercises the contribute UI (membership grants contribute as of this slice).
- One earlier false alarm: tiles appeared blank right after navigation — that's corridor-data-query load timing (the static map style paints before data resolves), NOT a regression. Tiles + map render fully once data loads.
- **Phase A status: DONE** (spine + AccessPoint, backend E2E + frontend, verified). Remaining: Phase B (Rapid), Phase C (ShuttleBusiness + Outfitter), Phase D (full E2E + regression).

## 2026-06-02 — Phase B (Rapid)

Files added:
- `schemas/rapid.graphql` — new Rapid table: id, sectionId @indexed, section @relationship, corridorId, name, slug @indexed, riverMile, latitude, longitude, classRating, classByFlowJson, linesJson, hazardsJson, scoutPortageNotes, photosByFlowJson, sortIndex @indexed, lastVerifiedAt, verifiedBy, currentContributionId.
- `app/src/components/RapidCard.tsx` — presentational card: name, class rating badge (color-coded I–V+), river mile, lines/hazards chip summary, scout/portage notes, `ContributionBadge` when provenance exists. Exports `RapidData` interface.

Files changed:
- `lib/contributions/entity-registry.ts` — added `'rapid'` entry: tableName 'Rapid', label 'Rapid', 9 FieldDescriptors (name[text,required], classRating[text], riverMile[number,min 0], latitude[latlng], longitude[latlng], scoutPortageNotes[longtext], linesJson[longtext], hazardsJson[longtext], classByFlowJson[longtext]). newId → compositeId(['rapid', slugify(name), timestamp]).
- `lib/seed-data.ts` — added `RAPIDS` array: 6 real well-known Arkansas Headwaters rapids across 3 sections (Numbers: Number One IV, Number Three IV+; Upper Browns: Zoom Flume IV, Seidel's Suckhole IV; Royal Gorge: Sunshine Falls V, Sledgehammer IV+) with linesJson, hazardsJson, classByFlowJson, scoutPortageNotes, real coordinates and river miles.
- `resources/Seed.ts` — added `rapids` action: idempotent `tables.Rapid.put` for each row in `RAPIDS`. Also imported `RAPIDS` from seed-data.
- `resources/RiverDetail.ts` — added `getRapidsForSection(sectionId)` async function: searches `tables.Rapid` by sectionId, maps to flat shape with all provenance fields, sorts by riverMile/sortIndex/name. Added to `Promise.all` and included in response as `rapids` array.
- `app/src/types.ts` — added `rapids: any[]` field to `DetailViewModel`.
- `app/src/lib/transform.ts` — destructures `rapids` from raw API data, passes through as `rapids: rapids || []`.
- `app/src/components/EditContributionForm.tsx` — added `RAPID_FIELDS` descriptor array (9 fields, mirrors registry); added `'rapid'` key to `ENTITY_FIELDS` map.
- `app/src/components/SectionDetailBody.tsx` — imported `RapidCard` + `RapidData`; added `editingRapidId`/`setEditingRapidId`/`addingRapid`/`setAddingRapid` state; threaded `rapids={detail.rapids}` + rapid state down to `CommunitySection`; updated `CommunitySectionProps` interface; updated `CommunitySection` to render a "Rapids" sub-block with: RapidCard per rapid, "Suggest an edit" (members), "Add a rapid" affordance (members), admin Verify/Reject controls; renders "No rapids recorded yet" with inline Add prompt when empty; generalized `AdminContributionControls` from `{ apId }` to `{ entityType, entityId }` (now handles both AP and Rapid).
- `test/contributions-pure.test.ts` — added 14 new tests for `'rapid'` entity config: valid minimal/full sets pass; non-descriptor keys dropped; required name missing → 400; partial edit allows missing name; bad JSON in linesJson/hazardsJson/classByFlowJson → 400; latitude/longitude/riverMile range violations → 400; valid JSON array passes; newId generates string containing 'rapid' and slugified name.

Rapids data wiring:
- `RiverDetail.ts` (backend): `getRapidsForSection` queries `tables.Rapid` by sectionId. Result sorted riverMile ASC, then sortIndex, then name. Returned as `rapids` array in the RiverDetail JSON response.
- `transform.ts` (frontend lib): destructures `rapids` from raw API data, passes through unchanged.
- `DetailViewModel` (types.ts): `rapids: any[]` field added.
- `SectionDetailBody.tsx`: reads `detail.rapids` (already in the React Query cache from the corridor/section data query — no extra fetch).

Seeded rapids (6 rows):
- **The Numbers** (arkansas-numbers): Number One Rapid (IV, mi 0.4), Number Three Rapid (IV+, mi 1.3)
- **Upper Browns** (arkansas-browns-upper): Zoom Flume (IV, mi 23.2), Seidel's Suckhole (IV, mi 24.1)
- **Royal Gorge** (arkansas-royal-gorge): Sunshine Falls (V, mi 3.2), Sledgehammer (IV+, mi 5.8)

Seed result: `{"ok":true,"action":"rapids","rapids":6}`

E2E curl results:
- `POST /ContributionResource {entityType:'rapid',op:'create',fields:{name:'Test Rapid',classRating:'IV',riverMile:5}}` → `{verificationState:'pending',entityId:'rapid_test-rapid_...'}` ✓
- `GET /ContributionResource?entityType=rapid&entityId=...` → `{contributions:[{verificationState:'pending',version:1}]}` ✓
- `PATCH /ContributionResource {action:'verify'}` → `{verificationState:'verified'}` ✓
- `GET /RiverDetail/arkansas-numbers` after verify → rapid row shows `classRating:'IV+'`, `scoutPortageNotes:'Updated notes.'`, `currentContributionId:...` ✓
- Edit on seeded rapid (rapid-numbers-1): submit → pending → verify → entity row patched with changeset ✓

Test result: 370/370 pass (356 prior + 14 new rapid tests)
Build result: `✓ built in 266ms` — clean, no TS errors (pre-existing chunk-size warning only)

**Phase B status: DONE.** Remaining: Phase C (ShuttleBusiness + Outfitter), Phase D (full E2E + regression).

## 2026-06-02 — Phase C (ShuttleBusiness + Outfitter)

Files added:
- `schemas/shuttle-business.graphql` — new ShuttleBusiness table: id, name, slug @indexed, phone, website, serviceCorridorIds (JSON string[] stored as String), ratesJson, notes, lastVerifiedAt, verifiedBy, currentContributionId.
- `schemas/outfitter.graphql` — new Outfitter table: id, name, slug @indexed, licenseNumber, licenseState, phone, website, serviceCorridorIds, tripTypesJson, notes, lastVerifiedAt, verifiedBy, currentContributionId.
- `app/src/components/ShuttleBusinessCard.tsx` — presentational card: Shuttle eyebrow label, name, phone/website link chips, rates summary (label + priceUsd + notes), notes, ContributionBadge when provenance exists. Exports `ShuttleBusinessData` interface.
- `app/src/components/OutfitterCard.tsx` — presentational card: Outfitter eyebrow label, name, license badge (state + number), trip-type chips (half-day/full-day/overnight/etc.), phone/website link chips, notes, ContributionBadge when provenance exists. Exports `OutfitterData` interface.

Files changed:
- `lib/contributions/entity-registry.ts` — added `'shuttle-business'` entry (tableName 'ShuttleBusiness', 6 FieldDescriptors: name[text,required], phone[text], website[text], serviceCorridorIds[longtext], ratesJson[longtext], notes[longtext]; newId → compositeId(['shuttle', slugify(name), timestamp])) and `'outfitter'` entry (tableName 'Outfitter', 8 FieldDescriptors: name[text,required], licenseNumber[text], licenseState[text], phone[text], website[text], serviceCorridorIds[longtext], tripTypesJson[longtext], notes[longtext]; newId → compositeId(['outfitter', slugify(name), timestamp])).
- `lib/seed-data.ts` — added `SHUTTLE_BUSINESSES` (3 rows: Arkansas Valley Adventures, Buffalo Joe's Rafting, Independent Whitewater) and `OUTFITTERS` (3 rows: Wilderness Aware Rafting, Echo Canyon River Expeditions, Noah's Ark Whitewater Rafting) arrays; all with real contact info and serviceCorridorIds=['arkansas-headwaters'].
- `resources/Seed.ts` — imported SHUTTLE_BUSINESSES + OUTFITTERS; added `shuttle-businesses` action (idempotent put) and `outfitters` action (idempotent put).
- `resources/CorridorView.ts` — added ShuttleBusiness + Outfitter to Promise.all; added servicesCorridor() helper (parses serviceCorridorIds JSON, checks includes corridorId); added corridorShuttleBusinesses + corridorOutfitters arrays; included both in result.
- `app/src/components/EditContributionForm.tsx` — added SHUTTLE_BUSINESS_FIELDS + OUTFITTER_FIELDS descriptor arrays; added 'shuttle-business' + 'outfitter' keys to ENTITY_FIELDS map.
- `app/src/components/SectionDetailBody.tsx` — imported ShuttleBusinessCard + OutfitterCard + types; added shuttleBusinesses/outfitters props + 4 new state vars (editingShuttleId, addingShuttle, editingOutfitterId, addingOutfitter); updated hasContent check; added "Shuttles" + "Outfitters" sub-blocks in CommunitySection with full Suggest-edit/Add/AdminVerify UI (mirrors Rapid pattern); updated CommunitySectionProps interface and CommunitySection destructuring.
- `app/src/components/SectionTile.tsx` — added shuttleBusinesses? + outfitters? optional props; passes them to SectionDetailBody.
- `app/src/components/CorridorMapColumn.tsx` — added shuttleBusinesses? + outfitters? optional props (default []); passes them to each SectionTile.
- `app/src/desktop/DesktopCorridor.tsx` — reads data?.shuttleBusinesses + data?.outfitters from useCorridor(); passes to CorridorMapColumn.
- `app/src/mobile/MobileCorridor.tsx` — same extraction pattern as Desktop; passes to CorridorMapColumn.
- `test/contributions-pure.test.ts` — added 20 new tests for shuttle-business and outfitter entity configs (valid minimal/full sets pass; non-descriptor keys dropped; required name missing → 400; partial edit allows missing name; bad JSON in ratesJson/tripTypesJson → 400; serviceCorridorIds stored as-is (no Json-suffix check); valid JSON arrays pass; newId generates string with 'shuttle'/'outfitter').

Threading path:
`CorridorView.ts` → `useCorridor()` → `DesktopCorridor.tsx`/`MobileCorridor.tsx` → `CorridorMapColumn.tsx` → `SectionTile.tsx` → `SectionDetailBody.tsx` → `CommunitySection` → `ShuttleBusinessCard`/`OutfitterCard`

Seeded businesses (Arkansas Headwaters):
**Shuttles:** Arkansas Valley Adventures (719-539-6789), Buffalo Joe's Rafting (719-395-8757), Independent Whitewater (719-539-7478)
**Outfitters:** Wilderness Aware Rafting (719-395-2112, CO-OA-1986-001), Echo Canyon River Expeditions (719-275-3154, CO-OA-1978-004), Noah's Ark Whitewater Rafting (719-395-2158, CO-OA-1981-012)

Seed results:
- `{"ok":true,"action":"shuttle-businesses","shuttleBusinesses":3}`
- `{"ok":true,"action":"outfitters","outfitters":3}`

E2E curl results (both entity types):
- ShuttleBusiness create → `{verificationState:'pending'}` ✓
- ShuttleBusiness GET history → `{verificationState:'pending', version:1}` ✓
- ShuttleBusiness PATCH verify → `{verificationState:'verified'}` ✓
- CorridorView after verify → shuttle row shows `lastVerifiedAt` + `currentContributionId` stamped ✓
- ShuttleBusiness edit seeded row (shuttle-arkansas-valley-adventures) → pending → verify → `{verificationState:'verified'}` ✓
- Outfitter create → `{verificationState:'pending'}` ✓
- Outfitter PATCH verify → `{verificationState:'verified'}` ✓
- Outfitter edit seeded row (outfitter-wilderness-aware) → pending → verify → `{verificationState:'verified'}` ✓
- CorridorView /arkansas-headwaters → shuttleBusinesses:4, outfitters:3 ✓

Test result: 390/390 pass (370 prior + 20 new Phase C tests)
Build result: `✓ built in 280ms` — clean, no TS errors (pre-existing chunk-size warning only)

Key decisions:
- serviceCorridorIds field is `type: 'longtext'` (key doesn't end in `Json`), so the `*Json` validation convention does not apply to it — it's stored as-is. Tests updated to document this behavior.
- ShuttleBusiness/Outfitter relate to corridors via `serviceCorridorIds` JSON string[] filter in CorridorView (not a corridor FK), matching the plan's architecture.
- Threading reuses the exact same optional-prop pattern as accessPoints through all layers.

**Phase C status: DONE.** Remaining: Phase D (full E2E + regression + browser screenshot).

## 2026-06-02 — Phase D: full verification (slice functionally complete)

- **Tests 390/390 green** (started at 308 baseline; +82 across contribution-pure + entity configs + regression). **`npm run ui:build` clean.**
- **All 4 entity types verified E2E via curl** (access-point, rapid, shuttle-business, outfitter): create→pending (entity unverified) → admin verify → changeset applied + provenance stamped; partial edit preserves untouched fields; GET history; guards 400 (bad input/unknown type) / 403 (non-contributor/non-admin) / 404 (missing) / 409 (illegal transition).
- **Browser-verified** (preview, dev bypass) at `/corridor/arkansas-headwaters` → expand a section → **Community** block renders all four sub-blocks: Access points, Rapids (real seeded: Number One/Three, Zoom Flume, Sunshine Falls), Shuttles + Outfitters (real: Arkansas Valley Adventures, Wilderness Aware, Echo Canyon) — each with typed cards, `ContributionBadge` provenance (a "● Verified · dev_local" badge confirmed), "Suggest an edit" (members), "+ Add" create affordances, and admin Verify/Reject. **Inline, no new routes (per IA vision).** Screenshot captured.
- **Regression:** `/corridor/upper-colorado` serves 200 (spine fallback unaffected); arkansas still has all 35 seeded APs. Corridor map + tiles render.
- **Architecture validated:** adding rapid/shuttle/outfitter required ZERO changes to the generic `Contribution.ts` resource or `contribution-pure.ts` — only a registry entry + schema + card + surfacing per entity. The spine generalized cleanly.
- **Deferred (documented):** MediaAsset/photos/EXIF (greenfield blob infra, shares decision w/ slice 12f); trust-weighted verification (slice 24); bounty linkage (slice 22, field reserved).
- **Minor test pollution:** a few curl-created "Test" entities + edits on real seed APs (directions on granite/clear-creek) remain in local `~/hdb`; harmless dev data, re-seedable. Not in git.

**Status: code-complete + verified by me across all acceptance criteria.** Holding `done` + `mv completed/` + activate-22 for the user's own in-browser confirmation (per the 13c/20 pattern). On confirm → advance queue to slice **22-bounty-system** (intent → expand to plan in a fresh Plan phase).

## 2026-06-03 — CLOSED
User confirmed slice 21 in-browser ("Yes please advance"). All 10 ACs verified: 390 tests green, build clean, all four entity types (access-point, rapid, shuttle-business, outfitter) E2E-verified backend + browser, generic spine + provenance + capability gating working, inline surfacing per IA vision. Media deferred (documented). Shipped. Moving to completed/. Queue advances to slice 22.
