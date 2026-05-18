# Product vision

Flow-State helps boaters decide **whether, when, where, and how** to run Colorado rivers.

It moves the product from "live gauge viewer" to a **river intelligence system** that interprets nuance, explains drivers, projects forward, and improves over time.

## What Flow-State is

A spatial, interpretive, forecasted view of Colorado's floatable rivers. Watersheds at the top, raftable corridors in the middle, sections as the workhorse, rapids at the leaf. Every level explains what's happening, why, and what's expected next — at a level appropriate to who's asking.

## Past trips: the second axis

Flow-State is bipolar by design. **Forecasts look forward; logs look backward.** The forecast axis answers "should I go?" The log axis answers "what was it like last time, and the times before?" Together they make past experience inform future decisions in a way no public gauge tool can.

The log surface is deliberately private-first:

- Each user keeps their own trips. The home dashboard shows a quiet corner badge on sections they've been on; section detail pages surface their past trips above the chart.
- A user profile (skill, years, background) gives logs the right interpretive weight — "Former raft guide · 10 yrs" carries different signal than no profile at all.
- Sharing is opt-in per log, friend-by-friend. No public discovery, no comments, no feed. The product walks the line of "bounded social" without becoming a social product.

This axis also feeds back into the forecast axis over time. Flow-at-trip, conditions tags, and craft selection across many logs become the substrate for "this section runs well in this band for this craft" claims with actual evidence behind them.

## Who it's for

Primary: experienced boaters and guides who already know what CFS means, are picking between options on a given weekend, and want to know *for my craft, at my skill, on this section, with this forecast — what is the experience going to be like?*

Secondary: less-experienced boaters who need the system to interpret what numbers mean ("Is 396 enough?"). The craft + skill selector handles them via the same model — bands just resolve differently.

Tertiary: outfitters and content authors who edit FlowBands and summaries via the admin UI.

## Core user jobs

| Job | Trigger | What the user wants |
|---|---|---|
| Scan today's conditions | Morning before driving | Which sections run well *for my craft/skill*, with trend |
| Plan 1–7 days out | Mid-week | Forecast + weather + "expected to drop below ideal by Sun" |
| Pick within a watershed | Don't know where to go | Watershed page → corridor → section |
| Understand a rapid | Scouting | Photos at this flow, line notes, hazards |
| Track a favorite | Season-long | Historical context, alerts |
| Understand why flows changed | Surprise rise/drop | Driver attribution + recent ContextItems |
| Author content | Admins | Edit bands, summaries, named rapids without redeploy |

## What Flow-State is NOT

- **Not a generic weather app.** Weather is a forecast input and a UI hint, not a destination.
- **Not a gauge viewer.** Raw CFS is necessary but not sufficient — interpretation is the product.
- **Not a planning tool for permits, shuttle, gear.** That's phase 4+.
- **Bounded social: private logs with friend-only sharing — no public discovery, comments, or feed.** Trip reports go in your own log; you can opt to share an individual log with a specific friend via invite. No public profiles, no like/comment primitives, no algorithmic feed.
- **Not coverage-maximalist.** Better to model the Arkansas Headwaters deeply than every river shallowly.

## Strategic moat

The proprietary structured context the product accumulates:

1. **FlowBands** — craft+skill-specific descriptions of what each flow level feels like
2. **Drivers** — section-level attribution (snowmelt vs dam vs rain vs mixed)
3. **Photos indexed by flow** (phase 2+) — Zoom Flume at 400 vs 800 vs 1500 cfs
4. **ContextItems** — structured extractions from agency bulletins, dam releases, closures
5. **Forecast accuracy history** — per-section per-model error data feeding self-improvement
6. **Interpretive summaries** — LLM-drafted, human-edited, season-aware blurbs

No public API gives you this. Building it well is what differentiates Flow-State from raw NWS / USGS.

## Boundaries that hold across slices

- **Map-first when spatial, dense when scanning, interpretive when single-section.** Don't make every page look the same.
- **Mobile parity is not optional.** People check the app before driving to a river.
- **Editorial > generated.** LLMs draft; humans approve. Especially for safety-relevant content.
- **Heuristic > black-box.** A forecast you can explain beats a forecast that's right but inscrutable. ML joins as a parallel forecaster, not a replacement.
- **Coverage depth > breadth.** Ship one corridor (Arkansas Headwaters) fully modeled before adding shallow coverage elsewhere.
