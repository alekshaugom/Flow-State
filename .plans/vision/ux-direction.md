# UX direction

How Flow-State should feel, and the visual principles that constrain every slice.

## Anchors

1. **Map-first when spatial.** The map is not a feature; it's the primary mode of navigating watersheds and corridors. Zoom level drives what's visible.
2. **Dense when scanning.** The home dashboard's job is to show many sections at once with enough info to decide. No big hero cards on home.
3. **Interpretive when single-section.** A section detail page leads with what the flow *means*, not just what it is.
4. **Editorial > generated.** LLM-drafted summaries are clearly tagged as drafts until a human approves. Especially for safety-relevant text.
5. **Mobile parity.** The site is checked before driving to a river. Mobile is not a degraded desktop.

## Visual language (existing tokens — keep)

- **Type**: Ubuntu (UI) + Fira Code (numbers / mono)
- **Status palette**: 5 scales (low / runnable / ideal / high / dangerous), each with `bg / fg / line / solid` variants — see `tokens.css`
- **Surface**: layered inks (`--bg-canvas` / `--bg-app` / `--bg-card` / `--bg-raised` / `--bg-sunken`)
- **Eyebrow pattern**: small all-caps label above headings (`// SUMMARY`, `WATERSHED · MAY 13`)
- **Inline styles via React.CSSProperties**, no Tailwind / CSS modules

Don't drift from these. New components should compose from the same tokens.

## New visual primitives (slice 01+)

- **Craft chip** — pill with paddle/oar/kayak icon, 28px tall, mono label
- **Driver indicator** — vertical bar with % fill + monospace number + label ("SNOWMELT 78%")
- **Weather cell** — 56×72 card: sky icon (24px) + `52°/38°` mono + precip drop + one-word note
- **Interpretive card** — tinted background, `// SUMMARY` eyebrow, body in Ubuntu 14/16 line-height 1.6, "drafted [date]" subscript, "Edit" affordance for admins
- **Band chip** — large pill: color swatch + 1-line label + 2-line description. Same family as status pill.
- **Breadcrumb** — monospaced, separator ` / ` in `--ink-4`
- **ContextItem card** — severity-colored left border, kind icon, title/body, "Source: BOR · [link]"
- **RiverLogCard** — mirrors `RiverCard.tsx` proportions. Eyebrow `// LOGGED · YYYY-MM-DD`. Craft chip + crew + duration line. Flow-at-trip chip (`ran at 396 cfs · runnable` or `ran at — cfs` when null). Conditions tag chips. 3-line notes preview, click-to-expand. Edit/delete in corner. Footer when profile present: `<background> · <skill> · <yrs> yrs · +<prior> prior trips`.
- **HomeCardLoggedBadge** — top-right corner-of-card mono `// N TRIPS` in `--ink-3`. Corner badge only — no other change to home cards.
- **Conditions tag chips** — chip multi-select with curated suggestions (`tons-of-rock`, `frequent-highsides`, `precision-oar-required`, `advanced-maneuvers`, `mellow-float`, `cold-water`, `crowded`, `pristine`, `wind`, `swam`) + free-form add. Same chip family as craft chip.
- **PastTripsStrip** — section-detail strip. Eyebrow `// PAST TRIPS · N LOGGED` + up to 3 stacked `RiverLogCard`s + "See all N trips" link. If 0 logs: quiet `// LOG YOUR FIRST TRIP` CTA chip.

## Information hierarchy per route

| Route | Lead with | Then | Then |
|---|---|---|---|
| `/` | Watershed-grouped sidebar | Status filter strip | Detail pane (one section) |
| `/watershed/:slug` | 150w interpretive summary + map zoomed to basin | Corridor grid | Drivers + weather summary |
| `/corridor/:slug` | Corridor map + section list ordered upstream→downstream | Weather strip | Access points |
| `/section/:slug` | Hero stat strip | Combined history+forecast chart + weather strip | FlowBand interpretation w/ craft selector |
| `/section/:slug/rapid/:rapidSlug` | Name + class + mile + satellite map | Description, line notes, hazards | Photos by flow (phase 2) |
| `/section/:slug/logs` | Eyebrow + all-trips count | Vertical stack of user's `RiverLogCard`s, newest first | (no chrome) |
| `/log/new` | Section name + date | Full-page form: craft / crew / duration / put-in / take-out / conditions / notes | Submit → section detail |
| `/log/:id/edit` | Same as `/log/new` prefilled | — | — |
| `/profile` | Eyebrow `// YOUR PROFILE` | Skill / years / background / home watershed form | — |
| `/map` | Full-screen map with tile toggle + layer toggles | (no chrome) |

## Chart UX

- One continuous chart per section: history → present marker → forecast → confidence ribbon
- Weather strip aligned to the forecast x-range, below the chart
- Range picker: `(history: 7 / 30 / 90 / 180 / 365) × (forecast: 7 / 14)`
- Forecast band crossings rendered as 2–3 plain-language bullets: "Crosses into Ideal Tue afternoon"
- Confidence indicator near forecast region: "Confidence: medium (snowmelt + 5-day NWS)"
- All crafted with custom SVG — don't bring in recharts or another lib; the custom impl is polished

## Map UX

- Tile selector dock: CartoDB Positron (default) / USGS Topo / Esri Satellite / OSM fallback
- Zoom-adaptive layers:
  - z ≤ 8: watershed polygons + corridor lines (low fidelity)
  - z 9–10: corridor + section lines + gauges
  - z ≥ 11: + access points + rapids
- Toggleable overlays: weather (point icons), snowmelt (placeholder slice 1)
- Tooltip with embedded sparkline (extract today's inline HTML to React `<Popup>`)
- Deep-link focus: `/map?focus=corridor:arkansas-headwaters`

## What we will NOT do (UX)

- **No animated transitions for data display.** Numbers should change immediately on craft/skill toggle. Smooth animations are theater.
- **No light/dark theme split until requested.** Use the existing tokens.
- **No infinite scroll on the section list.** Pagination if needed, otherwise filter.
- **No modals for content.** Use full-page navigation. Modals are for confirms and tooltips only.
- **No fluffy copy.** "Likely rising" not "It looks like flows may be rising soon!"
- **No "back to top" buttons.** Pages should be short enough that the user reaches the bottom intentionally.

## Mobile parity strategy

Every new component takes a `compact` prop or uses container queries / responsive flex. Desktop pages and mobile pages call the *same* components — only the page-shell wrapper differs. Don't fork features.

The current `ResponsiveHome` / `ResponsiveSection` pattern in `app/src/App.tsx` continues; each new route adds a `ResponsiveX` wrapper.

## Accessibility floor (slice 1+)

- All charts have a text alternative (a hidden `<table>` with values, or aria-label summarizing trend)
- All interactive elements reachable via keyboard
- Color is never the sole carrier of meaning (status uses color + icon + text label)
- Contrast ratio AA at minimum for body text

Don't gold-plate accessibility — meet AA, don't audit for AAA until users surface specific issues.
