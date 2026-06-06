# Flow State — Design Repo

The design reference for Flow State's **new direction** — an Apple Weather × AllTrails visual
+ experience system, merged with the app's real rivers, gauges, corridors and trips. The
**previous look is archived** in `archive/` for before/after.

## What's here

| File | What it is |
|---|---|
| **`index.html`** | The **living styleguide** in the new system — open it in a browser to *see* it: immersive sky hero, frosted instrument modules, color/type/space foundations, the morphing FlowGauge, channel & snow viz, list rows & data cards, guided-trip booking, and the blend map. Populated with real Flow State data. |
| **`DESIGN-SPEC.md`** | The **brief** — what the new system is, what changed vs. the old look, the status-vocabulary mapping, the signature elements, and how it merges with the real app. |
| **`tokens.css`** | The **new token set** (OKLCH palettes, sky gradients, Manrope + Inter numerals, frosted modules, radii/shadows/spacing) — a mirror of the supplied `colors_and_type.css`. |
| **`fonts/`, `assets/`** | Self-hosted Manrope + the Flow State logo / wordmark SVGs. |
| **`archive/`** | The prior design reference (v1 `index.html` / `tokens.css` / `DESIGN-SPEC.md`) for comparison. |

## View it in the browser

Single static file, no build step:

**Just open it**
```bash
open design/index.html      # macOS
```
Fonts (Manrope, Inter numerals, Spline Sans Mono) and the Lucide-style icons are self-contained
or load from CDN, so it works straight from `file://`. Uses OKLCH color — view in a current browser.

**Or serve it** (nicer on a LAN / phone)
```bash
cd design && python3 -m http.server 8137
# then visit http://localhost:8137
```

## How to share with a design assistant

Hand over the whole `design/` folder. A good prompt to pair with it:

> Here's Flow State's new design system — `index.html` shows it rendered on real data,
> `tokens.css` is the raw tokens, `DESIGN-SPEC.md` explains the direction and how it maps to the
> app. Help me apply it to the running app, or design screen X in this language.

## Apply it to the app (next step)

This is the design reference, not yet wired into `app/`. The fastest path to production is a
**token swap + component re-skin**: replace `app/src/tokens.css` with these tokens, add the
sky-gradient hero to home/detail, convert status pills to dot-less badges, and drop in the
FlowGauge. See §8 of `DESIGN-SPEC.md`.

## Keeping it in sync

After the design changes again:
1. Re-sync `tokens.css` from the source system.
2. Update the inlined `:root` at the top of `index.html` to match.
3. Adjust the component specimens / inline chart script if patterns changed.
