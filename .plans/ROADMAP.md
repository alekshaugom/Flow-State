# Roadmap

Single source of truth for what ships next. Sorted by value × confidence ÷ effort, respecting dependencies and explicit user priority. Frontmatter in each slice's `plan.md` / `intent.md` is the authoritative metadata — this file is a rendered view.

**Last updated:** 2026-06-14
**Active slice:** **03b-forecast-snapshot-infra** — flow forecasting pulled forward (see *Flow forecasting* below); forecasts keyed **per gauge**. Build NOT yet started — handoff to next session. 30-design-overhaul moved to in-review (major design overhaul shipped; resume remaining polish later).
**Next up:** **04-driver-conditioned-forecaster** → **05-history-forecast-chart** (the forecasting build); then resume 30 polish, **24-trust-reputation-governance**, **25-zero-layers-deep-ia**.
**New direction (2026-06-14):** flow forecasting on all corridor + section pages, predicted **per gauge** — see *Flow forecasting* below.
**Prior direction (2026-06-11):** evolve the **Trips** tab into **Guides** (slice 31) — see *Guides evolution* below.

---

## v2 re-foundation (2026-06-02)

Flow-State is pivoting from a personal flow-tracking tool to **AllTrails for rivers**: a platform where free government data provides the quantitative backbone, and a real-money bounty economy incentivizes a community to fill the qualitative gaps (access points, rapid notes, shuttle logistics, outfitter contacts) that no government agency collects.

Five user capabilities replace the old tier model: **public visitor**, **member**, **funder/sponsor**, **contributor**, and **admin**. Real money flows from the start — funders post bounties, contributors earn payouts, the platform takes a fee.

The v2 foundation is documented in three new vision files:

- `.plans/vision/product-vision.md` — the full strategic thesis, open tensions, and competitive framing
- `.plans/vision/contribution-economy.md` — the bounty lifecycle, incentive design, and self-policing governance model
- `.plans/vision/information-architecture.md` — the zero-layers IA, domain-switcher scaffold, and page-anatomy principles

The slices below reflect this pivot. The v2 strategic spine (20 → 21 → 22 → 23 → 24 → 25) is the top priority. The still-valid river-depth slices (03b → 03d → 04 → 05 → 06 → 07 → 08 → 09) follow — they deepen the quantitative backbone that makes the platform worth using. The far-horizon v2 slices (26 → 28 → 27) close the queue.

---

## Guides evolution (2026-06-11)

The design overhaul (slice 30) shipped a **Trips** tab as a thin outfitter listing + mock booking. The next directional shift renames and deepens it into **Guides** — the app's people-and-commerce layer. The 4-tab IA becomes **Rivers · Guides · Log · Profile**.

Guides holds the full spectrum of river people: commercial **outfitters** lead the directory, but **individual guides** get profiles too — including private boaters affiliated with an outfit (named or anonymous) and *former* guides whose company affiliations are **time-bounded** (start/end dates on both sides). Everyone who wishes to contribute is, in some sense, a guide; the line between guide, contributor, and private boater is a continuum a person moves along over time. For those who opt in, the app keeps a rich longitudinal history of a life on the water. Profiles seed as open stubs; a **claim-ownership** flow lets a real operator or person take control of theirs. This is the app's **commercialization surface** — and the governing principle is that the **river data stays free and open**; only the people/commerce layer monetizes.

This is also the most natural **bridge** for the named-and-deferred private-vs-public tension in `vision/product-vision.md`: the guide spectrum is how a private boater opts *into* a public history on their own terms, without coercing any private log open.

Captured as slice **31-guides-section** (intent). The deeper "why" — that Flow-State exists to grow **love for river systems** (water is life; care follows love; pollution is solved downstream of it) — is now recorded as the **North star** in `vision/product-vision.md`.

---

## Flow forecasting (2026-06-14)

The user pulled the **river-flow forecasting** initiative forward, ahead of the queue: forecasts on all corridor + section pages. It was already queued as **03b** (snapshot/reconciliation infra) → **04** (driver-conditioned forecaster) → **05** (history+forecast chart); these are now the priority and **03b is active**. The existing `ForecastPipeline` is a stub (`model: 'stub-v1'`, linear projection) to be replaced.

**The one architecture decision: predict per GAUGE, not per section.** A corridor with 3 gauges → 3 forecasts; each section reads its `primaryGaugeId`'s forecast; the corridor hero extends its existing gauge-toggle chart forward (history → dashed forecast + widening confidence band). Re-key ForecastRun/ForecastInput/ForecastAccuracy around `gaugeId` (DailyGaugeRollup is already gauge-keyed). Regime-routed by `RiverSection.driver`, so mixed-regime corridors (a gauge above vs below a dam) get the right method each.

**Phasing:** v1 = per-gauge **nowcast** (1–7d) = persistence + Open-Meteo melt/precip + observed releases (BOR/USGS/CDSS) + diversion telemetry — no new data sources. Phase 2 = seasonal: ingest free federal OUTPUTS (NOAA National Water Model on AWS; CBRFC west-slope / MBRFC east-slope / NRCS *unregulated* water-supply forecasts) as priors/features + elevation-zoned SWE regression + a random-forest-on-ESP-mean layer (Woodson 2024). Phase 3 = LSTM (NeuralHydrology) once history is accumulated.

**Hard constraints (deep-research, 2026-06-14 — memories `flow_state_forecast_research` + `flow_state_forecast_architecture`):** use federal model **outputs** (public domain, free, redistributable); do NOT run/embed **WRF-Hydro** (UCAR license forbids embedding) or **airGR** (GPL-2) — the algorithms (SNOW-17/SAC-SMA/GR4J) are public-domain math, reimplement if needed; avoid **PRISM** commercially (use Daymet/gridMET); the app spans **two RFCs** — CBRFC (west slope) + MBRFC (Arkansas/South Platte/Poudre east slope). **LLM for the narrative only, not the CFS numbers.**

---

## In-review

| # | Slice | Value | Goal |
|---|---|---|---|
| 30 | [design-overhaul](slices/30-design-overhaul/plan.md) | 13 | Major 4-tab IA redesign + corridor/section tile-completion + map dam ticks/basin clustering shipped. Paused 2026-06-14 to pull forward flow forecasting; resume remaining design polish after the forecast v1. |

---

## Active

| # | Slice | Value | Effort | Goal |
|---|---|---|---|---|
| 03b | [forecast-snapshot-infra](slices/03b-forecast-snapshot-infra/plan.md) | 8 | M | **Per-gauge** forecast substrate — gauge-keyed ForecastRun/Input/Accuracy + DailyGaugeRollup + reconciliation. First slice of the pulled-forward forecasting initiative (see *Flow forecasting* above). Build not yet started; handoff to next session. |

> **Partial overlap note (2026-06-07):** the tile-completion work in slice 30 delivered partial coverage of two queued slices — `DailyGaugeRollup` (gauge percentile/historic-context infra) overlaps **03b** (forecast-snapshot-infra), and corridor-level snowpack surfacing overlaps **03d** (snowpack-confidence-and-audit). Those slices are NOT done — they have broader scope — but a future session should check what work can be skipped.

### Paused

| # | Slice | Value | Effort | Goal |
|---|---|---|---|---|
| 24 | [trust-reputation-governance](slices/24-trust-reputation-governance/intent.md) | 8 | L | Flags, community verification/voting, reputation tiers, moderation queues, trust-weighted auto-acceptance. **Paused mid-flight** for user-prioritized 29 — governance backend (Phase A) landed; resume from the frontend/UX phase. |

---

## Queued — v2 strategic spine

These slices are the foundation of the contribution economy. Each unlocks the next; do not skip or reorder.

> **Ordering caution:** real-money extraction (slice 23) should not be enabled at volume before slice 24 (trust/reputation/community verification) lands — slice 24 removes the single-admin-reviewer dependency and adds the sybil resistance needed to make cash-out safe.

| # | Slice | Value | Confidence | Effort | Depends | Goal |
|---|---|---|---|---|---|---|
| 25 | [zero-layers-deep-ia](slices/25-zero-layers-deep-ia/intent.md) | 8 | 5 | L | 21 | Flat section page surfacing all qual + quant inline by activity (Plan / Data / Community tabs). Domain-switcher scaffold (rivers the only populated domain). Reference `.plans/vision/information-architecture.md`. |

---

## Queued — river depth (still-aligned slices)

These slices deepen the quantitative backbone — the flow data, forecasts, and snowpack context that make the platform worth trusting. They remain valid and can be interleaved with or after the v2 spine.

| # | Slice | Value | Confidence | Effort | Depends | Goal |
|---|---|---|---|---|---|---|
| 03b | [forecast-snapshot-infra](slices/03b-forecast-snapshot-infra/plan.md) | 8 | 8 | M | 03c | ForecastInput + ForecastAccuracy + DailyGaugeRollup; daily reconciliation; no UI yet. Deferred from active 2026-05-18 to run river-log series first. |
| 03d | [snowpack-confidence-and-audit](slices/03d-snowpack-confidence-and-audit/plan.md) | 8 | 7 | M | — | Audit all 12 Colorado basins (fix bad station triplets); enrich snowpack tile with current + historic SWE side-by-side, 30-day sparkline, freshness badge, per-station expand. |
| 04 | [driver-conditioned-forecaster](slices/04-driver-conditioned-forecaster/plan.md) | 8 | 7 | M | 03b, 03c | Driver-conditioned heuristic forecaster using snowpack + weather + dam releases per section's `driver` field. |
| 05 | [history-forecast-chart](slices/05-history-forecast-chart/plan.md) | 9 | 8 | M | 03a, 03b, 04 | Single chart with history + present + forecast + weather strip + band-crossing interpretation. |
| 06 | [map-layering](slices/06-map-layering/plan.md) | 7 | 7 | M | 02 | Tile providers, zoom-adaptive layers, watershed/corridor focus deep-links. |
| 07 | [drivers-and-context-ui](slices/07-drivers-and-context-ui/intent.md) | 7 | 7 | M | 02, 03a, 04 | Surface *why* flows are what they are — driver attribution + ContextItem cards. |
| 08 | [llm-interpretive-summaries](slices/08-llm-interpretive-summaries/intent.md) | 6 | 6 | M | 02 | Nightly LLM-drafted watershed/corridor/section summaries with editorial review. |
| 09 | [llm-bor-bulletin-pilot](slices/09-llm-bor-bulletin-pilot/intent.md) | 5 | 5 | L | 07 | One LLM ingestion source (Twin Lakes) emitting structured ContextItems. |
| 13b | [multi-section-logs](slices/13b-multi-section-logs/plan.md) | 8 | 8 | M | 13c | Add `putInAccessPointId` + `takeOutAccessPointId` to `RiverLog`; sections traversed derive from AP mile range. SectionLogs returns any log whose AP mile range overlaps. Backwards-compatible with existing single-section logs. |

---

## Queued — far horizon (v2 extension slices)

These slices require the full v2 spine to be live before they are actionable. Intents only — deliberately under-specified.

| # | Slice | Value | Confidence | Effort | Depends | Intent |
|---|---|---|---|---|---|---|
| 26 | [global-coverage-bounties](slices/26-global-coverage-bounties/intent.md) | 7 | 5 | M | 22, 23 | Use existing `WorldRiver` table → fundable bounties to seed brand-new rivers anywhere (incl. outside US); pre-seed where gov data exists. |
| 28 | [sponsor-admin-governance-console](slices/28-sponsor-admin-governance-console/intent.md) | 7 | 5 | L | 22, 23, 24 | Funder/sponsor dashboard, bounty advertising, payment management, role/admin management, moderation tools. Absorbs old slice 10. |
| 27 | [multi-domain-abstraction](slices/27-multi-domain-abstraction/intent.md) | 6 | 3 | XL | 21, 25 | Generalize entities + IA to additional domains (dams/snow/avalanche). Lowest priority, design-influencing only. Most under-specified slice by design. |
| 31 | [guides-section](slices/31-guides-section/intent.md) | 9 | 5 | L | 30 · soft 23/24 | Evolve the **Trips** tab into **Guides**: outfitter + individual-guide profiles, time-bounded affiliations & guide history, claim-ownership flow. The app's commercialization surface — river data stays free; only the people/commerce layer monetizes. Bridges the private-vs-public tension. |

---

## Deferred

These slices are paused, not killed. Reasons are noted; frontmatter is set to `status: deferred`.

| # | Slice | Reason |
|---|---|---|
| 23 | [payments-marketplace](slices/23-payments-marketplace/plan.md) | Parked (2026-06-03): launch on interim karma economy (23b) first; real Stripe money + compliance is a two-way street (Lane A code + Lane B user legal/compliance), reactivated when trust (24) is live + lawyer signs off on escrow/payout. |
| 10 | [admin-editorial-ui](slices/10-admin-editorial-ui/intent.md) | Superseded/absorbed by slice 28-sponsor-admin-governance-console (v2 re-foundation 2026-06-02). |
| 11 | [rapid-stub-pages](slices/11-rapid-stub-pages/intent.md) | Superseded/absorbed by slice 21-contribution-content-model (v2 re-foundation 2026-06-02). |
| 12c | [river-log-sharing](slices/12c-river-log-sharing/intent.md) | Blocked on the private-logs ↔ public-community strategic reconsideration (see product-vision.md 'Open strategic tension'). Do not kill; may be repurposed when that tension resolves. |
| 12f | [trip-photos](slices/12f-trip-photos/intent.md) | Blocked on same private-logs strategic reconsideration as 12c. Do not kill. |
| 12g | [trip-sparkline-and-map](slices/12g-trip-sparkline-and-map/intent.md) | Blocked on same private-logs strategic reconsideration as 12c. Do not kill. |

---

## Completed

| # | Slice | Closed | Notes |
|---|---|---|---|
| 29 | [design-system-refresh](completed/29-design-system-refresh/plan.md) | 2026-06-07 | Superseded by 30-design-overhaul; the Manrope/Inter/Spline + OKLCH token foundation shipped and was folded into 30's IA rebuild. |
| 23b | [karma-economy](completed/23b-karma-economy/plan.md) | 2026-06-03 | Relabeled the slice-22 credit economy as karma (✦, whole points, no $, "Not money" framing); ledger backbone untouched + real-money-grade. App launch-ready without real money; slice 23 (real Stripe payments) parked as a two-way code+compliance street. Display-only reframe, 451 tests green. |
| 22 | [bounty-system](completed/22-bounty-system/plan.md) | 2026-06-03 | Bounty lifecycle + internal credit economy in credits (no real money). Append-only LedgerEntry spine (balance=signed sum, no-overdraft, escrow conservation), multi-funder pots, self-fulfillment (reviewer≠submitter), award verifies the linked contribution + credits the awardee, re-spendable balance, profile WalletPanel + admin grants. 451 tests, browser-verified. Unlocks 23/24/28. |
| 21 | [contribution-content-model](completed/21-contribution-content-model/plan.md) | 2026-06-03 | Versioned Contribution provenance spine + 4 contributable entity types (AccessPoint, Rapid, ShuttleBusiness, Outfitter) via one generic entity registry. Verification state machine, canContribute capability, inline surfacing on section tiles (no routes, per IA vision), provenance badges. 390 tests green, browser-verified. Media/photos deferred. Unlocks bounties (22), trust (24), IA (25). |
| 20 | [identity-roles-capabilities](completed/20-identity-roles-capabilities/plan.md) | 2026-06-02 | Capability model replacing the binary approved/email-admin gate. Pure resolveCapabilities() (isMember/isAdmin + canContribute/canFund/canReceivePayout stubs), role on WaitlistUser, /Me capabilities, admin-gated grant-role/revoke-role, <RequireCapability>, AppHeader pure-role cutover (ADMIN_EMAILS removed), bootstrap-admins seed. 308 tests green, live-verified. Unlocks the v2 bounty spine. |
| 13c | [corridor-map-and-tiles](completed/13c-corridor-map-and-tiles/plan.md) | 2026-06-02 | MapLibre basemap + scroll-driven section tiles on /corridor/arkansas-headwaters, browser-verified on real USGS data. Donut gauges, navy river + halo, scroll-tracked position dot, click-to-expand full section detail inline, mobile parity. Other corridors keep the 13a spine fallback. |
| 13a | [river-corridor-spine](completed/13a-river-corridor-spine/plan.md) | 2026-05-27 | 11/11 acceptance criteria met. Shipped vertical SVG spine for `/corridor/:slug` on both Arkansas + Upper Colorado, hierarchical sections (Pine Creek under Numbers, Upper/Lower Browns under Browns Canyon, +6 new Arkansas sections), scroll-driven activeMile with child-over-parent precedence, sticky compact detail pane with primary-gauge lock per section. Pure helpers: `corridor-spine-pure.ts` (23 tests) + `corridor-assembly-pure.ts` (5 tests). Visually superseded by 13c on `/corridor/arkansas-headwaters`; remains the fallback for every other corridor. |
| 12m | [log-card-density](completed/12m-log-card-density/plan.md) | 2026-05-18 | Visual density pass on `<RiverLogCard>`. Dropped the craft-type chip and the `3.5h` duration. Replaced inline CFS chip with `<BigCFS size="card" />` + `<StatusPill size="sm" />`. Conditions tag chips moved to last body block. Threaded full `flowThresholds` through `DetailViewModel` + `PastTripsStrip`. 203/203 tests green. |
| 12l | [card-and-flow-polish](completed/12l-card-and-flow-polish/plan.md) | 2026-05-18 | PastTripsStrip moved to bottom of `/section/:id`. RiverLogCard eyebrow reformatted. Flow CFS auto-populates via `GaugeReading` fallback. Fixed Harper read-only proxy bug (`Object.assign` on proxy → spread fix). 203/203 tests green. |
| 12k | [saved-craft-only](completed/12k-saved-craft-only/plan.md) | 2026-05-18 | Dropped redundant `// CRAFT` fieldset; craftId now required on submit. 185/185 tests green. |
| 12j | [admin-users-tab](completed/12j-admin-users-tab/plan.md) | 2026-05-18 | Merged Waitlist + Auth admin tabs into single Users tab. Invite form takes email + first + last only. `delete-user` hard-purges all user data. 185/185 tests green. |
| 12i | [account-activation](completed/12i-account-activation/plan.md) | 2026-05-18 | One-time login link consume returns `hasPassword`; routes to `/login/setup`. Fixed `buildLoginUrl` localhost http bug. Fixed stale-session guard. 176/176 tests green. |
| 12h | [admin-invite-user-ui](completed/12h-admin-invite-user-ui/plan.md) | 2026-05-18 | `+ Invite user` form added to admin Auth tab. Backend: `invite-user` action with duplicate guard. 171/171 tests green. |
| 12d | [email-auth](completed/12d-email-auth/plan.md) | 2026-05-18 | `UserCredential` (scrypt-v1) + `OneTimeLoginToken` schemas. `EmailLoginResource` + `AdminAuthResource`. Constant-time dummy hash on missing rows. 156/156 tests green. |
| 12e | [saved-crafts](completed/12e-saved-crafts/plan.md) | 2026-05-18 | `UserCraft` schema + `craftId` on `RiverLog`. `UserCraftResource` with CRUD + ownership 403s + atomic default-promotion. `/logs/crafts` management page. 122/122 tests green. |
| 12b | [river-log-watershed-browse](completed/12b-river-log-watershed-browse/plan.md) | 2026-05-18 | `/logs` surface with watershed + year accordion views. Multi-day schema (`endDate` + `campingJson`). `MultiDayDateField` component. 103/103 tests green. |
| 12 | [river-log-core](completed/12-river-log-core/plan.md) | 2026-05-18 | Trip-logging foundation. `RiverLog` + `UserProfile` schemas. `/log/new`, `/log/:id/edit`, `/section/:id/logs`, `/profile` pages. 81/81 tests green. |
| 03c | [historical-backfill](completed/03c-historical-backfill/plan.md) | 2026-05-15 | 38,799 rows backfilled (2025-03-31 → 2026-05-15) across USGS / SNOTEL / BOR / WeatherObservation. 45/45 tests green. |
| 03a | [data-integrity-sweep](completed/03a-data-integrity-sweep/plan.md) | 2026-05-14 | Fixed BOR + SNOTEL ingestion. Switched weather to Open-Meteo. DataHealth smoke endpoint. Deployed to Fabric. |
| 02b | [watershed-corridor-refinements](completed/02b-watershed-corridor-refinements/plan.md) | 2026-05-14 | sortIndex on RiverSection + RiverCorridor; watershed page redesigned with stacked corridor cards. Deployed to Fabric. |
| 02 | [watershed-corridor-ia](completed/02-watershed-corridor-ia/plan.md) | 2026-05-14 | Watershed + RiverCorridor schemas; 8 watersheds + 20 corridors seeded; /watershed/:slug + /corridor/:slug routes. |
| 01 | [flowband-browns-fix](completed/01-flowband-browns-fix/plan.md) | 2026-05-14 | FlowBand schema + 315 seeded rows; global Craft/Skill context; Browns at 396 correctly reads "Runnable (technical)". |
| 00 | [v1-foundation](completed/00-v1-foundation.md) | 2026-05-13 | Harper backend, ingestion worker, custom SVG charts, Leaflet map, ForecastPipeline stub. |

---

## Methodology

**Value (1-10)**: impact on users + strategic importance. 10 = canonical broken thing or unlock for many other slices. 1 = nice-to-have polish.

**Effort**: S = under a week, M = 1–2 weeks, L = 2–4 weeks, XL = 4+ weeks. Anything XL should be broken down.

**Order**: highest-value, dependency-free slice goes first. Where ties exist, prefer the slice that *unlocks* more downstream slices. Explicit user direction can override the formula for a multi-slice initiative.

**Promoting an intent to a plan**: when an intent reaches the top of the queue and is about to become active, expand it into a `plan.md` **in the context of the actual codebase as it stands then**. Don't lock down details from this side of the dependency wall.
