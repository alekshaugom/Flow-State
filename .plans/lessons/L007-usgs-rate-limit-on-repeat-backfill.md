# L007 — USGS OGCAPI rate-limits sustained backfill traffic

**Date:** 2026-05-15
**Tags:** discovery | deploy
**Slice:** 03c-historical-backfill
**Severity:** medium (correct behavior under one-shot use; surprises only on reruns)

## The wrong assumption / model

A 2-second inter-request delay (`PER_REQUEST_DELAY_MS = 2000`) is sufficient throttling for sustained backfills against any free public API, including USGS Water Services OGCAPI.

## How it manifested

The first 410-day backfill ran cleanly (34 stations, 11,703 rows, 0 errors). The second backfill — fired ~10 minutes later to verify idempotency — got 25 stations clean and **9 stations with `HTTP 429 from .../daily/items?...: Too Many Requests`**. The 9 failures clustered on Yampa / Gunnison-region site codes (09169500, 09171100, 09172500, 09251000, 09260050, 09342500, 09349800, 09357500, 09361500) — likely a per-collection or per-IP token bucket that the first run partially drained and the second run finished off.

SNOTEL, BOR, and Open-Meteo Archive all reran without issue, so the rate limit is USGS-specific, not a generic dev-server problem.

## The right model

USGS OGCAPI has an undocumented but real rate limit (per-IP + per-collection bucket, plausibly leaky-bucket with ~10-minute refill). Two back-to-back 410-day backfills hit it. The bucket clears within a few hours; not a permanent ban.

[`fetchWithRetry`](../../lib/utils.ts) correctly throws on 429 without retrying — hammering a rate-limited API is worse than backing off — so the per-station error surfaces in the orchestrator's `errors[]` and the rest of the run continues. **No data corruption: stations that 429'd kept the rows from the prior successful run** (composite-ID upserts mean failed fetches don't delete anything).

## How to recognize the pattern

- Multi-station backfill where the second run partial-fails with `HTTP 429 from .../daily/items?...: Too Many Requests`
- USGS-only — SNOTEL / BOR / Open-Meteo do not exhibit this
- `lib/jobs/backfill.ts` `errors[]` length jumps between runs while `rowsWritten` drops by ~30%
- Failed stations cluster geographically/by-collection, not randomly

## Mitigation

- **Don't repeat a USGS backfill within 10 minutes**. Wait ~1 hour between full pulls.
- If a partial 429 is observed, **re-run with `sources: ["usgs"]` after a delay** rather than the full multi-source job — the affected USGS stations need to retry only.
- Longer-term: raise `PER_REQUEST_DELAY_MS` for the USGS leg specifically (5s+), or add a 429-aware backoff that sleeps for 60-300s on first 429 and re-queues the station. Don't add an unconditional retry — that defeats `fetchWithRetry`'s 429-throws-immediately policy.
- For long-running idempotency / verification testing: validate against SNOTEL or BOR (no observed limit) rather than re-running USGS.

## References

- [lib/jobs/backfill.ts](../../lib/jobs/backfill.ts) — `PER_REQUEST_DELAY_MS = 2000`, `backfillUsgs()`
- [lib/utils.ts](../../lib/utils.ts) — `fetchWithRetry` 429 short-circuit (line 46-47)
- [lib/adapters/usgs.ts](../../lib/adapters/usgs.ts) — `fetchDaily(siteIds, startDate, endDate)` is the endpoint that 429'd
- Slice [03c plan.md](../slices/03c-historical-backfill/plan.md) — context for the original 2s throttle decision
