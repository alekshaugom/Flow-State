---
slice: 29-design-system-refresh
status: done
closed: 2026-06-07
value: 8
depends_on: []
opened: 2026-06-05
---

# 29 — Design-system refresh (Apple Weather × AllTrails)

## Goal

Adopt the new visual + typographic system (authored in `design/`) in the running app.
Strategy: **token swap with back-compat aliases** — rewrite `app/src/tokens.css` so every
old token name remaps to the nearest new value, reskinning all ~96 components at once with
zero per-component edits — then a small set of targeted re-skins for the signature surfaces.

User priority is explicit (asked for it directly; emphasized the **font/numeral** change).
Honors `vision/ux-direction.md` tension: **home stays dense**, **section-detail goes
immersive** (sky hero). Keeps the accessibility floor (status = color **+ text label**).

## Typography (the headline change)

- Out: **Ubuntu** (UI) + **Fira Code** (mono). In: **Manrope** (UI), **Inter** numerals
  (mapped onto digits via `FlowNum` `unicode-range`), **Spline Sans Mono** (instrument/data).
- `--font-sans` / `--font-mono` lead with `"FlowNum"` so every digit renders Inter while
  letters fall through to Manrope / Spline.
- Manrope self-hosted (`app/public/fonts/Manrope-VariableFont_wght.ttf`); Inter + Spline via CDN.
- Replace all hardcoded `'Ubuntu'` / `'Fira Code'` strings with `var(--font-*)`.

## File-by-file

### Phase A — tokens & fonts (app-wide swap)
- `app/public/fonts/Manrope-VariableFont_wght.ttf` — added (self-host). *(done)*
- `app/src/tokens.css` — REWRITE: new canonical tokens (OKLCH flow/alpine/ink/status/snow,
  sky gradients, scrims, module fills, new radii/shadows/glow/blur, `--s-*` spacing, `--t-*`
  type, Manrope/Inter/Spline font stacks) **+ a back-compat alias block** mapping every old
  name still referenced: `--bg-*`, `--bg-base`, `--ink-0..5`, `--rule(-strong)`,
  `--river-50..900`, the five status quads (`-bg/-fg/-line/-solid`), `--green/red/amber/orange/accent-*`,
  `--trend-*`, `--r-*` (rounder values, same names), `--shadow-card/raise/press`, `--fs-*`,
  `--ls-*`, `--sp-*`, `--ease`, `--dur-*`.
- `app/src/global.css` — keep; body already uses `var(--font-sans)`. Bump base to 16px;
  skeleton shimmer auto-reskins via aliases.
- Hardcoded font fixes → `var(--font-mono)` / `var(--font-sans)`:
  `desktop/DesktopFlowChart.tsx` (×5), `mobile/MobileFlowChart.tsx` (×5),
  `components/RiverMap.tsx` tooltip HTML (×2).

### Phase B — signature re-skins
- `components/StatusPill.tsx` — drop the decorative dot (new system: no decorative dots);
  keep color + label, size API.
- `constants.ts` — `STATUS_LABEL` to the calm vocabulary: ideal→**Optimal**, runnable→**Runnable**,
  high→**Elevated**, dangerous→**Flood**, low/too-low/no-flow→**Too low**. (Display only; keys unchanged.)
- `components/BigCFS.tsx` — numerals to light weight (300) for the airy hero feel.
- `components/FlowGauge.tsx` — NEW: port the morphing "cut-circle" vessel from
  `design/.../charts.jsx`; props `currentFlow` + `thresholds` (→ `{goodLow,goodTop,highMax}`),
  `size`, `onMap`. Use on the section-detail hero alongside `BigCFS`. `RangeGauge` stays (auto-reskinned).
- Section-detail hero: a subtle `--sky-river` gradient header band with white hero stat
  (detail only — home stays dense).

### Phase C — docs
- `.plans/vision/ux-direction.md` — update "Visual language" section to the new system; record
  the home-dense / detail-immersive resolution; keep accessibility floor.

## Acceptance criteria
- `npm run ui:build` succeeds; no TS errors. `npm test` still green.
- App renders in **Manrope**, numerals in **Inter**, mono/data in **Spline** — no Ubuntu/Fira Code anywhere.
- Palette is flow-blue / alpine / ink; radii rounder; status pills dot-less with new labels.
- No unresolved `var()` (every old token aliased). Verified at desktop + mobile on `/`, `/section/:id`, `/map`.

## Verification
- `npm run ui:build` && `npm test`
- Launch (vite dev or built `web/`), screenshot `/`, a section detail, `/map` at desktop + mobile widths.
- grep app/src for `Ubuntu` / `Fira Code` → only comments, if any.

## Risks
- OKLCH = modern browsers only (acceptable). Alias coverage must be complete — build + a
  var-resolution pass catches misses. Don't ship worktree `web/` artifacts (L001).
