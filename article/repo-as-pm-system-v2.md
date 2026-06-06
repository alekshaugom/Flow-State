# How I Keep a Side Project Alive Between Sessions

### A repo-native coordination layer for AI-assisted projects

---

Most of my side projects die in week three.

Not in the first sprint — the first sprint is fun. They die later, on the Saturday I sit down at the keyboard and realize I can't remember what I was doing the last time I was here. There are half-finished branches, a TODO file that contradicts two other TODO files, and no obvious answer to *what should I build next*. By the time I've reloaded enough context to start, the session is over and the project is a little more dead than the week before.

AI coding tools haven't fixed this for me. They've made the opposite end of the problem easier — putting a working prototype on screen is now an evening of work, not a week — but they didn't help with the part that actually defeats side projects. Every new session starts cold. The context window dies; the chat history goes away; whatever the model figured out on Saturday is gone on Wednesday. Without something else to hold the state, the project lives in my head between sessions, and my head turns out to be a bad place to put it.

What I've been doing for the last few weeks is putting that state inside the repo, in a form an AI session can pick up cold. It's been useful enough that I want to write down how it works, what I've learned, and what it costs.

---

## The problem in one sentence

If you build with AI coding tools across multiple sessions, the bottleneck isn't writing code. It's preserving direction across context loss.

Every conversation starts from scratch. Prior decisions have to be re-derived. The model doesn't know what you tried last week, what you decided not to do, or what surprised you the first time you went near a part of the codebase. You can hold all of that in your head for a while. The longer the project runs, the more it slips. Eventually you sit down on a Saturday and the project is a folder of files you only half-recognize.

The fix has to live somewhere the model can read. Something durable, version-controlled, and close to the code. Something an AI session can open on a Wednesday night and use to tell you what shape the project was in when you walked away.

---

## A bit of context on what I'm building

The project is Flow-State, a small app that aggregates Colorado river data from five public agencies and tells you whether your favorite section is running. I'm a former river guide, and the Saturday-morning ritual of pulling four government websites into four browser tabs to figure out whether to drive to Browns Canyon is the proximate reason I started it.

But Flow-State isn't really the point of this article. The point is what I had to put in the repo to keep it from dying. Flow-State just happens to be the project I tested it on.

I work on it in short bursts. Ninety minutes on a Saturday morning, maybe another hour on a weeknight. Most weeks that's all I have. Any system I use has to survive long gaps and let me start moving again fast.

---

## What I put in the repo

I asked Claude Code, in a single prompt, to scaffold a product vision, a roadmap, and a component-tracking system inside the repo. The output was a directory called `.plans/` with four things in it:

- **A vision folder.** Short markdown files answering the *why* questions: what is this project for, who is it for, what counts as success, what it's explicitly not. These rarely change.
- **A roadmap.** A single ordered queue of work, each item with its own folder and a frontmatter block recording value, effort, dependencies, and status.
- **A slices directory.** The queue itself, one folder per unit of work. The current slice has a full plan with file paths and acceptance criteria. The next few have lighter sketches. Far-out slices get a paragraph called *what success looks like*.
- **A lessons directory.** Things the project has learned the hard way. Each lesson follows a fixed template: what I assumed, how it broke, what's actually true, how to recognize the pattern next time.

The whole thing is markdown in a folder. No database, no embeddings, no semantic index. I kept most of what the model generated, edited a few of the conventions, and started using it that evening. The bootstrap was under an hour.

A note on why this matters: the value of building it this way wasn't that I designed the perfect system. It was that I got *something* in place fast enough to actually use it. The first iteration was crude. Several weeks of real use have refined it. None of that refinement would have happened if I'd spent two weekends designing the perfect tracker before starting.

---

## How I actually use it

Most sessions start the same way. I open Claude Code against the repo and ask: what's next to build?

The session reads `.plans/`, pulls in any lessons that look relevant, checks the current state of the codebase, and tells me where the project is. Usually it points at a slice I queued a week ago. Sometimes it's a slice I'd forgotten existed. Once in a while it's something that wasn't queued at all — the session notices that the code and the plan have drifted apart and flags it.

Then I redirect. Often.

A typical conversation: *No, push the forecaster back. The river-log feature is closer to what people will actually use.* Or: *Before we touch any of this, we need historical data. The forecaster won't work without thirteen months of backfill.* The session reshuffles the queue, updates the affected frontmatter, regenerates the roadmap, and we go.

The git log is full of these. *Queue river log slices ahead of forecast work.* That commit moved seven slices in front of the work I'd told myself was the actual reason for the project. *Insert a thirteen-month backfill between two existing slices.* That one wedged a data-backfill slice into the middle of a dependency chain because no forecaster was going to produce real numbers without history. *Queue a new snowpack audit slice that didn't exist before.* That slice was a tangent I noticed on a Saturday and queued in ten minutes.

Each of those reorderings was a short conversation. By hand, in a real project tracker, they would have been an hour each, and I would have done maybe one of them.

---

## What I've learned after a few weeks

The first thing is that the roadmap isn't really a plan. It's a record of what the project thinks it's doing, that I can argue with.

It's wrong almost every week. I show up on a Saturday, look at the queue, and immediately want to change something. For a while I thought that meant the planning system was broken. The opposite turned out to be true. The pivoting is the work. The roadmap's job isn't to be right; its job is to absorb the corrections without losing the through-line. If I move three slices around on Monday, the system on Saturday still tells me what I was building and why.

The second thing is that the near-term slices aren't more reliable than the far ones. The first version of the system was built around what I called a *depth gradient*: vague far out, detailed near in. That part is still true. But even the detailed near-in slices get rewritten before they get built. Everything is provisional until I'm actually doing it.

The third thing is the one I didn't expect. The point of any of this isn't to follow the plan. The point is that the project has somewhere to be between Tuesday night and Saturday morning. When I come back, the queue is there. The lessons are there. The active slice is half-written. I don't have to remember where I was. I look.

That last part is what makes Flow-State feel like a sustainable side project for the first time in years. The hour I used to spend reconstructing what I'd been thinking is gone. I ask the system, it tells me, I either build or argue, and we move.

---

## The cost

This isn't free, and I want to name the costs clearly.

A meaningful share of my AI time goes into managing the project rather than writing code. Every "what's next?" conversation reads the active slice, the next few queued, the relevant lessons, the roadmap, and a vision doc or two. A pivot doubles that, because the session also has to load whatever I'm pulling forward and update dependencies in several places. Tokens spent on bookkeeping add up.

Some sessions I don't write any code at all. I move three slices around, write a new intent, kill a slice that turned out not to matter, and call it done. That can feel strange — a whole Saturday morning spent reorganizing a project instead of building it. The work was real, but it wasn't the work I sat down to do.

There's also a softer cost on my attention. The system asks me good questions — *does this slice still make sense? is the order right? what should we defer?* — but those questions are a different mode than building. They accumulate. Some weeks I'm running a small planning meeting against myself before any code gets written.

If you're considering doing this, go in knowing those costs exist. The system isn't a free wrapper around what you were already doing. It changes the work.

---

## Why I keep paying it

The alternative is worse, and I know what the alternative looks like because I've lived it.

Without the system, the project lives in my head. That works for an hour and it works for a day. It does not work across two-week gaps and Wednesday-night sessions cut short by tiredness. The plan goes stale. Decisions get forgotten. The half-finished idea from three weeks ago either never gets built or gets rebuilt from scratch because I can't remember the first attempt. Every Saturday morning starts with a thirty-minute archaeology session before any real work happens.

The system means I don't have to hold any of that. The vision is in `vision/`. The roadmap is in `ROADMAP.md`. The decisions are recorded in the slice folders themselves. The mistakes are in `lessons/`. When I come back, all of it is still there. I argue with the AI about what's next, redirect when I disagree, and start building inside of five minutes.

The trade is tokens and attention for resumability. After a few weeks, I'd make it again.

---

## Why this might matter for you

If you're building with AI tools across more than one session — and especially if your project is a side project that has to survive long gaps — you'll hit the same wall I did. It's not a code problem and it isn't going to be fixed by a better model. The model can be perfect and the project will still die between sessions if the state doesn't live somewhere durable.

You don't need anything sophisticated to start. You need a coordination layer the AI can read every time. Mine is markdown in a folder. Yours can be whatever fits. The pieces that matter are: a short statement of what you're building and why, an ordered queue of work, per-item plans that grade from detailed (now) to vague (later), and a record of what the project has learned the hard way. The rest is decoration.

The interesting open question is whether something heavier would do better. A real memory system — embeddings on the lessons, semantic search across slices, retrieval that knows what you've worked on before — would probably have better recall than what I have now. It would also be a system to maintain. The bar I cared about was not *best possible context retrieval*. It was *good enough that I keep coming back*. Markdown in a folder cleared that bar on the first night and is still clearing it.

If I were starting a new side project today, the first thing I'd do, before any feature work, is ask the model to scaffold a coordination layer like this in the repo. It takes under an hour. It changes the shape of every session after.

For now, the river data still lives in five different tabs, the next slice still has the next thing in it, and I can leave for two weeks and come back without losing the project. That's the part I was missing.
