# Contract for AI sessions

If you are an AI session (Claude or otherwise) about to do work on Flow-State, this is your operating manual. Follow it like a checklist.

## Session shape: two phases, auto within each

**This rule applies to every session, regardless of context window, model, or how you were invoked.**

Every coding session on Flow-State is structured as exactly two phases:

### Phase 1 — Plan

- Read the system (`README.md`, `ROADMAP.md`, active slice's `plan.md` + `status.md`, relevant lessons).
- If the active slice already has a complete `plan.md`: review it, verify that file paths and symbol names still match the current codebase, and refine any sections that have drifted. Do not wait for the user to prompt each step.
- If the active slice has only an `intent.md` (or nothing): expand it into a full `plan.md` now — goal, file-by-file changes, schema additions, acceptance criteria, verification steps, frontmatter — reading the actual files to ground the plan in the real codebase state. Do not plan from memory or assumptions.
- **Drive to a complete plan autonomously.** Do not stop for incremental sign-off on individual sections. Read, think, write.
- **Surface the finished plan and pause.** The one mandatory human checkpoint is here: show the plan, ask for confirmation before building. State clearly that you are ready to execute pending approval.

### Phase 2 — Execute

- Only begin after the user confirms the plan (or explicitly says to proceed).
- Build the slice per the plan, file by file.
- Update `status.md` as you go (sub-tasks started, blockers hit, meaningful chunks finished).
- Write `decisions.md` entries and lessons as they arise — do not batch them for the end.
- **Drive to the acceptance criteria autonomously.** Do not stop mid-execution to ask "should I proceed?" on routine implementation steps. Only pause if you hit a genuine blocker that requires a decision only the user can make (missing credential, ambiguous requirement that changes the design, discovered dependency that wasn't in the plan).
- When all acceptance criteria are met, run verification and report results.

### The rule in one sentence

**Auto is ON within each phase; the only default checkpoint is the Plan→Execute boundary.**

Do not confuse "I'm being thorough" with "I should ask for approval." Thoroughness means reading carefully and building correctly. It does not mean stopping every few steps.

## Before any work — read these

1. [README.md](README.md) — what this system is
2. [ROADMAP.md](ROADMAP.md) — what's queued
3. The active slice's `plan.md` and `status.md` — what's in flight
4. Scan [lessons/](lessons/) titles for anything that might apply to the current work
5. The relevant `vision/*.md` doc(s) — for principles that constrain the work

You can skip vision docs only if the active slice is purely mechanical (e.g., a typo fix or a renaming pass).

## Finding the active slice

```bash
grep -l "^status: active$" .plans/slices/*/plan.md .plans/slices/*/intent.md 2>/dev/null
```

There should be exactly one match. If zero, the queue has stalled — pick up the next queued slice (lowest number with no blocked dependencies) and follow the **Expanding an intent into a plan** protocol below. If more than one, that's a bug; the user should resolve before you proceed.

## During work — keep status.md fresh

Update `status.md` in the active slice whenever:

- You start a new sub-task
- You hit a blocker
- You make a decision worth recording (write into `decisions.md`)
- You finish a meaningful chunk

Status entries are dated bullets. Keep it terse — this is for handoff to the next session, not a diary.

```markdown
## 2026-05-13
- Started slice
- Schema `FlowBand` defined and migration verified locally
- Decision: precedence rule is exact → craft-only → any-craft. See decisions.md
```

## When you hit a problem — write a lesson

A lesson goes in `lessons/L###-slug.md` (next available number). **Write it when**:

- Debugging took more than one round to root-cause
- The user corrected an assumption you were operating on
- A non-obvious constraint surfaced
- A build/deploy/test failed because of an interaction not documented anywhere
- A design decision was reversed mid-implementation

**Don't write a lesson for**: trivial typos, syntax errors, anything obviously already in the lessons index, or normal iteration that didn't surface a hidden truth.

Use [lessons/_template.md](lessons/_template.md) verbatim. Tag it (`debug | discovery | correction | surprise | design-revision`). Then add a one-line entry at the top of [lessons/README.md](lessons/README.md).

## When a slice ships — advance the queue

1. Confirm acceptance criteria from `plan.md` are all met
2. Run verification steps from `plan.md` and record results in `status.md`
3. Write a closing entry in `status.md` (today's date, "Closed: ...")
4. Review `decisions.md` — if anything is universally applicable, promote to a lesson or a vision doc
5. Update frontmatter: `status: done`, `closed: YYYY-MM-DD`
6. Move the slice directory: `mv .plans/slices/NN-slug .plans/completed/NN-slug`
7. Pick the next queued slice (highest value, no blocked deps)
8. Update its frontmatter: `status: active`
9. **If it was an intent.md, expand it into a plan.md** (see below)
10. Update [ROADMAP.md](ROADMAP.md) — move rows, update "Active slice" pointer, refresh "Last updated"

## Expanding an intent into a plan

When an intent reaches the top of the queue, you write its `plan.md` *now*, not from assumptions made when the intent was authored. The intent captures the *idea*; the plan captures *how* to do it given the current codebase.

Process:

1. Re-read the intent. Confirm it's still the right next thing (ask the user if scope has drifted).
2. Read any files the intent points at to verify they still look as expected.
3. Read relevant vision docs for principles that apply.
4. Search lessons for anything relevant.
5. Write `plan.md` with: goal, file-by-file changes, schema (if any), acceptance criteria, verification steps, frontmatter.
6. Keep the original `intent.md` as a companion document if useful, or delete if `plan.md` supersedes it cleanly.

## When to update vision docs

Vision docs are *evergreen* — they describe principles, not implementation. Update them when:

- A lesson teaches something universally applicable (cross-slice)
- A design decision in `decisions.md` reveals a new principle
- The user articulates something in conversation that should outlast a single slice

Don't update vision docs to describe *current implementation state* — that's what the code is for. Vision is the WHY.

## When to update memory

The user has auto-memory at `~/.claude/projects/-Users-aleks-Flow-State/memory/`. Most things go in `.plans/`, not memory. Use memory only for:

- The pointer file (`flow_state_plans_system.md`) — points to `.plans/`
- Genuinely user-personal facts (their role, preferences) that aren't project state
- Cross-project facts that wouldn't make sense in a single repo

Do **not** put project state, slice details, or lessons in memory. Those belong in `.plans/`.

## Defer or kill a slice

If a slice is no longer the right thing:

- **Defer**: update frontmatter `status: deferred`; write the reason and "revisit when" in `status.md`. Stays in `slices/`.
- **Kill**: update frontmatter `status: killed`; write the reason in `status.md`. Move to `completed/` (kept for institutional memory).

Don't silently drop slices. The reason matters more than the slice.

## Common pitfalls (read these)

- **Don't over-specify a far slice's plan**. If it's not the active or next slice, intent.md is better than a detailed plan.md that'll go stale.
- **Don't skip the lesson when something bites you**. Lessons are the whole point of the self-learning system — skipping them is the single biggest failure mode.
- **Don't expand multiple slices into plans speculatively**. Expand on demand.
- **Don't edit slice frontmatter without updating ROADMAP.md**. They're meant to stay in sync.
- **Don't put long-form planning content in `status.md`**. That's what `plan.md` and `decisions.md` are for. Status is short and chronological.
- **Don't create a slice without frontmatter**. The system depends on machine-readable metadata.
