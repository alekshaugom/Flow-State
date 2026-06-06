# Flow State — Design System Spec

> **What this is.** A snapshot of the design system Flow State ships *today*, plus an
> honest read on why it feels basic and where to take it. Hand this whole `design/`
> folder to a design assistant (e.g. "Claude design") as the brief for a visual rework.
>
> **The three files:**
> - [`index.html`](./index.html) — the living styleguide. Open it in a browser to *see*
>   every token and component rendered. This is the visual source of truth.
> - [`tokens.css`](./tokens.css) — the machine-readable token set the app actually ships
>   (mirror of `app/src/tokens.css`).
> - `DESIGN-SPEC.md` (this file) — the written brief: philosophy, inventory, and critique.

---

## 1. The product, in one line

**Flow State is "AllTrails for rivers"** — a flow-forecasting and trip-logging app for
whitewater boaters and commercial outfitters. Users look up a river *section*, read its
current flow (CFS) against a runnable range, see a short forecast, and log trips. The
emotional register the product *wants*: confident, outdoorsy, place-rich, a little
adventurous. The register it currently *hits*: a competent data dashboard.

## 2. Current design philosophy (as built)

- **Light-primary, single mode.** One light theme. No dark mode.
- **Cool, desaturated surfaces.** App background `#f4f6f8`, white cards, faint
  blue-grey sunken panels. Calm and clean, but clinical.
- **One brand color: river blue.** A 10-step blue scale (`--river-50…900`) carries
  nearly all brand expression. The signature shade is `--river-700 #0f4269`.
- **Earthy *semantic* palette.** Flow status drives color: Low (amber/sand), Runnable
  (sage), Ideal (teal-green), High (blue), Dangerous (clay red). Each status has a
  `bg / fg / solid / line` quad. This is the most distinctive color idea in the system —
  but today it only does utilitarian work (badges, gauge fills), never brand work.
- **Type pairing: Ubuntu + Fira Code.** Ubuntu (friendly geometric sans) for everything,
  Fira Code (mono, tabular) for numbers, eyebrows, and metadata. Heavy use of tiny
  uppercase mono "eyebrow" labels throughout.
- **Restrained depth.** 1px hairline borders at 8% opacity everywhere; shadows are very
  soft (6–10% opacity). Radii are conservative (6–14px on most things).
- **Inline styles, token-driven.** Components are React with inline `style={{}}` that
  reference the CSS custom properties. There is **no shared `<Button>`** — every button
  is hand-styled. This is worth knowing before a rework: there's no single component
  layer to retheme; the leverage points are the tokens.

## 3. Token reference

The authoritative values live in [`tokens.css`](./tokens.css) and render in
[`index.html`](./index.html). Summary:

| Group | Tokens | Notes |
|---|---|---|
| **Surfaces** | `--bg-canvas/app/card/raised/sunken/tint` | `#e9eef3 → #ffffff`, all cool & light |
| **Ink (text)** | `--ink-0…5` | `#0d1620` (darkest) → `#c4ccd5` (faintest) |
| **Borders** | `--rule` (8%), `--rule-strong` (14%) | hairlines on near-everything |
| **River blue** | `--river-50…900` | the brand scale; primary = `--river-700` |
| **Status** | low / runnable / ideal / high / dangerous | each a `bg/fg/solid/line` quad |
| **Trend** | `--trend-up/down/stable` | green / orange / grey |
| **Type sizes** | `--fs-micro 11` → `--fs-display 56`, plus `--fs-cfs-detail 84` | big sizes exist but are underused |
| **Letter-spacing** | `--ls-tight/display/eyebrow` | `eyebrow` = `0.14em` uppercase mono |
| **Spacing** | `--sp-1…10` (4 → 64px) | 4px base grid |
| **Radii** | `--r-sm 6` → `--r-2xl 28`, `--r-pill 999` | most UI uses md/lg (10–14) |
| **Shadows** | `--shadow-card/raise/press` | very soft, low-contrast |
| **Motion** | `--ease`, `--dur-fast/med/slow` (120/220/380ms) | defined; barely used |

## 4. Component inventory (what's in the styleguide)

Rendered live in [`index.html`](./index.html), grouped:

1. **Badges & pills** — `StatusPill` (sm/md/lg, colored dot + label), `TrustBadge`
   (moderator/trusted/established/new), `ContributionBadge` (verified/pending/disputed),
   `BountyStatusBadge` (open/awarded/cancelled).
2. **Chips & tags** — `Eyebrow`, `Breadcrumb`, `TrendChip`, condition tag chips,
   `FilterChip` (active = solid ink), context-strip metrics.
3. **Cards** — `SectionTile`, `SectionRow`, `CorridorTile`, `BountyCard`,
   `AccessPointCard`, `RapidCard`, `OutfitterCard`, `RiverLogCard`. All share: white bg,
   1px `--rule` border, `--r-lg` radius, `--shadow-card`.
4. **Data viz** — `BigCFS` (the giant tabular flow number, 38/56/84px), `RangeGauge`
   (segmented flow-range bar with a cursor), `Sparkline` + `ForecastBand` (SVG, gradient
   fill + dashed forecast), `ForecastStrip`.
5. **Navigation / hero** — `AppHeader` (sticky, blurred, wave logo mark), `SearchHero`
   (the frosted-glass search bar over a raft photo — the single most premium element),
   `NavLink`.
6. **Buttons** — primary (`--river-700` fill), secondary (white + hairline), green
   (award), danger (clay outline), toggle/segmented.
7. **Icons** — a hand-rolled 24×24 stroke set (`droplet`, `mountain`, `wave`, `dam`,
   weather glyphs, UI glyphs). Stroke-only, 2px, round caps.
8. **Loading** — shimmer `Skeleton`.
9. **Maps** — two engines. `RiverMap` (Leaflet, grayscaled OSM tiles) draws every
   section as a status-colored line with a frosted flow-status legend and hover
   tooltips. `CorridorMap` (MapLibre, light "positron" basemap) draws one navy section
   line with put-in / take-out / dam / gauge markers, a live position dot, and a
   signature 270° "gauge donut" that fills in the flow-status color to show current CFS.

---

## 5. Why it feels basic — honest critique

The system is *competent and consistent* — good tokens, sane spacing, real semantic
color. What's missing is **personality and hierarchy**. Specifics:

1. **It reads "admin dashboard," not "river adventure."** Flat light surfaces + uniform
   1px borders + a single blue accent is the default look of every SaaS table tool.
   Nothing on the page signals whitewater, the outdoors, or place.
2. **Everything sits at one elevation.** Same card, same border, same soft shadow,
   repeated in a grid. There's no focal point — the eye doesn't know where to land.
   The big expressive tokens (`--fs-display 56`, `--fs-cfs-detail 84`, `--shadow-raise`)
   are defined but rarely used, so most screens live in the 11–15px range and feel dense
   and undifferentiated.
3. **Color does only chores.** River blue + the status quad are used for state, never for
   mood. There's no warm counter-color, no gradient drawn from sky/water, no brand moment.
   The palette is cold top to bottom.
4. **Mono-label clutter.** Tiny uppercase Fira Code eyebrows are *everywhere* (kind labels,
   metric labels, breadcrumbs, dates). In small doses it's a nice "instrument" texture;
   at this density it reads utilitarian and busy.
5. **One good idea, isolated.** The frosted-glass `SearchHero` over the raft photo is
   genuinely premium — depth, blur, real imagery. That language **dies at the hero** and
   never carries into the rest of the app. The other distinctive idea, the **corridor
   "spine"** (the river-as-vertical-rail visualization), is the most ownable visual in the
   product and deserves to be a signature, not a detail.
6. **No motion, no delight.** Motion tokens exist but the UI is static. Water is the
   subject; nothing flows.

## 6. Direction for the rework (the brief)

Keep the bones — the token architecture, the 4px grid, the semantic status quad, the
Ubuntu/Fira pairing — and push hard on expression and hierarchy:

- **Give it a sense of place.** Lean into nature: topographic contour lines, elevation/flow
  gradients, real photography or illustration carried beyond the hero. Make the
  corridor "spine" a hero-grade signature graphic.
- **Build depth & hierarchy.** Fewer, bigger focal cards. A clear "hero metric" treatment
  using the 56–84px display sizes for the current CFS. Layered surfaces and the
  `--shadow-raise` elevation for the thing that matters on each screen. More whitespace.
- **Warm up the palette.** Add a secondary accent drawn from sunrise/sand/canyon to
  counter the cold blues, plus a few brand gradients (river→sky, dawn). Let color carry
  *mood*, not just state.
- **Tame the mono labels.** Reserve uppercase-mono for true instrument readouts (CFS,
  gauges, timestamps). Use sentence-case sans for the rest to reduce busyness.
- **Type contrast.** Consider a display face for headlines/metrics so the hierarchy reads
  at a glance; keep Ubuntu for body and Fira for numbers.
- **Add a dark / "dawn patrol" mode.** The cool palette is one variable-flip away from a
  strong dark theme.
- **Make water move.** Subtle flow animation on sparklines/wave marks, scroll reveals,
  gauge cursor easing — use the motion tokens that already exist.

**Constraints to respect:** light mode must remain first-class; status colors must stay
legible and semantically stable (boaters rely on them); numbers stay tabular mono;
retheme via **tokens** (there's no central Button/Card component to swap).

---

*Generated from `app/src/tokens.css` and the component source in `app/src/components/`,
`app/src/desktop/`, `app/src/mobile/`. To refresh after design changes, re-sync
`tokens.css` and re-render `index.html`.*
