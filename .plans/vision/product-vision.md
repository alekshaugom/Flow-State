# Product vision

Flow-State is **AllTrails for rivers**: a platform that consolidates freely-available government data into the most consumable form possible, then incentivizes a community to fill the gaps.

The thesis is simple. Governments collect extraordinary amounts of river data — gauges, dam operations, snowpack, flow forecasts — and publish it through interfaces that demand fluency to use. Meanwhile, the human knowledge that makes rivers navigable (access points, campsites, shuttle services, rapid documentation, outfitter intel) exists in scattered forum posts and personal memory. Flow-State consolidates both into one structured, interpretive, spatial experience. Where government data runs out, bounties bring community knowledge in.

## Three challenges

The platform is built around three hard problems:

1. **Accurate on-the-ground information** — access points by type, photos at real flows, campsites linked to permit requirements, shuttle logistics, outfitter reports, rapid lines and hazards. This is dispersed, perishable, and impossible to scrape.
2. **A near-flat, 0-layers-deep presentation** — the right information surfaces for your activity without drilling through nested menus. A rafter and a fly fisherman should each see the river through their own lens, one tap from the top.
3. **Community contribution that's self-governing and financially incentivized** — data quality degrades without a reason to maintain it. Real money, reputation, and community verification are the answer.

## Who it's for

These are capabilities, not tiers. One person can hold multiple roles simultaneously.

| Role | What they can do |
|---|---|
| **Public visitor** (no account) | Read all public river knowledge: flows, conditions, access points, photos, rapid docs |
| **Member** (account) | Everything above, plus manage private trip logs and personal craft/skill profile |
| **Funder / Sponsor** (account + billing) | Fund bounties with real money; advertise bounties targeting specific rivers, corridors, or data types |
| **Contributor** (account + payout account) | Claim bounties, submit data / photos / reports, get paid |
| **Admin** (elevated) | See everything; manage payments, advertise bounties, grant roles, add admins, moderate contributions |

## The two axes

Flow-State remains bipolar by design. **Forecasts look forward; logs look backward.**

The forecast axis answers "should I go?" The log axis answers "what was it like last time, and what has the river looked like across past seasons?" Together they let past experience inform future decisions in a way no public gauge tool can.

The log surface stays deliberately private-first: your trips are yours, sharing is opt-in and friend-by-friend, no feed, no comments, no public profiles. See **Open strategic tension** below.

## Depth first, then breadth

Pre-seed deeply where government data allows. Arkansas Headwaters / AHRA is the reference build: OSM geometry, AP-snap slicing, FlowBands per craft and skill, named rapids, photos indexed by flow. That depth is the template. Don't ship a shallow skeleton for 200 rivers; ship something a boater can rely on for a handful.

After that foundation, crowdsource breadth via bounties — including rivers outside the US. The `WorldRiver` table is the global reference library from which any out-of-US river can be seeded as a fundable stub.

## What Flow-State is NOT

- **Not a gauge viewer.** Raw CFS is necessary but not sufficient — interpretation is the product.
- **Not a generic weather app.** Weather is a forecast input and a UI hint, not a destination.
- **Not bounded social.** Trip logs stay private-first (see tension below), but public community contribution — photos, access points, rapid docs, outfitter listings — is now first-class, not a future phase.
- **Not coverage-maximalist.** A deeply modeled Arkansas Headwaters beats shallow coverage of 500 rivers.

## Open strategic tension

**The relationship between private-first personal logs and the new public community-contribution layer is unresolved by design.**

The existing private-log invariant holds and is not torn out. User trips remain private-first; opt-in sharing stays friend-by-friend. Nothing in the contribution economy requires or coerces public trip data.

But a healthy contribution layer creates pressure over time: should a log entry optionally donate a "ran this at X cfs, conditions Y" data point to the community? Can a contributor's submitted rapid photo overlap with a member's trip log? Can bounties reward verified trip reports?

These questions are real and the answers are consequential. We are not answering them now. This tension is **named and deferred**, slated for a dedicated reconsideration once the contribution economy has shipped and we understand how users actually engage with it. Until then: private logs remain private.

## Strategic moat

The moat is the **community-contributed, bounty-funded structured knowledge base** — and the government data corpus it sits on top of.

1. **FlowBands** — craft+skill-specific descriptions of what each flow level actually feels like
2. **Drivers** — section-level attribution (snowmelt vs dam vs rain vs mixed)
3. **Photos indexed by flow** — Zoom Flume at 400 vs 800 vs 1500 cfs; provenance-tagged
4. **ContextItems** — structured extractions from agency bulletins, dam releases, closures, outfitter reports
5. **Access points and corridor logistics** — typed (trailer ramp, slide rails, carry-in, horse pack-in, fly-in), GPS-accurate, bounty-verified
6. **Rapid documentation** — lines, hazards, class, community-verified at specific flows
7. **Forecast accuracy history** — per-section per-model error data feeding self-improvement
8. **Interpretive summaries** — LLM-drafted, human-approved, season-aware

No public API gives you the combination. Each layer builds on the others, and all of it accumulates over time.

## Principles that hold

- **Map-first when spatial, dense when scanning, interpretive when single-section.** Don't make every page look the same.
- **Mobile parity is not optional.** People check the app before driving to a river.
- **Editorial > generated.** LLMs draft; humans approve. Especially for safety-relevant content.
- **Heuristic > black-box.** A forecast you can explain beats a forecast that's right but inscrutable.
- **Real money from the start.** Bounty payouts, escrow, platform fee, refunds — not a later phase.
