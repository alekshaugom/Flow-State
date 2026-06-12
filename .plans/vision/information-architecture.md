# Information architecture

The organizing principle for Flow-State's IA is **0 layers deep**: the information a user needs for a decision should be on the surface, not two taps down a drill-path.

Today's IA is nested: watershed → corridor → section → rapid → access point. Each level is a page. Getting from "I want to run the Numbers" to "where do I put in and what's the flow doing" requires navigating a tree. That's fine for exploration; it's friction for the user who already knows where they're going.

The goal is not to eliminate hierarchy — the data model hierarchy (see `data-model-philosophy.md`) stays because the domain demands it. The goal is to **not make the user traverse the hierarchy to get the answer.**

## The 0-layers-deep rule

A river or section page surfaces the most compelling quantitative + qualitative information inline, chosen by the user's **activity lens**.

A rafter sees: current flow vs their craft's FlowBand, today's trend, the put-in and take-out with parking notes, the crux rapid's current character. A fly fisherman sees: water temp, clarity, which runs are fishing well, access points with wading notes.

The same underlying data; different surfaces. The lens is a first-class UI control — not buried in settings.

What is NOT on the surface: raw data tables, every gauge reading since 2018, the internal data model hierarchy, every ContextItem ever generated. Those exist; they're accessible. They don't lead.

## The only real layer switch: domain

Within a domain (rivers), the IA is spatial. You scroll a map or list, zoom in, tap a corridor, and the corridor's sections are right there — not a separate page navigation. The hierarchy collapses into the spatial view.

The only meaningful "layer switch" is changing **domain**:

- Rivers (current)
- Dams (future)
- Snowpack (future)
- Avalanche (future)

Domains are **interdependent** — not just adjacent categories. Snowpack feeds river flow. Solar exposure and temperature govern melt rate. Dam operations mediate between snowpack and river. Avalanche risk correlates with snowpack instability. Understanding a river in April means understanding the snowpack above it. The domain-switcher should eventually surface these relationships, not hide them behind tabs.

For now, **rivers is the only populated domain.** The switcher exists as an affordance — a top-level navigation primitive — even when the other domains show nothing but "coming soon." This plants the flag.

## Domain-switcher as top-level nav

The domain switcher is the outermost frame of the application — above watershed, above corridor, above section. Choosing a domain selects which knowledge base you're navigating.

This replaces the current implicit assumption that rivers is the only thing Flow-State does. It also sets up the interdependency story: when snowpack ships, a river section page can surface "this section is fed by X basin, currently at Y% median — tap snowpack domain for detail" without becoming a snowpack app.

## Flattening the existing spatial hierarchy

Today's hierarchy requires the user to know they want to navigate watershed → corridor → section. The revised IA:

- **Map is the primary spatial entry.** Zoom level drives what's visible (consistent with `ux-direction.md` Map UX rules). At z≤8, watersheds. At z9–10, corridors and section lines. At z≥11, access points and rapids surface.
- **A section page contains its corridor context inline.** The user doesn't navigate to the corridor page to understand what region they're in.
- **Search bypasses the hierarchy entirely.** Typing "Numbers" or "Royal Gorge" lands on that entity directly.
- **Access points, campsites, rapid docs, and outfitter listings live on the section page** — not on separate sub-pages that require navigation. A section page is the workhorse. See `ux-direction.md` for the section route IA.

Rapid pages exist for depth (photos by flow, line docs, hazard notes), but a user should be able to glance at the crux rapid's character from the section page without clicking through.

## Relationship to ux-direction.md

This document describes IA structure. Visual rules — token usage, component shapes, the dense/interpretive/map-first hierarchy per route, mobile parity — live in `ux-direction.md`. Don't duplicate them here; cross-reference them.

The IA decisions here constrain what `ux-direction.md` puts on each page. If the IA says access points live on the section page, `ux-direction.md` governs how they render there.

## What we will NOT do

- **No hub-and-spoke "category pages"** for access point types, outfitter directories, etc. Those lists live on section and corridor pages, not on their own routable stubs. (See the Guides-tab clarification below — the *people* layer is a deliberate exception.)
- **No separate "trip planning" IA.** Planning information (permits, shuttle, access) surfaces in context on section and corridor pages, not in a planner flow.
- **No domain expansion before the domain-switcher primitive exists.** Adding snowpack content without the switcher frame means bolting data onto a rivers-only IA that wasn't built for it.

## The Guides tab — a people layer, not a data category (2026-06-11)

The 4-tab design overhaul (slice 30) added a top-level **Trips** tab, evolving into **Guides** (slice 31). This is a deliberate exception to the "no directory pages" rule above, and the boundary is worth stating precisely:

- The rule forbids turning **river data** (access-point types, rapids, per-river outfitter sub-pages) into routable category stubs. That still holds: outfitter and guide *intel relevant to a run* surfaces **in context** on the section/corridor page, not behind navigation.
- **Guides** is a different axis — a **people and commerce** home (outfitter + individual-guide profiles, affiliations, claim-ownership, booking). People are not a river-data hierarchy, so a directory of them is not the hub-and-spoke anti-pattern the rule guards against.

In short: you still don't traverse a tree to learn about *a river*; the Guides tab is how you navigate the *people* who run it.
