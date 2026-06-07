# Status — 29-design-system-refresh

> **SUPERSEDED by slice 30 (design-overhaul, 2026-06-06).** The token/font foundation built
> here is kept and folded into slice 30's full IA rebuild. See `../30-design-overhaul/`.


## 2026-06-05
- Opened slice (user-prioritized; supersedes 24 as active for now — 24 returned to queued).
- Design reference built earlier in `design/` (new system applied to real data); this slice applies it to `app/`.
- Decision: token-swap-with-aliases over per-component rename — reskins all components at once, low risk, reversible. See plan.md.
- Done: self-hosted Manrope into `app/public/fonts/`.
- Phase A DONE — `app/src/tokens.css` rewritten (new OKLCH tokens + full back-compat alias layer
  covering every legacy name the components reference). Fonts swapped: Manrope (self-hosted) +
  Inter numerals (FlowNum unicode-range) + Spline Sans Mono. Replaced all hardcoded
  `'Ubuntu'`/`'Fira Code'` strings in `DesktopFlowChart`, `MobileFlowChart`, `RiverMap` → `var(--font-*)`.
  grep confirms no Ubuntu/Fira Code left in `app/src`.
- Phase B DONE (signature) — `StatusPill` dot removed (color+label only); `BigCFS` numerals → weight 300
  (airy); new `components/FlowGauge.tsx` (morphing cut-circle vessel, maps section thresholds →
  {goodLow,goodTop,highMax}); wired into the section-detail hero (`SectionDetailBody`, `MobileDetail`).
- Phase C DONE — `vision/ux-direction.md` "Visual language" section rewritten to the new system.
- Verification: `npm run ui:build` ✓ (clean), `npm test` ✓ (491/491). Live preview (vite+harper):
  desktop home renders fully in Manrope/Inter/Spline, flow-blue palette, rounder pills, dot-less
  status, lighter big numbers — confirmed visually. (Even the error/empty states reskinned.)

### Decisions
- Reverted the status-vocabulary rename (Ideal→Optimal, etc.): `statusLabel` is server-generated
  from flow-band names (`bandToLabel`) and only falls back to the client map, so a rename would be
  half-applied + inconsistent, and band names are domain content, not styling. Out of scope here.
- FlowGauge lives on the section-detail hero (has `detail.thresholds`). The home corridor-spine
  quick-look pane (`CorridorSpineDetailPane`) intentionally does NOT get it — `SpineSection` carries
  no thresholds; plumbing them through the corridor data pipeline is a separate change.

### Notes / env
- `harper dev` wedged (HTTP 000) mid-session after file churn (the known watcher-thrash quirk in
  memory `feedback_harper_thrash.md`); a restart fixed it. Not a code fault.
- The FlowGauge's in-app render site (`SectionTile` inside `CorridorMapColumn`, corridor view) didn't
  render live in plain `vite` — corridor view needs the map env / `MOCK_CORRIDOR_VIEW=1` (see
  `vite-mock` launch config) and `CorridorMapColumn` has a pre-existing setState-in-render warning.
  FlowGauge itself is proven in the `/design` showcase + build/types; visual confirmation in the
  corridor view is pending the mock-env run.

## 2026-06-05 — Gauge redesign (user feedback round)
- User corrected the FlowGauge from a hand sketch + notes. Rebuilt geometry in a scratch
  harness, iterated to match, then ported to `components/FlowGauge.tsx`:
  - **No dashed line.** **No inner fill / empty centre.** The OUTLINE itself rises: faint gray
    base (`--ink-300`) + coloured portion clipped to rise from the bottom to `currentFlow ÷
    idealHi` (basin-relative top-of-good).
  - Shapes morph by band: low = nearly-closed circle, good = open horseshoe, high = arms bend
    **up**, flood = arms flare **out**.
  - CFS number centred in the band colour + small "CFS" beneath, inside the ring.
  - Flood **pulses** (`@keyframes fs-flood-pulse` in global.css; respects reduced-motion).
  - `onMap` = white-haloed glyph, no centre number (map markers).
- Colour scheme is now **yellow (low + runnable + runnable-technical) → green (good) → red
  (high) → deep red (flood)**. Implemented via tokens: `--status-high` → red (hue 28),
  `--status-danger` → deep red, `--runnable-*` aliases → `--status-low` (yellow), `--trend-down`
  pinned to a neutral amber (so it isn't read as danger).
- **"Ideal" removed everywhere it was user-facing → "Good"**: `lib/flow-bands-pure.ts`
  `bandToLabel('ideal')`, client `STATUS_LABEL`, Desktop+Mobile filter labels, "Good band" stat,
  RiverMap tooltip map, Desktop/Mobile flow-chart band label, RangeGauge segment. DesignStatus
  key `'ideal'` unchanged (still green). `craftTypes` 'ideal' left alone (different domain).
- Gauge is the section-detail hero readout now (number inside) — replaced the duplicate BigCFS in
  `SectionDetailBody` + `MobileDetail` (BigCFS still used for the null/"—" case).
- Synced `design/index.html` showcase (gauge JS, status tokens, Good/High labels) to match.
- Verified: `ui:build` ✓, `npm test` ✓ **491/491** (updated the bandToLabel test 'Ideal'→'Good').
  Live DOM check: runnable pill = yellow (`--status-low`), zero "Ideal" strings, filter = "Good",
  `--status-high` = red. Gauge visual proven in the showcase render + scratch (in-app section-detail
  screenshot blocked by preview zoom flakiness + corridor-view needing the mock env).

## 2026-06-05 — Home layout + dev-stability fixes
- Header/cards width alignment: the page heading + filter strip (`DesktopShell`) had no max-width
  (stretched full-bleed) while the card list was `maxWidth:1180` centered → header ran wider.
  Wrapped the sticky bar's CONTENT in the same `maxWidth:1180; margin:0 auto; padding:0 28px` box
  (bar background stays full-bleed). Then the corridor card (`HomeCorridorSpineTile` `cardOuter`)
  capped at `maxWidth:1100` while its column is 1124 → right edge sat ~24px short of the header's
  right edge. Changed desktop cap to `'100%'` so the card fills its column. Verified via DOM at
  1300 + 1900 vw: header-content and card now share identical left (384) AND right (1508) edges.
- Dev stability: `harper dev` (file watcher) kept wedging to HTTP 000 on file churn during the
  session (see memory `feedback_harper_thrash.md`), which showed as a blank app (data fetch fails).
  Switched local API to `HDB_ROOT=.harper-dev harper run .` (no watcher) — stays up across edits +
  `ui:build`. Use this for testing instead of the `harper` (dev) launch config.

### Deferred (optional follow-ups, slice left active)
- Immersive `--sky-river` gradient hero band on the standalone section-detail (stretch item; home stays dense).
- FlowGauge on the corridor spine panes (needs thresholds plumbed into `SpineSection`).
- Visual confirm of FlowGauge in the corridor view under `vite-mock`.
