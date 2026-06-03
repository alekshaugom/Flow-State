---
slice: 25-zero-layers-deep-ia
status: queued
value: 8
confidence: 5
effort: L
depends_on: [21-contribution-content-model]
unlocks: [27-multi-domain-abstraction]
opened: 2026-06-02
closed: null
---

# Slice 25 — Zero-layers deep information architecture (intent)

## What success looks like

A visitor lands on the Browns Canyon section page and encounters every piece of information they need — flow status, forecast, access points, shuttle options, rapids guide, nearby outfitters, open bounties, and community-contributed context — surfaced **inline on one page**, organized by the activity they are planning. They never navigate into a sub-page to find the section details. The page is the guide.

Activity tabs (or sections) separate the qualitative from the quantitative: the paddler planning a day trip uses the "Plan" layer (conditions, access, logistics); the paddler analyzing the season uses the "Data" layer (flow history, forecasts, snowpack). Both surfaces live on the same URL with no obligatory nav click.

At the top of the site, a domain switcher — currently with only Rivers populated — signals the roadmap: this IA is designed to expand. The rivers domain is simply the first inhabitant.

## What's NOT it

- Not infinite scroll or endless feed — each section page has a finite, curated set of panels.
- Not a map-first layout — the map is a panel, not the frame.
- Not a separate app for each domain (dams, snow, avalanche) — the domain switcher is the shell; content panels adapt per domain.
- Not a fully custom CMS where admins design the page structure per section — the layout is fixed, content fills in from data.
- Not search-engine-optimized landing pages for every rapid — the deep IA is for engaged users, not acquisition.
- Not a redesign of the existing corridor spine (slice 13c) — the deep IA applies at the section level; the corridor map remains its own surface.

## Why this is intent-only

The page layout is entirely determined by what content exists. We cannot design a "zero-layers" section page until slices 21 (contributions: rapids, APs, shuttles) and 22 (bounties: open data requests) have shipped and populated the schema. Designing the IA before the content model is like speccing a shelf before knowing what books will go on it.

Additionally, the domain-switcher scaffold should be designed once, for reuse by slice 27 (multi-domain abstraction). Doing it here and doing it again there would waste the effort.

## Loose sketch (do not lock in)

### Section page anatomy

One URL: `/section/:slug`

Panels, in rough scroll order:

1. **Hero** — section name, corridor breadcrumb, flow status (BigCFS + status pill), last-updated timestamp.
2. **Plan tab** — activity-oriented:
   - Access points (typed, with directions + permit info from slice 21)
   - Open bounties for this section (from slice 22)
   - Shuttle businesses + outfitters (from slice 21)
   - Rapids overview (class ratings + named rapids; expandable to full rapid detail inline)
3. **Data tab** — quantitative:
   - 14-day forecast chart (slice 05)
   - Flow history (slice 03b)
   - Snowpack + driver attribution (slices 03d, 07)
   - Reservoir releases (slice 03a)
   - Weather strip (slice 03a)
4. **Community tab** — social proof + knowledge:
   - Contributed rapid notes + photos-by-flow (slice 21)
   - Past trip log strip (slice 12, privacy-gated)
   - Contribution provenance footer ("N records contributed by the community")

### Domain switcher scaffold

- `app/src/components/DomainSwitcher.tsx` — top-nav component. For now: a single "Rivers" tab, visually designed to accommodate future tabs ("Dams", "Snow", "Avalanche") that are greyed-out / coming-soon.
- Domain selection is URL-scoped: `/rivers/section/:slug`, `/dams/:id`, etc. — move the routing namespace now so future domains don't require URL rewrites.
- Domain context held in a React context (`DomainContext`) that content panels read to adapt their layout.

### Routes

- `/rivers/section/:slug` — section page under the rivers domain namespace (if URL migration is done here; otherwise deferred to slice 27).
- `/rivers/corridor/:slug` — corridor page (same namespace migration).

### Resources

- `resources/SectionDeepView.ts` — aggregate resource that assembles all section-page panels in one round-trip: flow status + access points + rapids + shuttles + outfitters + open bounties + past trips (user-scoped). Replaces the existing `RiverDetail` resource for the deep IA use case.

### Frontend

- `app/src/pages/SectionDeepPage.tsx` — the new unified section page.
- `app/src/components/PlanTab.tsx`, `DataTab.tsx`, `CommunityTab.tsx` — tab panel components.
- `app/src/components/DomainSwitcher.tsx` — domain nav scaffold.

## Open questions for when this becomes active

- **Tab vs scroll.** Activity tabs (Plan / Data / Community) require a navigation decision. Full-page scroll with sticky section headers is an alternative — the content is the same, the affordance differs. Test with users before committing.
- **URL namespace migration.** Moving from `/section/:slug` to `/rivers/section/:slug` is a breaking URL change. Need redirect rules and coordination with any existing links. Worth doing now (before the URL surface is large) or wait for slice 27? Probably now — the longer we wait the more links to maintain.
- **SectionDeepView N+1 risk.** Assembling all panels in one round-trip is fast for the user but potentially expensive on the server. Profile the query plan before shipping.
- **Domain switcher state.** If a user is looking at a river section and clicks "Dams" (when dams exist), should they land on the nearest dam? Or the dams home? Probably nearest dam by geography — design this when dams data exists.
- **Empty states.** Many sections outside the Arkansas Headwaters will have no contributed access points, rapids, or shuttles yet. The page must degrade gracefully: show open bounties in place of missing data ("Help fill this in — earn a reward").

## References that will matter when active

- `.plans/slices/21-contribution-content-model/intent.md` — access points, rapids, shuttles, outfitters surfaced here.
- `.plans/slices/22-bounty-system/intent.md` — open bounties embedded inline to drive contributions.
- `.plans/slices/05-history-forecast-chart/plan.md` — the forecast chart panel.
- `.plans/slices/07-drivers-and-context-ui/intent.md` — driver attribution panel.
- `.plans/vision/information-architecture.md` — the full zero-layers IA thesis and domain-switcher design principles.
- `.plans/vision/product-vision.md` — "AllTrails for rivers": the comparison that defines the depth-of-content bar.
- Existing `RiverDetail` resource: `resources/RiverDetail.ts` — the aggregate this slice extends or replaces.
