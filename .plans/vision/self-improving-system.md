# Self-improving system

The product gets better over time by validating its own predictions and learning from the misses. This document captures the principles; the slice plans contain the schemas and code.

## Invariants

1. **Every forecast records its inputs** — full feature snapshot in `ForecastInput`, keyed to the run. Without this, learning is impossible.
2. **Every forecast gets reconciled** — when the forecast date passes, a row in `ForecastAccuracy` is written automatically. Reconciliation runs whether or not anyone reviews the data.
3. **Models are versioned** — `modelVersion` on every output. Multiple models can run in parallel; accuracy is tracked per model.
4. **Section-specific behavior is data, not code** — per-section weights live in `SectionHeuristic.weightsJson`, not in if/else chains.
5. **Global rules are code, not data** — physics that holds everywhere (warm nights melt snow, dams release on schedules) lives in `lib/forecast/heuristics.ts`.

## The loop

```
   inputs at predict time ──► forecast ──► observed flow ──► accuracy row
        │                                                          │
        │                                                          │
        └─────── tuning job updates per-section weights ◄──────────┘
```

Tuning is bounded: coordinate-descent over recent accuracy data, only updates weights when MAPE improves vs baseline, falls back to globals if there's not enough data.

## Cold-start

The system has no accuracy data on day one. That's fine. Day-one heuristic uses global weights for every section. Tuning kicks in per-section once N=30 forecasts of sufficient horizon have been reconciled — by then, the heuristic has earned the right to localize.

## Detecting regressions

When per-section MAPE rises week-over-week, an alert fires (admin dashboard, eventually email/Slack). Possible causes:

- Model code regression
- Upstream data quality (a gauge offline, NWS grid change)
- Seasonal shift the heuristic doesn't handle
- The world changed (new dam operation, drought regime, basin alteration)

Detection is the first job; diagnosis is the second. The accuracy data tells us *which inputs were available when the forecast missed*, narrowing the search.

## Lessons feed the loop

When a slice reveals a wrong assumption about how the forecast behaves (e.g., "we assumed dam-fed sections were lag-1-day from release; turns out they're lag-3-hours"), it gets a lesson. The lesson either:

- Updates global heuristic rules in `lib/forecast/heuristics.ts`
- Updates the driver classification of affected sections
- Promotes a new input feature to `ForecastInput`

Lessons that change the model also bump the `modelVersion`. Accuracy comparisons across model versions are how we know the change helped.

## What's hard about this

- **Cold-start tuning is unreliable.** N=30 is a heuristic; real validation that tuning helps requires holding out data, which is its own complexity. Phase 2 problem.
- **Tradeoff between adapting fast and overfitting recent noise.** Tuning window length matters. Start at 60 days, document the choice, revisit when it bites.
- **Driver classification can be wrong.** Some sections are seasonally dam-fed but snowmelt-driven during peak runoff. The model needs a way to say "this section's driver depends on date" — phase 3 if it matters.
- **Distinguishing model error from data error is hard.** A forecast that misses by 200 cfs might be wrong, or the gauge might have been malfunctioning. Quality flags on `GaugeReading` matter here.

## Adjacent: backtesting

Backtesting (phase 2) is the same loop run backward. Apply current heuristics to historical input snapshots; compute hypothetical accuracy; compare model variants. This is how we validate that a new heuristic *would have* helped before deploying it. See `slices/03-forecast-snapshot-infra/plan.md` for the substrate; backtesting itself is phase 2.

## Adjacent: historical analogs

Given current `(dayOfYear, currentFlow, currentSwe%, recentTemp)`, find K=5 closest historical windows. Their next-30-day flow traces become a forecast feature *and* a UI element ("flows like this in May 2018 climbed 25% over 5 days"). Phase 2.
