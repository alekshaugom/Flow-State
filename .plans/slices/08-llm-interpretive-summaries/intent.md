---
slice: 08-llm-interpretive-summaries
status: queued
value: 6
confidence: 6
effort: M
depends_on: [02-watershed-corridor-ia]
unlocks: [10-admin-editorial-ui]
opened: 2026-05-13
closed: null
---

# Slice 08 — LLM interpretive summaries (intent)

## What success looks like

Every watershed, corridor, and section has a 100–200 word interpretive summary that reads like a knowledgeable friend explaining the current state:

> The Arkansas Headwaters is hitting peak season. Snowpack at 105% of median is melting fast in the warm afternoons, and Twin Lakes releases haven't kicked up yet. Browns Canyon is sitting right at the low edge of ideal for paddle rafts; commercial trips are scrubbing but moving. Expect flows to climb steadily through next week as overnight lows stay above freezing.

These get drafted nightly by Claude, queued for admin review, and published once approved.

## What's NOT it

- Not user-facing weather forecasts in prose. Weather is structured data.
- Not a blog. Summaries are *current state and short-term outlook*, regenerated daily.
- Not LLM-as-oracle. The model gets data and produces prose; safety-relevant claims should be auditable.

## Key dependencies

- `InterpretiveSummary` table (defined in data-model-philosophy)
- LLM API access — env vars `LLM_PROVIDER` / `LLM_API_KEY` / `LLM_MODEL` (already wired)
- Admin review surface (slice 10)

## Loose sketch (do not lock in)

- Agent runs nightly per watershed → corridor → section (~100 sections total)
- Each call gets the same structured data package that powers forecasts + the section's current ContextItems
- LLM output goes to `InterpretiveSummary` rows with `status: draft`, `authoredBy: llm-claude`
- Admin reviews + edits + publishes; `status: published` + `editedBy: <user>` + `editedAt`
- Public pages render `published` summaries; show "drafted [date]" subscript

## Open questions for when this becomes active

- Cost ceiling per night — at ~100 sections × ~1K tokens each = pennies. Verify before scaling.
- Prompt format — single system prompt + structured JSON input, or one prompt per scope? Recommend: one prompt template, scope-specific data slot.
- What if no admin reviews for a week? Recommend: auto-publish drafts after 72h if `confidence > threshold`; flag the threshold in admin.
- Anti-hallucination guardrails — summaries should not invent gauge readings or claim closures that aren't in ContextItems. Constrain prompt strictly.

## References that will matter when active

- [vision/forecasting-philosophy.md](../../vision/forecasting-philosophy.md) — interpretability principle
- [vision/ux-direction.md](../../vision/ux-direction.md) — interpretive card primitive
- LLM env vars in [CLAUDE.md](../../CLAUDE.md)
