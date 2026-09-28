# Layout

Layout decides what people see first and how they move through the page. Work mobile-first,
build on one grid, and let the VARIANCE and DENSITY dials ([direction.md](direction.md)) decide
how much you depart from it.

## Contents

1. Containers and gutters
2. Grids
3. Section rhythm
4. Asymmetry on purpose
5. Responsive: mobile-first, breakpoints, container queries
6. Viewport units
7. Media
8. Preventing overflow
9. Density
10. Checklist

---

## 1. Containers and gutters

Use a small set of container widths as tokens rather than per-section `max-width` values:

```css
:root {
  --container: 1200px;        /* default content width */
  --container-wide: 1440px;   /* full-bleed-ish grids, galleries */
  --container-text: 68ch;     /* long-form reading */
  --gutter: clamp(16px, 4vw, 48px);
}
.container {
  inline-size: min(100% - 2 * var(--gutter), var(--container));
  margin-inline: auto;
}
```

`min(100% - 2 * gutter, max)` gives edge padding on phones and a capped width on desktop in one
line, with no media query. The side gutter on phones should be at least 16 px.

For pages that mix text columns with full-bleed images, a named-line grid saves wrappers:

```css
.page {
  display: grid;
  grid-template-columns:
    [full-start] minmax(var(--gutter), 1fr)
    [content-start] min(100% - 2 * var(--gutter), var(--container)) [content-end]
    minmax(var(--gutter), 1fr) [full-end];
}
.page > * { grid-column: content; }
.page > .bleed { grid-column: full; }
```

## 2. Grids

- A 12-column grid divides cleanly into 2, 3, 4 and 6. Use it for page-level structure, and
  simpler grids inside components.
- Let content decide column counts where possible; this grid needs no breakpoints:

```css
.cards { display: grid; gap: var(--space-5);
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr)); }
```

The inner `min(100%, 18rem)` stops the minimum from overflowing a narrow phone.

- Use `gap`, not margins on children, for spacing inside grids and flex rows.
- Align to shared edges. Most "something looks off" feedback is two things that almost line up.
  Text in a card should align with the heading above the card grid, not float 3 px inside it.
- Use `subgrid` when card internals (title, text, button) must align across a row.

## 3. Section rhythm

A long page is a sequence of sections; its rhythm is how they vary.

- **Vary the layout families.** Alternate between full-bleed media, text-led, split (text +
  image), grid/list, and a single statement. A page where every section is "heading + three
  cards" has no rhythm. Aim for at least three or four different families across a landing page.
- **Vary the spacing deliberately.** Most sections share one padding step; the hero and one
  showpiece get more. Related sections can sit closer together than unrelated ones.
- **Signal changes of topic** with a background shift (bg → surface), a rule, or a change in
  layout family — pick one method and reuse it.
- **One focal point per viewport.** Run the Squint test at each scroll step of the capture
  filmstrip (`capture.mjs --motion` writes `scroll-<viewport>-<n>.png`).
- **Keep the hero honest.** A hero is the headline, a sentence of support, one primary action
  (plus one secondary at most) and a visual that shows the real product or subject. It doesn't
  have to fill the full viewport height; the next section peeking in tells people to scroll.

## 4. Asymmetry on purpose

Above VARIANCE 4, avoid centering everything. Asymmetry creates direction and tension:

- Split columns unevenly: 7/5 or 8/4 instead of 6/6.
- Left-align the hero text and let the visual take the larger column, or cross the grid.
- Offset one element (an image that starts in column 2 and bleeds past the right edge).
- Let one oversized headline run wider than the text column below it.
- Keep one axis stable (a shared left edge or baseline) so the page still feels organized.

Asymmetry must survive mobile: most asymmetric desktop grids collapse to a single column, so
decide what stays visible and in what order. Check that the DOM order (which sets reading and
focus order) matches the visual order at every size; don't use `order` or grid placement to
make them disagree.

## 5. Responsive: mobile-first, breakpoints, container queries

**Mobile-first**: write the single-column layout as the default and add complexity with
`min-width` queries. The phone layout is designed, not the desktop layout squeezed.

**Breakpoints** come from content (where the layout starts to strain), not device lists. A
common starting set:

| Token | Width | Typically |
|---|---|---|
| `--bp-sm` | 40rem (640px) | Two-column cards, inline forms |
| `--bp-md` | 48rem (768px) | Tablet: sidebars appear, nav may expand |
| `--bp-lg` | 64rem (1024px) | Full desktop grid |
| `--bp-xl` | 80rem (1280px) | Wider containers, larger display type |

(Custom properties can't be used inside `@media` conditions; write the values literally and
keep them in sync with this table, or use your framework's breakpoint config.)

**Container queries** make a component respond to its own space instead of the viewport, so the
same card works in a sidebar and a main column:

```css
.card-slot { container-type: inline-size; }
@container (min-width: 28rem) {
  .card { display: grid; grid-template-columns: 10rem 1fr; }
}
```

Use viewport media queries for page structure and container queries for components. Container
units (`cqi`) can size type inside a component relative to its container.

Capture at 390, 768 and 1440 px (the `capture.mjs` defaults), and resize through the in-between
widths once: layouts often break at 900–1000 px, between the tablet and desktop designs.

## 6. Viewport units

`100vh` on mobile is the height with the browser toolbar hidden, so a `100vh` hero is taller than
the visible screen and content hides under the toolbar (UC006).

| Unit | Meaning | Use for |
|---|---|---|
| `svh` | Smallest viewport (toolbars shown) | Heroes that must fit fully on first view |
| `lvh` | Largest viewport (toolbars hidden) | Backgrounds that must never show a gap |
| `dvh` | Dynamic, updates as toolbars move | Full-height app shells; avoid for large animated sections (it resizes during scroll) |

```css
.hero { min-block-size: 100svh; }                   /* fits on first view */
.app  { block-size: 100dvh; }                       /* app shell */
```

Prefer `min-block-size` over `block-size` for content sections so text can grow. Pair full-screen
layouts with `env(safe-area-inset-*)` padding when content reaches the edges on notched phones
(needs `viewport-fit=cover` in the viewport meta).

## 7. Media

- **Reserve space** for every image, video and embed so nothing shifts when it loads: set
  `width` and `height` attributes on `<img>` (the browser derives the ratio) or use
  `aspect-ratio` in CSS for containers.

```css
.media { aspect-ratio: 16 / 9; inline-size: 100%; object-fit: cover; }
```

- Use `object-fit: cover` with `object-position` to control the crop; check the crop at each
  viewport, since faces and products get cut off on narrow screens.
- Serve responsive sizes (`srcset` + `sizes`, or the framework image component) and modern
  formats (AVIF/WebP). Lazy-load below-the-fold images (`loading="lazy"`); don't lazy-load the
  hero image; give it `fetchpriority="high"` instead.
- Placeholders: when real images aren't available, use a deliberate placeholder (a tinted block
  with the fixed ratio and a label like "Product photo, 4:3") and list them for the user. Never
  leave broken image links.

## 8. Preventing overflow

Horizontal scroll at 390 px is a floor failure. The usual causes and fixes:

| Cause | Fix |
|---|---|
| Flex/grid children refusing to shrink (long words, code, tables) | `min-width: 0` on the flex child; `minmax(0, 1fr)` instead of `1fr` in grids |
| Long URLs, emails, user content | `overflow-wrap: anywhere` |
| Fixed widths (`width: 600px`) | `max-inline-size: 100%` or `min(600px, 100%)` |
| Wide tables and code blocks | Wrap in a container with `overflow-x: auto` so only that block scrolls |
| `100vw` elements (vw includes the scrollbar width) | Use `100%` or the full-bleed grid in section 1 |
| Decorative elements positioned off-canvas | Clip their section with `overflow: clip` |
| Oversized display type | Fluid `clamp()` sizes; test the longest real word at 390 px |

Prefer `overflow-x: clip` over `overflow-x: hidden` on wrappers: `hidden` creates a scroll
container, which breaks `position: sticky` inside it. Don't hide overflow on `body` to mask a
bug; find the element (the capture report lists elements wider than the viewport).

## 9. Density

The DENSITY dial changes layout, not just padding:

| Density | Layout moves |
|---|---|
| 1–3 | One idea per viewport, large media, 96–160 px sections, text column narrow and centered or offset |
| 4–6 | 2–3 column grids, 64–112 px sections, cards or media-text splits |
| 7–8 | Sidebars, tables, compact lists; 36–44 px row heights; separators instead of cards |
| 9–10 | Multi-pane dashboards; 4 px rhythm; hairline rules; data in mono with tabular numbers |

Dense layouts still need grouping: whitespace between groups, alignment within groups. Dense
doesn't mean cramped.

## 10. Checklist

- [ ] Containers and gutters from tokens; ≥ 16 px side gutter on phones.
- [ ] Mobile layout designed first; DOM order matches visual order at every size.
- [ ] Sections vary in layout family; one focal point per viewport.
- [ ] Components that live in different contexts use container queries.
- [ ] No `100vh` heroes; `svh`/`dvh` chosen on purpose.
- [ ] Every image/video/embed has reserved space (`width`/`height` or `aspect-ratio`).
- [ ] No horizontal scroll at 390 px (capture report clean); long content wraps or scrolls in place.
