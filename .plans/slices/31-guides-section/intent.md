---
slice: 31-guides-section
status: queued
value: 9
confidence: 5
effort: L
depends_on: [30-design-overhaul]
unlocks: [23-payments-marketplace]
opened: 2026-06-11
closed: null
---

# 31 — Guides: the Trips tab becomes a living directory of river people

## Why

Slice 30 shipped a **Trips** tab as a thin outfitter listing + mock booking. This slice evolves
that tab into **Guides** — the app's people-and-commerce layer, and its primary path to
commercialization. The thesis: the human expertise that makes a river runnable lives in *people*,
and Flow-State should give those people a durable, structured home — free for everyone to read,
ownable by those who earn it.

This is also where the app's deeper purpose surfaces. Flow-State is not, finally, a data tool. The
data is in service of something larger: **growing love for river systems.** Water is life; the
systems that carry it are worth caring for, and pollution gets solved *downstream* of that love, not
before it. A directory of the people who know and steward these rivers — and who invite others into
that relationship — is how the app turns information into attachment, and attachment into care. (See
`vision/product-vision.md` → North star.)

## The model — a spectrum of "guide"

Everyone who wishes to contribute is, in some sense, a guide. The Guides tab holds the full
spectrum, not just commercial brands:

- **Guided outfitters (companies)** lead the directory — commercial operators with rosters, rivers
  run, seasons, and contact/booking surfaces.
- **Individual guides have their own profiles**, independent of any single company.
- A guide may be a **private boater affiliated with a commercial outfit** — named or anonymous.
- A guide may be a **former** guide of a company; affiliations are **time-bounded** (employment
  history with start/end dates on both the guide and the company).
- Guides become **future private boaters**; private boaters often **start** as guides. The line
  between "guide," "contributor," and "private boater" is a continuum, not a wall — a person moves
  along it over time, opting in to as much public history as they choose.

For everyone who opts in, the result is a **rich, longitudinal history**: where they guided, for
whom, when, on which rivers — a record of a life on the water that no forum or memory currently
keeps.

## Claiming ownership

Outfitter and guide profiles can exist as **open stubs** seeded from public knowledge (the directory
is free and readable by default). A real person or operator then goes through a **claim-ownership
process** to take control of their profile and maintain it — the moment a passive listing becomes a
maintained, authoritative presence. Claiming is the on-ramp to commercialization: a claimed profile
is one that can eventually transact.

## Commercialization

This tab is the app's revenue surface. The principle holds firm: **the underlying river data stays
free, easy, and accessible to all** — commercialization rides on the *people* layer (claimed
profiles, bookings, promotion), never on gating the public knowledge base. The ledger kept dormant
in slice 30 ("seed for future real guide-trip payments") activates here; real transactions route
through payments (slice 23) once trust (slice 24) is live.

## Relationship to the open private-vs-public tension

This slice is a candidate **bridge** for the named-and-deferred tension in `product-vision.md`
(private-first logs vs. public community contribution). The guide spectrum is exactly the mechanism
that lets a private boater *opt in* to a public history on their own terms — without coercing any
private log into the open. Resolving that tension and shaping this slice should happen together.

## What success looks like

- The 4-tab IA reads **Rivers · Guides · Log · Profile**; "Guides" replaces "Trips."
- Outfitter (company) profiles and individual guide profiles, with time-bounded affiliations between
  them; a reader can follow any guide's opted-in history end to end.
- A working claim-ownership flow (request → verify → manage), gated by capabilities/trust.
- The public directory is fully readable without an account; commercialization is additive, never a
  gate on river knowledge.

## What this is NOT

- **Not the private trip log.** Logs stay in the **Log** tab and stay private-first. Guides is a
  public, opt-in people layer — different surface, different defaults.
- **Not a social feed.** No comments, no follower timelines. Profiles and history, not chatter.
- **Not real payments yet.** Bookings/transactions stay **mock** until payments (23) + trust (24)
  land; this slice builds the profile/affiliation/claim model and the commerce-ready surface.
- **Not a gate on the data.** River knowledge is never paywalled; only the people/commerce layer
  monetizes.

## Open questions for plan-time

- **Data model:** how guide ↔ outfitter affiliation history is represented (likely a join entity
  with date ranges), and how it reconciles with the existing `Outfitter` table from slice 30.
- **Identity:** does a guide profile reuse the member identity (slice 20 capabilities) or stand
  alone until claimed? How does claim-verification lean on trust/reputation (slice 24)?
- **Anonymous-but-affiliated guides:** how to represent a real but unnamed guide without an account.
