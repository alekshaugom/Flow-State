---
slice: 09-llm-bor-bulletin-pilot
status: queued
value: 5
confidence: 5
effort: L
depends_on: [07-drivers-and-context-ui]
unlocks: []
opened: 2026-05-13
closed: null
---

# Slice 09 — LLM ingestion pilot: BOR Twin Lakes bulletin (intent)

## What success looks like

When BOR posts an update about Twin Lakes / Turquoise Lake release operations (HTML page, RSS, or PDF), a scheduled agent detects the change, calls Claude to extract structured data, emits a `ContextItem` with `scope=reservoir, scopeId=twin-lakes, kind=dam-release-notice`, and that ContextItem automatically surfaces on the Arkansas Headwaters corridor page and downstream section pages.

The blast radius is intentionally tiny: one source, one reservoir, one kind of extraction. If the pattern works, replicate to McPhee, Ruedi, Pueblo bulletins in phase 2.

## What's NOT it

- Not a generic web scraper. This is one source with a known format.
- Not autonomous publishing. Extracted ContextItems land in admin review first (eventually auto-publish high-confidence items).
- Not user-facing yet (until ContextItem display ships in slice 07).

## Key dependencies

- `ContextItem` table and resolution (slice 07)
- `ExternalReport` table for raw fetched docs (designed; defined in this slice)
- Admin review for extracted items (slice 10)
- LLM API access (same as slice 08)

## Loose sketch (do not lock in)

- New agent in `lib/agents/bor-twin-lakes-bulletin.ts`
- Polls a known URL (RSS or HTML) on 6h interval
- Compares fetched-content hash to last seen; skips if unchanged
- On change: store raw text/HTML in `ExternalReport` row
- Call Claude with strict JSON schema in system prompt:
  > "Extract: reservoirName, effectiveFrom (ISO date), effectiveTo (ISO date or null), expectedOutflowCfsDelta (signed int), operationKind (`scheduled` | `flood-control` | `maintenance` | `emergency`), severity, summary (1 sentence)."
- Validate output; if valid, write `ContextItem` row
- Idempotent via hash; supersede previous items with same `(scope, scopeId, kind)`
- Log model + prompt hash + token usage on `ExternalReport`

## Open questions for when this becomes active

- Does Twin Lakes have a clean RSS feed or only HTML? Research first.
- Format stability — if BOR changes their bulletin format, the agent must fail safe (log error, don't write garbage ContextItems).
- Auto-publish threshold — confidence > 0.9 maybe? Otherwise admin review.
- Rate limiting / cost — 6h polling × 1 source = 4 fetches/day. Trivial.

## Why this is "intent" not "plan"

The source format isn't yet researched. The exact prompt and JSON schema can't be locked in until we see real bulletins. When this slice becomes active, the first step is research — confirm the source, sample 5 real bulletins, design the extraction schema, then write the plan.

## References that will matter when active

- [vision/data-model-philosophy.md](../../vision/data-model-philosophy.md) — ContextItem is the unifier
- [vision/forecasting-philosophy.md](../../vision/forecasting-philosophy.md) — LLM for extraction, not generation
- BOR data sources: research at https://www.usbr.gov/uc/water/index.html
