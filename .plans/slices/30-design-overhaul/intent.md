---
slice: 30-design-overhaul
status: active
value: 13
depends_on: []
opened: 2026-06-06
supersedes: 29-design-system-refresh
---

# 30 — Design overhaul: full IA rebuild to the new system

## Why

The user supplied a complete product redesign ("Flow State Design System" bundle:
`colors_and_type.css` + `ui_kits/app` mobile kit + `ui_kits/web` desktop kit). It is the
**exact** target look + interactions. This is bigger than slice 29 (a token-swap reskin in
place): it changes the **information architecture and the screens**. Slice 29's token/font
foundation is kept and folded in; this slice rebuilds the frontend IA on top of the existing
data layer, builds admin in the new style, and strips everything the design doesn't show.

Principle: **adopt the new look + IA; keep Flow State's real data and truth.**

## Target IA

4 tabs — **Rivers · Trips · Log · Profile** (mobile bottom tab bar / desktop left nav rail),
drill-ins **Rivers → Corridor → Section** and **Trips → Trip detail**. Light/dark duality:
immersive sky-gradient surfaces (Rivers/Corridor/Section) vs opaque light content surfaces
(Trips/Log/Profile/Admin). Mobile kit is source of truth; desktop is the same app re-laid.

## Decisions (user-confirmed 2026-06-06)

1. **Economy** — KEEP the ledger (dormant; seed for future real guide-trip payments). STRIP
   bounties + contributions + trust/reputation/moderation/content-flags.
2. **Your rivers** — build a real **follow/bookmark** feature (new table + resource + toggles).
3. **Trips** — visual listing over existing Outfitter data + **mock** airline booking (no real
   transactions; payments land in the ledger later).
4. **Log** — **simplify** to the design's minimal log (river · put-in/take-out · date · live
   cfs · note). Strip crafts/participants/sharing/multi-day/visibility from product (preserved
   on `pre-redesign-archive`). Keep flow-at-trip resolution.

## Safety

`pre-redesign-archive` branch cut at main HEAD (338ff46) — preserves all stripped code.
Work happens on `redesign-v2`.
