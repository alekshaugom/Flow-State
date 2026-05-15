# L004 — Harper requires static `tables` import; filtered `search` lags after a rolling restart

**Date:** 2026-05-14
**Tags:** debug, surprise, deploy
**Slice:** 01-flowband-browns-fix (post-ship)
**Severity:** high (user-visible: section detail pages showed blank/Unknown flow on Fabric for the first ~10 minutes after deploy, then intermittently afterward)

## The wrong assumption / model

We assumed two things that turned out to be wrong on Fabric:

1. **That `await import('harper')` returns a `tables` proxy equivalent to the one a static `import { tables } from 'harper'` gives.** We adopted the dynamic-import pattern in `lib/flow-bands.ts` so the pure helpers could be tested outside a Harper runtime. Locally it worked.

2. **That `tables.X.search({ conditions: [{ attribute: '...', value: '...', comparator: 'equals' }] })` is data-consistent with `tables.X.search({ conditions: [] })` and with the REST endpoint `/X/?attribute=value` on the same Harper instance.** All three theoretically scan the same table; the indexed-search form should just be a faster variant.

## How it manifested

After deploying slice 01 and seeding 315 FlowBand rows, `POST /Seed`'s own `count(tables.FlowBand)` reported 315 rows present, and `/FlowBand/?sectionId=arkansas-browns-canyon` via REST returned 7 rows for that section, and `Dashboard.get()` (using `tables.FlowBand.search({conditions:[]})`) saw 63 bands per Arkansas section.

But `RiverDetail.get()` consistently returned `flowBands: 0` and `resolvedBand.source: 'legacy-fallback'` for every Arkansas section — even after multiple retries 30+ seconds apart. The `RiverDetail` path went through `loadBandsForSection()` in `lib/flow-bands.ts`, which did:

```ts
const { tables } = await import('harper');
for await (const b of tables.FlowBand.search({
  conditions: [{ attribute: 'sectionId', value: sectionId, comparator: 'equals' as const }],
})) { ... }
```

Two layered problems:

- **The dynamic-imported `tables`** was returning a view that did not see the seeded rows, even though Dashboard's statically-imported `tables` did.
- **Even after switching to a static import**, the filtered `sectionId equals X` search continued to return 0 rows after rolling restarts. An empty-conditions scan on the same table at the same time returned all 315 rows.

The user reported the bug as "current flow no longer showing on section pages" — Lower Roaring Fork's hero stat went blank on the deployed site even though the sidebar list (Dashboard) showed 1,170 cfs for the same section. Same Harper, same request second.

## The right model

- **`tables` from `import { tables } from 'harper'` is bound at module load time** to the Harper runtime context that owns this resource. Dynamic-imported `tables` is not the same proxy and does not see the live data view. There's no documented contract for `await import('harper')` returning a usable `tables`; treat it as undefined behavior and don't rely on it.

- **Indexed `search` paths on Fabric are not data-consistent with full-scan paths during/after a rolling restart.** The window can last minutes. The full-scan path (`conditions: []`) appears to settle first; filtered indexed lookups can keep returning empty for far longer. The full-scan + in-memory-filter pattern is cheaper than it sounds for tables under a few thousand rows and avoids the problem entirely.

## How to recognize the pattern

- Section/detail page reports `flow.current: null` or empty card on Fabric, but the dashboard list shows a value for the same section
- A `tables.X.search({conditions: [...filter...]})` call returns 0 rows, but `/X/?attribute=value` via REST returns the same rows you expect
- The bug appeared *after* a deploy and seed; was not present in local dev
- A "missing" relation/foreign-key lookup that works in dev but not on Fabric, particularly right after `harper deploy_component . restart=rolling`
- Module imports `harper` dynamically (`await import('harper')`) instead of statically

## Mitigation

- **Always `import { tables } from 'harper'` at the top of a module that needs the `tables` proxy.** If a module's pure helpers need to be testable without Harper, extract them into a sibling `*-pure.ts` file (no harper import) and have the harper-using wrapper import from there. We did this for `lib/flow-bands.ts` ↔ `lib/flow-bands-pure.ts`.

- **For small, slowly-changing reference tables (FlowBand, CraftType, future Watershed/Corridor), use a module-scope cache:** load all rows once with empty conditions, cache for a few minutes, filter in memory. Add an explicit `invalidateXCache()` and call it from the Seed action so freshly-seeded data takes effect without waiting on TTL.

- **Never cache an empty result.** *Refinement added 2026-05-15 from slice 03a.* The empty-conditions scan itself can transiently return 0 rows in the seconds immediately after a rolling restart, then heal a moment later. If the cache stores `[]` with `loadedAt = Date.now()`, the next ~TTL window serves nothing even though the data is right there. Treat `out.length === 0` as a cache miss, not a cache hit — only persist the cache when the scan returns at least one row. This burned us on slice 03a's first Fabric verify: weather happened to load on a node that had healed, but snowpack and reservoirs landed empty and got pinned empty for 60s. The fix is one line in the cache wrapper:

  ```ts
  if (out.length > 0) {
    cache.rows = out;
    cache.loadedAt = Date.now();
  }
  ```

- **For larger tables where caching everything is unreasonable**, retry the filtered search a few times after a deploy. Or query by primary key when the access pattern allows it — primary-key reads seem to be unaffected.

- **Always re-seed and verify via `RiverDetail`-style endpoints**, not just via the Seed counts endpoint. The counts use full-scan; user-facing endpoints often use filtered queries that may not yet be consistent. The `flow-bands` seed action now invalidates the FlowBand and Dashboard caches.

- **Add `GaugeSnapshot` fallbacks for current-value reads** when a section has no recent `GaugeReading` in the time-window query — already done in `getFlowData()`. Same principle: when a filtered time-series lookup returns empty, check the denormalized snapshot before declaring the value missing.

## References

- Pure helpers: [lib/flow-bands-pure.ts](../../lib/flow-bands-pure.ts)
- Harper-bound wrapper with in-memory cache: [lib/flow-bands.ts](../../lib/flow-bands.ts)
- Seed action that invalidates caches: [resources/Seed.ts](../../resources/Seed.ts)
- Dashboard cache + invalidation: [resources/Dashboard.ts](../../resources/Dashboard.ts)
- GaugeSnapshot fallback in detail: [resources/RiverDetail.ts](../../resources/RiverDetail.ts) — `getFlowData()`
- Cache wrapper with empty-result guard (slice 03a refinement): [resources/RiverDetail.ts](../../resources/RiverDetail.ts) — `loadAllCached()`
- Commits that walked through the fix: [5bd5896](https://github.com/alekshaugom/Flow-State/commit/5bd5896), [187c90d](https://github.com/alekshaugom/Flow-State/commit/187c90d), [c047180](https://github.com/alekshaugom/Flow-State/commit/c047180)
- Related lesson: [L003](L003-harper-resource-post-signature.md) (Harper `Resource.post()` signature)
- Related lesson: [L001](L001-deploy-worktrees.md) (deploy gotchas)

## Vision implications

Worth adding a one-paragraph principle to [vision/data-model-philosophy.md](../../vision/data-model-philosophy.md): *small reference tables (FlowBand, future Watershed, CraftType) should be loaded once, cached in module scope, and filtered in memory; large time-series tables should be accessed by primary key when possible and use GaugeSnapshot-style denormalized caches for "current value" lookups.* Will fold this in during the next slice if it remains true.
