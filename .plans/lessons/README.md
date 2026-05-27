# Lessons

Mistakes that were worked through, written down so the next session benefits from the last one.

This is the **self-learning** half of `.plans/`. Without it, every Claude session re-discovers the same gotchas. With it, the codebase accumulates institutional knowledge.

## When to write a lesson

Write a new lesson when **any** of these happen during work:

- **Debugging took more than one round** of investigation to root-cause
- **The user corrected an assumption** you were operating on
- **A non-obvious constraint surfaced** (a hidden dependency, a framework quirk, a deployment gotcha)
- **A build, deploy, or test failed** because of an interaction not documented anywhere
- **A design decision was reversed** mid-implementation after seeing it in practice

**Don't write a lesson for**:
- Trivial typos or syntax errors
- Things that are obviously already documented (CLAUDE.md, README, a vision doc)
- Normal iteration that didn't surface a hidden truth

The bar: *"a future session would benefit from knowing this before they hit it themselves."*

## How to write a lesson

1. Pick the next available ID — see the index below; if the latest is L007, next is L008
2. Copy `_template.md` to `L00X-short-slug.md`
3. Fill in the template fields
4. Add a one-line entry to the index in this file (under the right tag section)
5. If the lesson contradicts or extends a vision doc, edit the vision doc to reference the lesson ID

## Tags

Every lesson is tagged with one or more:

- **debug** — surfaced during debugging
- **discovery** — surfaced while reading/exploring code
- **correction** — user pointed out an assumption error
- **surprise** — code or system behaved differently than expected
- **design-revision** — a design decision was reversed
- **deploy** — affects build, deploy, or runtime infra

## Index

### deploy
- [L001 — Deploy must exclude worktree build artifacts](L001-deploy-worktrees.md) — `deploy_component` ignores `.gitignore`; stale `web/` dirs in worktrees deploy old assets
- [L002 — Always verify .env edits with hex dump](L002-env-newlines.md) — missing newlines silently break env var parsing
- [L007 — USGS OGCAPI rate-limits sustained backfill traffic](L007-usgs-rate-limit-on-repeat-backfill.md) — running the 410-day backfill twice within 10 minutes 429'd 9 of 34 stations on the second pass; no data loss thanks to composite-ID upserts. Mitigation: wait ~1h between full USGS pulls, or retarget reruns to `sources: ["snotel"]`/etc.

### discovery
- [L003 — Harper `Resource.post()` takes `data` as first argument](L003-harper-resource-post-signature.md) — not `(target, data)` like `put/patch`; mirrors of `get()` signature silently fall through

### debug
- [L004 — Harper requires static `tables` import; filtered `search` lags after a rolling restart](L004-harper-static-import-and-search-after-restart.md) — dynamic-imported `tables` is not data-consistent; filtered `search` returns 0 rows post-restart while full-scan returns all rows. Solution: static import + module-scope cache for small reference tables. **Refinement (2026-05-15):** even the empty-conditions full-scan can transiently return 0 rows immediately post-restart — never cache an empty result, or the bogus `[]` gets pinned for the full TTL.
- [L005 — Harper custom `Resource` class names must not collide with schema `@export` types](L005-harper-resource-class-name-collisions.md) — `class Watershed extends Resource` collides with the auto-generated `/Watershed/` CRUD endpoint from `type Watershed @table @export`. Rename to `WatershedView` / `CorridorView` / `*Detail`.
- [L006 — Third-party API adapters need real-response fixture tests, not just unit tests on assumed shapes](L006-third-party-api-response-shape-verification.md) — three sources (BOR / SNOTEL / NOAA-weather) silently produced zero records each because hardcoded response shapes and catalog IDs went stale. `status: success, recordsProcessed: 0` is the smell. Capture real-response fixtures; runtime-warn on entity-name drift; expose row counts via `DataHealth`.
- [L008 — `npm run dev` may resolve a stray parent-dir `harperdb` instead of the local one](L008-harper-cli-resolution.md) — Homebrew's global `/opt/homebrew/bin/harper` loads `harperdb` via Node's upward module resolution; a stray `/Users/<you>/node_modules/harperdb/` outranks the project's. Symptoms: `Object.defineProperty called on non-object` opening LMDB, `Cannot redefine property: upgrade`, error-trace paths missing your project name. Fix: clean up the stray, bump local harper+rebuild, or skip local dev and deploy to Fabric.

<!-- New entries go above this line. -->

## Promoting a lesson to vision

If a lesson's principle applies broadly (not just to one slice), edit the relevant `vision/*.md` doc to reference it. The lesson stays in `lessons/`; the vision doc summarizes the principle.

Example: if L007 teaches that "all soft-source agents must validate output against schema before writing ContextItem rows," that's a general agent architecture principle — add a paragraph to `vision/data-model-philosophy.md` referencing L007. The lesson file becomes the detailed case study; the vision doc carries the rule forward.

## When a lesson goes stale

If the underlying issue is fixed at the framework/infra level and no longer applies (e.g., a Harper bug got patched), append a "## Status — superseded YYYY-MM-DD" section to the lesson explaining what changed. Don't delete the lesson; the historical context is still useful.
