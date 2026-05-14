# Forecasting philosophy

Forecasting in Flow-State is **a system that evolves**, not a model that ships.

## Principles

### 1. Forecasts are interpretable or they're not useful

A user looking at a chart that says "flow will drop to 280 cfs by Sunday" needs to understand *why* — snowmelt slowing, dam release ending, cold front incoming. Without that, the number is unactionable.

This means heuristics — even crude ones — beat black boxes during development. Each forecast surfaces *which inputs drove it* in plain language. ML can join later as a parallel forecaster, but only once its outputs can be explained alongside.

### 2. Capture inputs before chasing accuracy

The most important thing a v2.0 forecast does is **write down what it knew at predict time**. That's the foundation of every later improvement — section-specific tuning, accuracy attribution, regression detection, model leaderboarding.

A heuristic that captures inputs is more valuable than an LLM that doesn't.

### 3. Driver-conditioned weights, not one-size-fits-all

A snowmelt-dominant section behaves nothing like a dam-fed section. The forecaster reads `section.driver` and applies driver-conditioned weights:

- **Snowmelt-driven**: SWE % median + 7-day temperature forecast + day-of-year × seasonal curve
- **Dam-fed**: latest `DamRelease.outflowCfs` + ContextItem overrides (kind=`dam-release-notice`)
- **Rain-driven**: NWS precip probability + accumulated 72h precip
- **Mixed**: blend, with documented mixing rules per section

Driver classification is editorial, not inferred. Get it right, then forecast against it.

### 4. Self-improvement is a loop, not a feature

Every forecast must be stored alongside its inputs at predict time (`ForecastInput`). When the forecast date arrives, a reconciliation job compares predicted vs observed (`ForecastAccuracy`). Over many forecasts, per-section weights get tuned to minimize error.

This loop runs whether or not anyone looks at it. Accuracy data accumulates from day one. The infrastructure ships before the visualization.

### 5. Run multiple models in parallel; let the data choose

When LLM-assisted forecasting comes online, it runs *alongside* the heuristic, not instead of it. Both write `ForecastOutput` rows tagged with `modelVersion`. Reconciliation scores both. The winner per section, per horizon, becomes the default — but the loser stays running so we can detect when the data shifts.

### 6. Confidence is part of the forecast, not an afterthought

A 7-day forecast with day 6 confidence at 0.4 should *visually* convey that. The chart's confidence ribbon expands as horizon grows. Verbal interpretations say "uncertain" not "rain Friday" when the probability is 35%.

### 7. Heuristics encode known physics; tuning learns the rest

Global rules (e.g., "warmer overnight lows accelerate melt") are hard-coded in `lib/forecast/heuristics.ts`. Section-specific deviations from those globals (e.g., "Browns rises faster per °F than Numbers does") live in a `SectionHeuristic` table that gets tuned nightly from accumulated `ForecastAccuracy` data.

The split matters: known physics shouldn't be re-learned every time. Local behavior must be.

## Five-stage progression

| Stage | What ships | When |
|---|---|---|
| **1. Capture-then-heuristic** | Driver-conditioned heuristic + full input snapshots | Slice 03+04 |
| **2. Reconcile** | Daily ForecastAccuracy job comparing predicted vs observed | Slice 03 |
| **3. Tune** | Per-section weights from accuracy data | Phase 2 |
| **4. Backtest** | Apply heuristics to historical windows; compute analogs | Phase 2 |
| **5. LLM-assist** | Parallel forecaster; flip to LLM per-section once it wins | Phase 3 |

Each stage adds capability without invalidating prior stages. The heuristic stays as a safety net forever.

## What we will NOT do

- **No black-box forecast as the public default**. If we can't explain it, we won't ship it as the answer the user sees.
- **No silent regressions when a new model arrives**. Parallel runs + accuracy comparison are required before any model becomes the default.
- **No hand-tuned magic numbers without recording the win**. If a constant was picked because it worked, document where, when, and how it was validated.
- **No forecasts beyond reasonable confidence horizons** (currently ~7 days; verbal indication for days 4-7).
