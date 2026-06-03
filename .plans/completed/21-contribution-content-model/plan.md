---
slice: 21-contribution-content-model
status: done
value: 9
confidence: 6
effort: XL
depends_on: [20-identity-roles-capabilities]
unlocks: [22-bounty-system, 24-trust-reputation-governance, 25-zero-layers-deep-ia]
opened: 2026-06-02
closed: 2026-06-03
---

# Slice 21 — Contribution content model

## Context (grounded against the codebase 2026-06-02)

The intent sketches 6 tables, 6 resources, 4 routes, media/EXIF. Grounding established three reshaping facts:

1. **`AccessPoint` is already a real, seeded table** (`schemas/access-point.graphql`, 35 rows, drives the corridor map via `CorridorView`). It is *extended and made contributable*, not created.
2. **Media/blob storage is 100% greenfield** — no upload, no `sharp`/`multer`/blob deps, no EXIF tooling. `MediaAsset`/photos-by-flow shares a blob-infra decision with deferred slice 12f.
3. **The IA vision forbids stub routes** (`vision/information-architecture.md`) — contributable data surfaces *inline* on section/corridor pages, not at `/access-point/:id`.

**User scope decision (2026-06-02):** full intent minus media — `AccessPoint`, `Rapid`, `ShuttleBusiness`, `Outfitter` are ALL contributable this slice. Effort is therefore XL; built in reviewable internal phases (A→D below). Confidence is 6 because this locks schema for entities that slices 22/24 have not yet constrained — mitigated by the generic spine, which keeps per-entity surface thin and the changeset format entity-agnostic.

## Goal

Build the **versioned, attributed `Contribution` provenance spine** (submit → pending record → verification state machine → applied to the live entity, full provenance), and drive **four entity types through one generic registry** so adding a type is "schema + a config entry + a card," not a new resource. Surface all four inline on the corridor/section workhorse page. This is the data layer slices 22 (bounties attach to contributions), 24 (trust weighting reads contribution state), and 25 (inline IA) build on.

The genericity is the architectural core: **one `Contribution` resource + one `ENTITY_REGISTRY`** handle all entity types. Per-entity code = a schema file + a registry entry (table name, contributable-field descriptors, validator) + a presentational card.

## What's DEFERRED (and why)

- **`MediaAsset` + photo upload + EXIF stripping + photos-by-flow** → greenfield blob infra; shares the decision with deferred slice 12f. The `Contribution` spine and `Rapid.photosByFlow` reserve a nullable `MediaAsset` reference shape so it slots in later with no migration.
- **Trust-weighted / reputation verification** → slice 24. The `verificationState` machine is the hook; 24 adds verifier weighting + auto-acceptance thresholds. This slice: author submits → pending; **admin** verifies (transitional).
- **`bountyId` linkage behaviour** → slice 22 (field exists, nullable, unused now).
- **Separate detail routes** → IA vision; inline only.

## Architecture — the generic spine

### `ENTITY_REGISTRY` (pure, in `lib/contributions/entity-registry.ts`)
A map from `entityType` → config, the single source of truth the resource + form + cards consume:
```ts
interface FieldDescriptor {
  key: string; label: string;
  type: 'text' | 'longtext' | 'number' | 'boolean' | 'enum' | 'latlng';
  enumValues?: readonly string[];
  min?: number; max?: number; required?: boolean;
}
interface EntityConfig {
  entityType: string;        // 'access-point' | 'rapid' | 'shuttle-business' | 'outfitter'
  tableName: string;         // 'AccessPoint' | 'Rapid' | 'ShuttleBusiness' | 'Outfitter'
  label: string;             // 'Access point' etc.
  fields: FieldDescriptor[]; // the contributable fields (drives validation + the edit form)
  newId(input): string;      // compositeId scheme for a brand-new entity of this type
}
export const ENTITY_REGISTRY: Record<string, EntityConfig>;
export function getEntityConfig(entityType: string): EntityConfig | null;
```
The resource never hardcodes a field list; it reads `getEntityConfig(entityType).fields`. The frontend `EditContributionForm` renders inputs from the same descriptors. Adding an entity touches only the registry + schema + a card.

## Schema changes

### New: `schemas/contribution.graphql`
```graphql
type Contribution @table @export {
	id: ID @primaryKey                  # compositeId([entityType, entityId, authorId, timestamp])
	entityType: String @indexed         # 'access-point' | 'rapid' | 'shuttle-business' | 'outfitter'
	entityId: ID @indexed               # FK to the target row
	op: String                          # 'edit' | 'create'  (create = first version of a new entity)
	version: Int                        # 1-based per entity
	authorId: ID @indexed
	author: WaitlistUser @relationship(from: "authorId")
	submittedAt: String @indexed
	verificationState: String @indexed  # 'pending' | 'verified' | 'disputed' | 'rejected'
	verifiedBy: ID
	verifiedAt: String
	changesetJson: String                # JSON { before:{changed fields}, after:{changed fields} }
	bountyId: ID @indexed                # nullable; slice 22
}
```

### Extend: `schemas/access-point.graphql` (additive, back-compat)
Add: `directions: String`, `permitRequired: Boolean`, `feeUsd: Float`, `parkingSpaces: Int`, `lastVerifiedAt: String`, `verifiedBy: ID`, `currentContributionId: ID`. (`kind` stays `String`; documented enum: `put-in|take-out|both|trailer_ramp|slide_rails|carry_in|carry_out|horse_pack_in|fly_in|other`. Existing `fee: String` kept as legacy free-text.)

### New: `schemas/rapid.graphql`
```graphql
type Rapid @table @export {
	id: ID @primaryKey
	sectionId: ID @indexed
	section: RiverSection @relationship(from: "sectionId")
	corridorId: ID @indexed
	name: String
	slug: String @indexed
	riverMile: Float
	latitude: Float
	longitude: Float
	classRating: String                  # International scale base, e.g. 'III' / 'IV+'
	classByFlowJson: String              # JSON [{ minCfs, maxCfs, class }] flow-conditional rating
	linesJson: String                    # JSON [{ name, description, classAt, entryLine, exitLine }]
	hazardsJson: String                  # JSON [{ type, description, severity }]
	scoutPortageNotes: String
	photosByFlowJson: String             # JSON [{ flowCfs|flowBand, mediaAssetId }] — mediaAssetId null until media slice
	sortIndex: Int @indexed
	lastVerifiedAt: String
	verifiedBy: ID
	currentContributionId: ID
}
```

### New: `schemas/shuttle-business.graphql`
```graphql
type ShuttleBusiness @table @export {
	id: ID @primaryKey
	name: String
	slug: String @indexed
	phone: String
	website: String
	serviceCorridorIds: String           # JSON string[] of corridorIds
	ratesJson: String                    # JSON [{ label, priceUsd, notes }]
	notes: String
	lastVerifiedAt: String
	verifiedBy: ID
	currentContributionId: ID
}
```

### New: `schemas/outfitter.graphql`
```graphql
type Outfitter @table @export {
	id: ID @primaryKey
	name: String
	slug: String @indexed
	licenseNumber: String
	licenseState: String
	phone: String
	website: String
	serviceCorridorIds: String           # JSON string[]
	tripTypesJson: String                # JSON string[] (e.g. ['half-day','full-day','overnight'])
	notes: String
	lastVerifiedAt: String
	verifiedBy: ID
	currentContributionId: ID
}
```

## Capability change — light up `canContribute`

`lib/auth/capabilities-pure.ts`: `canContribute: approved` (membership lets you *submit*; acceptance gating = slice 24). Update `test/auth-capabilities-pure.test.ts` (canFund/canReceivePayout stay false).

## Pure logic + tests

### `lib/contributions/entity-registry.ts`
The `ENTITY_REGISTRY` with all four configs + `getEntityConfig`.

### `lib/contributions/contribution-pure.ts`
- `type VerificationState = 'pending' | 'verified' | 'disputed' | 'rejected'`
- `validateContribution(entityType, input)` → `{ ok: true; clean } | { ok:false; error; status }` — looks up the registry, whitelists to descriptor keys, validates per-descriptor (enum membership, numeric min/max, required, latlng bounds, JSON parseability for `*Json` fields).
- `buildChangeset(before, after, fieldKeys)` → sparse `{ before, after }` of changed fields only.
- `applyChangeset(targetRow, changeset)` → field set to patch onto the entity.
- `nextVersion(currentMax)`.
- `canTransition(from, to)` — pending→verified|disputed|rejected; disputed→verified|rejected; verified→disputed; rejected terminal.
- helpers: `slugify(name)`.

### `test/contributions-pure.test.ts`
node:test + factory helpers. Per entity type: valid + invalid field sets; whitelist drops non-descriptor keys (id/sortIndex/provenance); enum + numeric-range rejection; JSON-field parse validation; changeset diff + apply round-trip; full state-transition matrix; version increment.

## Resource: `resources/Contribution.ts`

ONE resource, generic over `entityType` via the registry (mirrors `RiverLog`/`UserCraft` conventions).
- **`get(target?)`** — `?entityType=X&entityId=Y` → version history (public read); `/Contribution/:id` → one.
- **`post(data)`** — auth + `isContributor` (new helper: `resolveCapabilities(callerRecord).canContribute`; dev bypass like `isAdminUser`). `op:'edit'` requires existing `entityId`; `op:'create'` mints a new id via `config.newId(...)` and seeds a base row in the target table (status: unpublished until verified — represented by absence of `currentContributionId`). Validates via `validateContribution(entityType, …)`, builds changeset against the current row (empty `before` for create), writes a `pending` Contribution. **Live entity is not mutated for `edit` pending; for `create` the row exists but is flagged unverified.** Returns the contribution.
- **`patch(data)` — `{ id, action: 'verify'|'reject'|'dispute' }`** — `isAdmin` gate (24 broadens). On `verify`: `canTransition` check → state `verified` + `verifiedBy`/`verifiedAt`; **apply changeset to the target table row** + stamp `lastVerifiedAt`/`verifiedBy`/`currentContributionId`. `reject`/`dispute`: state only.

## Frontend

- **`app/src/components/ContributionBadge.tsx`** — shared provenance strip + state pill.
- **Cards (presentational, one per entity):** `AccessPointCard.tsx`, `RapidCard.tsx`, `ShuttleBusinessCard.tsx`, `OutfitterCard.tsx`. Each renders its entity's fields + `ContributionBadge`.
- **`app/src/components/EditContributionForm.tsx`** — generic, renders inputs from `getEntityConfig(entityType).fields` descriptors; handles edit + create; gated behind `<RequireCapability capability="canContribute">` (else a sign-in/become-member affordance).
- **`app/src/api.ts`** — `submitContribution(entityType, entityId|null, op, fields)`, `listContributions(entityType, entityId)`, `verifyContribution(id, action)`.
- **Inline surfacing (IA vision — no new routes):** in `SectionDetailBody.tsx` (the expanded corridor section tile, the workhorse), add a **Community** block grouping: AccessPoint cards, Rapid cards (for the section), and the section's corridor ShuttleBusiness/Outfitter listings. Each card: provenance badge; "Suggest an edit" (members) → `EditContributionForm`; "Add a rapid/shuttle/outfitter" create affordance (members); Verify/Reject controls on pending contributions (admins, via `<RequireCapability capability="isAdmin">`).
- **CorridorView/SectionDetail data:** extend the assembling resource(s) to include rapids (by sectionId) + corridor shuttle/outfitter listings + each entity's current provenance, so the cards have data. (Verify whether `RiverDetail`/`SectionDetailBody`'s data source is `CorridorView` or `RiverDetail`; extend the right one.)

## Build phases (internal; auto within Execute)
- **Phase A — spine + AccessPoint:** contribution schema, AP extension, entity-registry (AP only first), contribution-pure + tests, `Contribution.ts`, `canContribute`, `ContributionBadge` + `AccessPointCard` + `EditContributionForm`, api.ts, inline AP surfacing. Verify (curl + browser).
- **Phase B — Rapid:** rapid schema, registry entry, `RapidCard`, seed a couple real rapids (e.g. on The Numbers / Browns) for visible data, inline rapid surfacing + data wiring. Verify.
- **Phase C — ShuttleBusiness + Outfitter:** two schemas, two registry entries, two cards, corridor-level listing surfacing + data wiring, optional seed of 1–2 real listings. Verify.
- **Phase D — full E2E + regression + browser screenshot.**

## Acceptance criteria
1. All four new/extended schemas load in Harper with no reload errors.
2. `canContribute === membership`; `canFund`/`canReceivePayout` stay false; tests updated + green.
3. `contribution-pure.ts` + `entity-registry.ts` pure (no Harper imports), fully unit-tested across all four entity types (validation, whitelist, changeset, transitions, versioning, JSON-field parsing).
4. `POST /Contribution` (edit) by an approved member → `pending`, live entity unchanged; non-member → 403. `op:'create'` mints an unverified entity row.
5. `PATCH /Contribution {action:'verify'}` by admin → `verified` + changeset applied to the target table + provenance stamped; non-admin → 403; `reject`/`dispute` update state only.
6. `GET /Contribution?entityType=…&entityId=…` returns version history (public) for every entity type.
7. The corridor section tile renders AccessPoint + Rapid cards and corridor Shuttle/Outfitter listings, each with provenance; members see Suggest-edit/Add; visitors see sign-in; admins see Verify/Reject. **No new route.**
8. Browser E2E: member edits an AP → pending → admin verifies → card updates with new data + provenance. Repeat for at least one create (e.g. add a Rapid).
9. `npm test` all green; `npm run ui:build` clean.
10. Existing AccessPoint/corridor rendering unregressed (35 APs still on the map; new fields nullable).

## Verification steps
1. `npm test` + `npm run ui:build`.
2. Harper (`~/hdb`, 9926) + Vite (5173); confirm clean schema reload for all four tables.
3. `curl` chain per entity type: submit (dev→canContribute) → history pending → verify → target row shows applied fields + provenance → non-member submit 403 → non-admin verify 403 → `op:create` mints + verify publishes.
4. Preview browser at `/corridor/arkansas-headwaters`: expand a section → Community block shows AP + Rapid cards + corridor listings → Suggest edit → submit → Verify → card updates. Screenshot.
5. Regression: corridor map renders all APs; `/corridor/upper-colorado` spine fallback unaffected; 308+ baseline tests still pass.

## Open questions (resolved for this slice)
- **Changeset = sparse diff.** **Submission gate = membership; acceptance gate = admin** (24 refines). **Pending edits don't mutate live data; creates make an unverified row.** **Photos/MediaAsset deferred** (Rapid.photosByFlowJson reserves the shape). **Flow-conditional rapid class** included via `classByFlowJson`. **No EXIF work** this slice.

## Slice paperwork
- `plan.md` (this file) — authored + expanded to full scope 2026-06-02.
- `status.md` — created at activation; updated per phase.
- `decisions.md` — create if a design call is reversed during build.
