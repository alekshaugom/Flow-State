---
slice: 11-rapid-stub-pages
status: queued
value: 5
confidence: 9
effort: S
depends_on: [02-watershed-corridor-ia]
unlocks: []
opened: 2026-05-13
closed: null
---

# Slice 11 — Rapid stub pages + access points (intent)

## What success looks like

Each named rapid in the Arkansas Headwaters has a routed page (`/section/arkansas-browns-canyon/rapid/zoom-flume`) with breadcrumb, class, river-mile, satellite map view, and a "details coming" placeholder. Access points have structured rows with directions and permit notes.

The infrastructure exists; content fills in over time (phase 2 builds out real rapid descriptions, line notes, and eventually photos).

## What's NOT it

- Not a content-complete rapids guide. Just the route, the schema, the satellite view, and seeded names for Arkansas Headwaters.
- Not photo upload (phase 2+).
- Not safety advisories. Hazards go in `Rapid.hazards` if known but most fields stay null initially.

## Key dependencies

- `RiverCorridor` + `RiverSection` from slice 02
- Esri Satellite tile (slice 06 ships this; rapid pages may need it before then — pull in early if needed)

## Loose sketch (do not lock in)

- `Rapid` + `AccessPoint` schemas per [vision/data-model-philosophy.md](../../vision/data-model-philosophy.md)
- New `/section/:slug/rapid/:rapidSlug` route
- New `app/src/pages/RapidPage.tsx` — breadcrumb, hero (name + class + mile), satellite map zoomed tight, "details coming" panel
- Seed Browns Canyon (5–7 rapids) and Numbers (5–7 rapids) — names + class + lat/lng + mile, that's it
- Seed access points: all put-ins / take-outs for Arkansas Headwaters as structured rows

## Open questions for when this becomes active

- Rapid mile distance source — there's no canonical free dataset. American Whitewater listings are partial; outfitter sites and guidebooks fill gaps. Manual entry.
- Lat/lng for rapids — same; manual entry from guidebooks. Browns rapids are well-mapped publicly.
- Per-rapid photos — defer entirely. The schema permits it but ingestion is phase 2+.

## References that will matter when active

- [vision/data-model-philosophy.md](../../vision/data-model-philosophy.md) — Rapid + AccessPoint schemas
- [vision/ux-direction.md](../../vision/ux-direction.md) — rapid page hierarchy
- American Whitewater listings: https://www.americanwhitewater.org/content/River/state-summary/state/CO/
