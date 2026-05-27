---
slice: 13b-multi-section-logs
status: queued
value: 8
confidence: 8
effort: M
depends_on: [13c-corridor-map-and-tiles]
unlocks: []
opened: 2026-05-25
closed: null
---

# Slice 13b — Multi-section trip logging

## Context

Today `RiverLog` is tied to a single `sectionId` (required, indexed). Multi-day Arkansas trips often span sections — e.g. Fractions put-in, overnight below Ruby Mountain, continue through Big Bend. The 12 / 12b / 12l series shipped multi-day camping (`endDate`, `campingJson`, `tripNights`) *within one section*, but the section anchor is still single. With 13a landing hierarchical sections + a corridor spine that exposes access points and river-miles, the missing piece is letting a log record `putInAccessPointId` and `takeOutAccessPointId` and derive section traversal from the AP mile range.

## Goal

Extend `RiverLog` so a trip can record put-in and take-out access points; "sections traversed" derives at query time from the AP mile range + SECTION_LEG_MAPPING. Section-detail "Past trips" surfaces any log that traversed that section, not just logs anchored to it.

## Acceptance criteria

1. `RiverLog` gains nullable `putInAccessPointId` and `takeOutAccessPointId` (indexed, FK to `AccessPoint`).
2. `RiverLog.sectionId` stays required as the "anchor" section but is auto-set server-side from the put-in mile when both APs are provided (anchor = lowest-mile section traversed).
3. Log create/edit form lets the user pick AP put-in and take-out from a corridor-aware picker; defaults to the anchor section's `fromAccessPointId` / `toAccessPointId`.
4. `SectionLogs` (and the "Past trips" strip) returns any log whose AP mile range overlaps the section's mile range — not just `sectionId === section.id`.
5. `MyLogs` aggregation still groups by anchor section but surfaces a "spans N sections" chip on logs that traverse more than one.
6. Existing logs without `putInAccessPointId` / `takeOutAccessPointId` continue to work (backwards-compatible — treated as single-section).
7. Camping (existing `campingJson`) continues to work; multi-section trips can carry per-night camp APs.

## Approach (light — expand at activation)

- **Schema.** Add two fields to [schemas/river-log.graphql](../../../schemas/river-log.graphql).
- **Pure helper.** New `app/src/lib/log/section-span-pure.ts`: given `{ corridorId, putInMile, takeOutMile }` and the corridor's sections (with `corridorMileSpan` from 13a), returns the list of `sectionId`s traversed. Pure-test it.
- **Server.** [resources/RiverLog.ts](../../../resources/RiverLog.ts) on POST/PATCH: if AP ids provided, resolve their riverMile, derive `sectionId` if not provided, validate downstream order. Reuse existing flow resolver pattern. [resources/SectionLogs.ts](../../../resources/SectionLogs.ts) switches from `sectionId = X` to "AP mile range overlaps section mile range" using the new indexes.
- **UI.** Extend `LogForm` (paths confirmed at activation; new log page is `/log/new`) to add an AP picker per put-in / take-out. If the user navigated from a 13a corridor view with a section in focus, defaults pre-fill from that section.
- **Card display.** [RiverLogCard.tsx](../../../app/src/components/RiverLogCard.tsx) shows `Fractions → Big Bend (3 sections)` when spanning.

## Critical files

- [schemas/river-log.graphql](../../../schemas/river-log.graphql)
- [resources/RiverLog.ts](../../../resources/RiverLog.ts), [resources/SectionLogs.ts](../../../resources/SectionLogs.ts), [resources/MyLogs.ts](../../../resources/MyLogs.ts)
- `app/src/lib/log/section-span-pure.ts` — **new**
- `app/src/pages/LogNewPage.tsx` / `LogEditPage.tsx` (confirm paths at activation)
- [app/src/components/RiverLogCard.tsx](../../../app/src/components/RiverLogCard.tsx)
- `test/section-span-pure.test.js` — **new**

## Verification (light)

1. Schema change applies cleanly to an existing DB.
2. `npm test` green; existing test suite passes unchanged for legacy single-section logs.
3. Create a multi-section log via the UI (Fractions put-in → Big Bend take-out, 2 nights camping). Verify it appears in `/section/arkansas-fractions/logs`, `/section/arkansas-browns-canyon/logs`, and `/section/arkansas-big-bend/logs`.
4. Existing single-section logs continue to render correctly with no "spans N" chip.
