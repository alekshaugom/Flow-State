# Flow State — Design System Spec (new direction)

> **What this is.** The design reference for Flow State's **new look** — an Apple Weather ×
> AllTrails direction supplied as an external system and merged here with Flow State's *real*
> domain (USGS gauges, flow status, corridors, outfitters/trips). Open
> [`index.html`](./index.html) to see it rendered. The previous look is preserved under
> [`archive/`](./archive/) for before/after.
>
> **The files:**
> - [`index.html`](./index.html) — the living styleguide in the new system, populated with real rivers.
> - [`tokens.css`](./tokens.css) — the new token set (mirror of the supplied `colors_and_type.css`).
> - `DESIGN-SPEC.md` (this file) — the brief: what the system is, how it merges, what maps to what.
> - [`archive/`](./archive/) — the prior design reference (v1) for comparison.

---

## 1. The shift, in one line

From a **competent light dashboard** → to an **immersive, weather-app-calm conditions companion**:
condition-reactive sky gradients, frosted instrument modules, big airy numbers, a calm color
system, and a broader experience that reaches past river flow into **snowpack, weather, and
guided trips**. North stars: **Apple Weather** (immersive sky, glanceable numbers, vibrancy,
depth) and **AllTrails** (outdoor warmth, maps, trail green, trustworthy data cards).

The guiding idea is a **duality**: a warm, natural, immersive *canvas* (sky gradients,
photography) underneath cold, precise, instrument *data* (mono/Inter numerals, tabular readouts,
frosted modules). The canvas sets the mood; the data tells the truth.

## 2. What carried over, what changed

| | Old (archived v1) | New direction |
|---|---|---|
| **Surfaces** | Flat light cards, one elevation | Immersive **sky gradients** + frosted modules over them; opaque white cards on light |
| **Brand color** | Single river blue | **Flow blue** (primary) + **Alpine green** (secondary "go") |
| **Type** | Ubuntu + Fira Code | **Manrope** + **Inter numerals** (via `unicode-range`) + Spline Sans Mono for instruments |
| **Numbers** | 38–84px mono, tabular | **Big & light (300)** — Apple-Weather hero numerals, still tabular |
| **Status** | 5 statuses, **colored dot** in every pill | 4-step ramp (low→good→high→danger), **color on the label, no decorative dot** |
| **Eyebrows** | Tiny uppercase mono everywhere | Reserved for true module labels only; sentence case elsewhere |
| **Radius** | 6–14px | Friendlier **20px modules / 28px hero / pill** |
| **Shadows** | Subtle, single level | Soft cool-tinted `sm…xl` + a cyan **flow glow**; frosted modules use blur, not shadow |
| **Scope** | Rivers only | Rivers **+ snowpack + weather + guided trips** |
| **Color authoring** | hex | **OKLCH** |

**Kept (the bones the old system got right):** semantic status color that means something,
tabular numerals, a 4px spacing grid, attribution as a first-class element.

## 3. Token reference

Authoritative values live in [`tokens.css`](./tokens.css). Highlights:

- **Palettes (OKLCH):** `flow-100…900` (primary), `alpine-100…700` (secondary),
  `ink-50…950` (cool neutral), `status-low/good/high/danger` (+ soft `-bg` tints),
  `snow-bare/thin/good/deep`.
- **Sky gradients:** `--sky-dawn / day / cloud / dusk / night / storm / river / alpine`,
  plus `--scrim-top/bottom` protection gradients. The signature device — *functional, not
  decorative*.
- **Surfaces:** `--bg-app / surface / subtle`, `--border`, `--module-fill/stroke` (frosted),
  `--fg-1…4`, `--fg-on-sky-1…3` (white text on gradients).
- **Type:** `--t-hero` (clamp 72–112) → `--t-label` (11), `--font-sans` (Manrope/Inter-num),
  `--font-mono` (Spline). Hero weight 300; headings 700–800 tight tracking; body 16px min.
- **Radii** `--r-xs…2xl` + `--r-pill`; **shadows** `--shadow-sm…xl` + `--glow-flow`;
  **blur** `--blur-module`; **spacing** `--s-1…20` (4px grid).

## 4. Status vocabulary — old → new mapping

The app's existing statuses fold into the new 4-step ramp + calmer language:

| App status (today) | New label | Ramp color |
|---|---|---|
| `ideal` | **Optimal** | good (green) |
| `runnable` | **Runnable** | good (green) |
| `low` / `too-low` / `no-flow` | **Too low** | low (amber) |
| `high` / `expert-only` | **Elevated** | high (orange) |
| `dangerous` | **Flood** | danger (red) |

Snowpack (new domain) gets its own ramp: **Bare · Thin · Good · Deep**. Trend stays as unicode
arrows (↑ ↓ →) in the mono face. No emoji, anywhere.

## 5. Signature elements (rendered in `index.html`)

- **Immersive hero** — full-bleed sky gradient, centered big-light readout (`1,240 cfs ·
  Optimal`), source attribution, frosted modules floating on top.
- **Frosted instrument module** — `--module-fill` + hairline `--module-stroke` +
  `--blur-module`, white text, no shadow. The workhorse over gradients.
- **FlowGauge** — a "cut-circle" vessel that fills bottom-up and **morphs by stress**: rim
  curves *in* (low/optimal), goes *flat* (elevated horseshoe), then *flares out* (flood). One
  glyph encodes value + status + how-pushy. Doubles as a map marker.
- **FlowChart** — day discharge with the Optimal band + now marker, drawn on the sky.
- **Channel & velocity** — the CFS-equivalent of a snow-depth bar: a channel cross-section
  filled to stage with velocity streaks, so two reaches at the same CFS visibly differ.
- **Snow-depth bars / sparklines** — snowpack and trend viz.
- **Surface set** — conditions list rows, critical-only river data cards, status badges (no
  dots), buttons (primary / go / secondary / ghost), chips + segmented control.
- **Guided trips** — condition-aware trip listing + airline-style booking summary (the
  experience expansion; maps to the app's outfitters and trip logs).
- **Blend map** — frameless network: flow-blue stem with a glowing selected reach,
  tributaries, access points (alpine = put-in, flow = take-out), live FlowGauge markers with
  CFS chips, soft snowpack blotches, layer toggles + edit controls.

## 6. How this merges with the real app

The supplied system has **no knowledge of real data** — it's a visual/experience language. The
merge principle: **adopt its look and patterns; keep Flow State's data, structure, and truth.**

- **Real content throughout** — Gunnison/Almont, Browns Canyon, The Numbers, Crystal; real USGS
  station IDs; the Arkansas/Gunnison corridors; outfitter trips. No invented data semantics.
- **Re-skin, don't re-architect.** The app's components (StatusPill→StatusBadge,
  RangeGauge→FlowGauge, BigCFS→big-light readout, cards→modules/surfaces, the corridor map→Blend
  map) map onto the new vocabulary one-for-one. The corridor "spine" idea survives as the
  network/reach treatment on the blend map.
- **Tokens are the lever.** The app already drives styling from CSS custom properties, so the
  fastest path to production is swapping `app/src/tokens.css` for these tokens and updating the
  component inline styles to the new names + patterns (frosted modules, no status dots, sky
  heroes on detail/home).
- **Honor the brand rules:** sentence case; numbers lead; always show units + freshness +
  source; status by color+label (no dots); Lucide icons; real photography (placeholders mark
  where it goes); calm motion (iOS spring, count-up numbers, slow sky shifts).

## 7. Caveats (inherited from the supplied system)

- **Numerals use Inter** (CDN, mapped onto digits via `unicode-range`); letters stay Manrope.
- **Spline Sans Mono** and **Lucide** are CDN substitutes/links; **Manrope** is self-hosted in
  `fonts/`. OKLCH colors require a modern browser.
- **Photography** is represented by gradient stand-ins / `PHOTO` slots — real outdoor photos
  need to be supplied.
- This styleguide is a **static port** of the system's React UI kit so it stays a single,
  shareable, build-free file; the data-viz (FlowGauge, FlowChart, channels, sparklines, blend
  map) is drawn by a small inline script ported from the kit's `charts.jsx` / `map.jsx`.

## 8. Suggested next step

If you want this in the running app, the highest-leverage move is a **token swap + component
re-skin** pass on `app/`: replace `app/src/tokens.css`, introduce the sky-gradient hero on the
home/detail screens, convert pills to dot-less badges, and drop in the FlowGauge for flow status.
That's a focused, mostly-mechanical migration I can scope and execute on a branch when you're
ready.

---

*New direction ported from the supplied "Flow State Design System" bundle
(`colors_and_type.css`, `ui_kits/app/*.jsx`) and applied to Flow State's real rivers, gauges and
trips. To re-sync: refresh `tokens.css` from the bundle and update the inlined `:root` in
`index.html`.*
