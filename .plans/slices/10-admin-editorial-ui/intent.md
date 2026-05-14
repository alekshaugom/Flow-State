---
slice: 10-admin-editorial-ui
status: queued
value: 6
confidence: 8
effort: M
depends_on: [01-flowband-browns-fix, 08-llm-interpretive-summaries]
unlocks: []
opened: 2026-05-13
closed: null
---

# Slice 10 — Admin editorial UI (intent)

## What success looks like

The existing `/admin` page grows from a seed/waitlist tool into the editorial backbone: edit FlowBands per section, review/edit/publish LLM-drafted summaries, moderate ContextItems, view forecast accuracy.

Admins can change copy, fix bad bands, and approve LLM drafts without a redeploy or a database client.

## What's NOT it

- Not a user-facing CMS. Admin-only until vetted-guide accounts ship (phase 3).
- Not a full WYSIWYG. Markdown editors are fine.
- Not an analytics dashboard. Forecast accuracy is a single table, not a viz suite.

## Key dependencies

- FlowBand table populated (slice 01)
- InterpretiveSummary table + LLM drafts (slice 08)
- ContextItem table + ingestion (slice 09)
- ForecastAccuracy data accumulating (slice 03)

## Loose sketch (do not lock in)

Add tabs to `app/src/pages/AdminPage.tsx`:

- **FlowBands** — per-section table editor; add/edit/delete rows; preview band chip live
- **Summaries** — list of LLM-drafted summaries pending review; edit Markdown, preview, publish; option to trigger re-draft
- **ContextItems** — list of pending items (status: pending review); approve/reject/edit
- **Forecast Accuracy** — read-only table: section × model × horizon → MAPE + sample count

## Open questions for when this becomes active

- Auth model — current admin is OAuth-gated; do we need finer-grained permissions (editor vs admin)? Recommend: not yet, until guide accounts ship.
- Editing UI — table inline editor or modal form? Recommend: table inline for bands, modal for summaries (because they're long).
- Audit log — store `editedBy/editedAt` on rows; surface in admin as a side panel? Recommend: yes, cheap.
- Bulk operations — accept/reject all pending in a watershed? Defer until volume justifies.

## References that will matter when active

- Existing admin: [app/src/pages/AdminPage.tsx](../../app/src/pages/AdminPage.tsx)
- OAuth integration: [resources/auth-hooks.ts](../../resources/auth-hooks.ts)
