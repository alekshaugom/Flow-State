---
slice: 27-multi-domain-abstraction
status: queued
value: 6
confidence: 3
effort: XL
depends_on: [21-contribution-content-model, 25-zero-layers-deep-ia]
unlocks: []
opened: 2026-06-02
closed: null
---

# Slice 27 — Multi-domain abstraction (intent)

## What success looks like

A paddler planning a spring trip checks Flow-State for river conditions on the Arkansas, then taps "Snow" in the domain switcher to see the Sawatch snowpack status, then taps "Dams" to check Pueblo reservoir release projections — all within one coherent app, with the same quality bar and the same contribution economy operating across all three domains. A contributor who has built trust in the Rivers domain does not start from zero in Snow.

The underlying data model and IA are general enough that adding a new domain is a configuration exercise, not a rebuild. The entity types are different (a `SnowStation` is not a `RiverSection`) but the contribution lifecycle, the bounty system, the trust model, and the page IA all reuse the same machinery.

## What's NOT it

- Not a data aggregation site for all outdoor activities — the pivot point is that each domain has structured, quantitative data (flow, SWE, reservoir levels) as its backbone, not just user-submitted text.
- Not a rewrite — this is an abstraction layer over the existing Rivers implementation, generalizing the patterns that already work.
- Not an immediate product priority — Rivers must reach maturity (deep IA, bounties, payments working) before this slice is worth touching.
- Not a separate app per domain — single app, domain switcher in the nav, shared identity/payments/trust infrastructure.

## Why this is intent-only

This is the most under-specified slice in the roadmap intentionally. Confidence is 3/10 because:

1. We do not know which second domain to build until the Rivers domain proves the model works.
2. The abstraction cannot be designed until we can see the full shape of the Rivers-specific code — which requires slices 21–25 to be built and operating.
3. Premature abstraction is the principal risk here. Build the second domain when we understand the first domain deeply, not before.

This intent exists to make a design-influencing claim: **do not build slice 21, 22, 24, or 25 in a way that is irrevocably River-specific**. The schema naming, route structure, and component conventions should be domain-agnostic where it costs nothing.

## Loose sketch (do not lock in)

This sketch is deliberately coarser than other intents. Do not refine it until the Rivers domain is mature.

### What "domain" means

A domain is a collection of:
- A backbone data type with a time-series measurement (flow for Rivers, SWE for Snow, storage level for Dams).
- A geographic entity hierarchy (watershed → corridor → section for Rivers; basin → station for Snow; reservoir for Dams).
- A set of contributable entity types (AccessPoint / Rapid / Shuttle for Rivers; SnowStation / ObservationPost for Snow; Dam / GateSchedule for Dams).
- A set of IA panels on the entity page (the same Plan / Data / Community tab structure from slice 25, with domain-specific content panels).

### Generalization candidates (do not over-engineer now)

- `entityType` on `Contribution`, `Bounty`, `ContentFlag` — already domain-agnostic by construction; keep it that way.
- `DomainContext` React context from slice 25 — this is the abstraction point for domain-specific panel rendering.
- Route namespace: `/rivers/...`, `/snow/...`, `/dams/...` — if slice 25 establishes the namespace, this slice just adds new inhabitants.
- Identity, payments, trust — fully domain-agnostic by design (no Rivers-specific fields in those schemas).

### Domains in rough priority order (when the time comes)

1. **Dams** — already partially modeled (`DamRelease`, `ReservoirReading`). Lowest lift for the second domain.
2. **Snow** — `SnotelReading` already ingested. Basin → station hierarchy exists.
3. **Avalanche** — no existing data model. Highest lift; most speculative.

## Open questions for when this becomes active

- **Which second domain triggers this slice?** The answer should come from user research: what do river paddlers want to see on the same platform that they cannot get elsewhere? Probably Dams (reservoir release schedules) given how much dam management affects river flow.
- **Shared vs domain-specific contribution types.** Can a single contributor account accumulate trust across Rivers and Dams simultaneously? Yes — trust is about the person, not the domain. But domain-specific verification (a dam engineer vs a paddler) may warrant domain-scoped trust tiers.
- **Routing strategy.** If we add domain namespacing in slice 25, this slice is a URL and panel extension. If we deferred it, we pay the migration cost here. Strongly recommend the namespace in slice 25.
- **Team specialization.** Different domains may attract different contributors. Avalanche is safety-critical in a way that river flow data is not — moderation standards may need to be domain-specific.

## References that will matter when active

- `.plans/slices/25-zero-layers-deep-ia/intent.md` — the `DomainContext` scaffold and URL namespace established there.
- `.plans/slices/21-contribution-content-model/intent.md` — the `Contribution` / `entityType` generalization this slice relies on.
- `.plans/vision/information-architecture.md` — the domain-switcher IA and the principle that each domain follows the same zero-layers page structure.
- `.plans/vision/product-vision.md` — the strategic thesis: rivers-first, design for adjacent domains.
- Existing domain-adjacent schemas: `schemas/dam-release.graphql`, `schemas/snotel-reading.graphql` (if exist) — the existing backbone data that future domains would promote to first-class status.
