# .plans — Flow-State's queued build system

This directory is the **single source of truth for what gets built next**, why, and what has been learned along the way. It replaces one-shot planning docs with a versioned, queued, depth-graded system that survives context resets and accumulates institutional knowledge over time.

If you are an AI session starting work on this project, read [CONTRIBUTING-AI.md](CONTRIBUTING-AI.md) before doing anything else.

## Why this exists

Plans get dropped. Strategic documents go stale. A working repo doesn't tell you *what's next* or *why we made the calls we did*. This system fixes that by:

1. **Always having exactly one active slice** — the next thing being built
2. **Ranking everything by value** so the queue order is defensible
3. **Grading detail by distance** — active slice has every file path; far slices are intent only
4. **Capturing decisions and mistakes** so the next session benefits from the last one
5. **Being AI-readable** — predictable paths, frontmatter, conventions so any future Claude can pick up the state cold

## Directory layout

```
.plans/
  README.md              # this file — system overview
  ROADMAP.md             # the ordered, value-ranked queue (single table)
  CONTRIBUTING-AI.md     # contract for AI sessions
  vision/                # evergreen "why" docs (rarely change)
  slices/                # the queue, one dir per slice
    NN-slug/
      plan.md            # detailed plan (active + near slices)
      intent.md          # interpretive sketch (far slices) — alternative to plan.md
      status.md          # live updates during active work
      decisions.md       # decisions made during build (only created during/after work)
  lessons/               # mistakes worked through and what we learned
  completed/             # archived slices, kept for context
```

## The depth gradient

The further out a slice is, the **less** detail it should have. Forcing detail on far work locks in assumptions that go stale.

| Distance | What it has | Why |
|---|---|---|
| **Active** (status:active) | Full plan.md with files, schema, acceptance criteria, verification steps + live status.md | We're doing it now — every detail matters |
| **Next 1–2** (queued, top of queue) | Plan.md with goals, key files, known unknowns | Close enough that planning is worth the effort |
| **Slices 4–10** (queued, mid-queue) | Lighter plan.md — goals, references to vision docs | Detail will be wrong by the time we get there |
| **Far horizon** (queued, bottom) | Intent.md only — "what success looks like, what's NOT it" | Captures the *idea* without freezing implementation |
| **Vision docs** | Principles that hold across slices | Evergreen — the WHY, not the WHAT |

**Intents are deliberately under-specified.** When an intent reaches the top of the queue, a future session expands it into a full plan *in the context of the actual codebase state at that time* — not based on assumptions made months earlier.

## Frontmatter spec (every plan.md and intent.md)

```yaml
---
slice: 02-watershed-corridor-ia
status: queued       # queued | active | in-review | done | deferred | killed
value: 9             # 1-10, impact on users / strategic importance
confidence: 8        # 1-10, how sure we are this is the right thing
effort: L            # S | M | L | XL (S<1wk, M 1-2wk, L 2-4wk, XL 4wk+)
depends_on: [01-flowband-browns-fix]
unlocks: [05-history-forecast-chart, 06-map-layering]
opened: 2026-05-13
closed: null
---
```

`ROADMAP.md` is a rendered view of this metadata. Don't duplicate — update the frontmatter, then run/regenerate the roadmap.

## Status taxonomy

- **queued** — in the backlog, ordered by value/dependencies
- **active** — currently being built; exactly one slice should be active at a time
- **in-review** — code complete, pending verification or user feedback
- **done** — shipped and verified; moved to `completed/`
- **deferred** — paused; reason in status.md
- **killed** — won't ship; reason in status.md (kept for institutional memory, not deleted)

## How the queue advances

When the active slice ships:

1. Update `slices/NN-slug/status.md` with closing notes and date
2. Move `slices/NN-slug/` → `completed/NN-slug/`
3. Pick up the next slice (highest value, no blocked dependencies)
4. Update its frontmatter `status: active`
5. **If it was an intent.md, expand it into a plan.md** — *in context of the current codebase state*, not based on what was assumed when the intent was written
6. Open `status.md` and begin work
7. Update `ROADMAP.md` accordingly

New ideas land as a new `slices/NN-slug/intent.md` at the back of the queue. They never block current work.

## Self-learning loop — the core mechanism

This is **first-class**, not an afterthought. Mistakes that get worked through must produce a lesson. The loop:

```
   Vision docs ──────► guide ──────► Slice plans
       ▲                                  │
       │                                  │
   promote                            executed
       │                                  │
       │                                  ▼
   Lessons ◄──── triggered by ──── decisions.md + bugs + corrections
```

### When to write a lesson

Write a lesson in `lessons/L###-slug.md` when **any** of these happen during work:

- **Debugging took more than one round** of investigation to root-cause
- **The user corrected an assumption** you were operating on
- **A non-obvious constraint surfaced** (a hidden dependency, a framework quirk, a deployment gotcha)
- **A build/deploy/test failed** because of an interaction that wasn't documented
- **A design decision was reversed** after seeing it in practice

Don't write a lesson for trivial typos, syntax errors, or things that are obviously already documented. The bar: *"a future session would benefit from knowing this before they hit it themselves."*

### What a lesson contains

See `lessons/_template.md`. Every lesson captures:

1. **The wrong assumption / model** — what we believed that turned out to be incorrect
2. **How it manifested** — the symptom (error, surprise, wasted hours)
3. **The right model** — what's actually true
4. **How to recognize the pattern** — what should trigger this lesson in future work
5. **Tags** — `debug | discovery | correction | surprise | design-revision` so future sessions can search

### When a lesson gets promoted to vision

If the same lesson appears across multiple slices, or it changes how we think about a whole subsystem, promote it: add a section to the relevant `vision/*.md` document referencing the lesson IDs. Lessons stay; vision summarizes the *principle* they teach.

## How a human uses this

1. Open `ROADMAP.md` to see the queue
2. Open the active slice's `plan.md` and `status.md` to see what's happening now
3. Edit `intent.md` files to seed new ideas at any time
4. Move slices around in `ROADMAP.md` to re-prioritize (update frontmatter `value` to back it up)

## How an AI session uses this

See [CONTRIBUTING-AI.md](CONTRIBUTING-AI.md). Every session runs a Plan phase then an Execute phase, with auto on within each — the only default checkpoint is the Plan→Execute boundary. Short version:

1. Read this README + `ROADMAP.md` first
2. Find the active slice via `grep -l "status: active" slices/*/plan.md` (there should be exactly one)
3. Read the active slice's `plan.md` and `status.md`
4. Scan `lessons/` for anything relevant to the work
5. Do the work; update `status.md` as you go; write `decisions.md` entries and lessons as they happen
6. When done, follow the queue-advance protocol above

## What this system is NOT

- Not a Jira replacement — there's no triage, no sprint planning, no tickets. Just a queue.
- Not a doc site — vision docs are short and opinionated, not exhaustive
- Not an automation layer — the conventions are simple enough for a human to follow by hand
- Not immutable — the `value` and order can change; just update frontmatter and `ROADMAP.md`
