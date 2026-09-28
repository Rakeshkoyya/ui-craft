# Stack: plain HTML + CSS (+ vanilla JS)

For static sites, server-rendered templates (Rails, Django, Laravel, Hugo, Eleventy, Astro
without a UI framework), and web components. Everything in the core references applies
directly; this file covers the wiring.

## Where tokens live

```
styles/
  tokens.css     # primitives + semantic roles + motion tokens (copy of assets/motion/tokens.css or @import)
  base.css       # reset, element defaults, :focus-visible, typography
  layout.css     # containers, grids, sections
  components/*.css
```

Load order matters: tokens → base → layout → components. Use cascade layers to make it explicit
and avoid specificity fights (and `!important`, UC016):

```css
@layer tokens, base, layout, components, utilities;
@import url("tokens.css") layer(tokens);
@import url("base.css") layer(base);
```

For production, concatenate files (or use `<link>` tags in order); chains of `@import` add
round-trips.

## Fonts

Self-host WOFF2 files (download from Google Fonts or install via Fontsource and copy the files)
and declare them yourself:

```html
<link rel="preload" href="/fonts/display-var.woff2" as="font" type="font/woff2" crossorigin>
```

```css
@font-face {
  font-family: "Familjen Grotesk";
  src: url("/fonts/display-var.woff2") format("woff2");
  font-weight: 400 700;
  font-display: swap;
}
```

Add a metric-matched fallback `@font-face` (see [typography.md](../typography.md) §6). If you use
the Google Fonts CSS API instead, add `preconnect` to `https://fonts.googleapis.com` and
`https://fonts.gstatic.com` (the latter with `crossorigin`), and paste the `css_import` line from
the fonts data into your CSS.

## Images

```html
<img src="/img/studio-800.avif"
     srcset="/img/studio-800.avif 800w, /img/studio-1600.avif 1600w"
     sizes="(min-width: 64rem) 50vw, 100vw"
     width="1600" height="1067" alt="Wheel room with six students at work"
     loading="lazy" decoding="async">
```

The hero image: no `loading="lazy"`, add `fetchpriority="high"`. Use `<picture>` for art
direction (a different crop on mobile).

## Page transitions

Multi-page sites get smooth navigations natively with cross-document View Transitions (same
origin, supporting browsers; others just navigate normally):

```css
@view-transition { navigation: auto; }
```

Recipes, shared-element naming and the reduced-motion rule: `assets/motion/view-transition-cross-document.css`.
For in-page state changes, wrap the DOM update in `document.startViewTransition()` with a
feature check: `assets/motion/view-transition-same-document.js`. Principles: [motion.md](../motion.md).

## Reduced motion

Put motion inside a no-preference query, so the default is still:

```css
@media (prefers-reduced-motion: no-preference) {
  .reveal { animation: reveal var(--dur-slow) var(--ease-out) both; }
}
```

```js
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
function shouldAnimate() { return !reduce.matches && document.documentElement.dataset.motion !== "off"; }
```

Check `shouldAnimate()` before starting any JS-driven animation (WAAPI, scroll effects, libraries).

## Scroll reveals without jank

- Use `IntersectionObserver`, never a scroll listener that measures elements (UC017).
- Content must be visible without JS: add a class like `js` to `<html>` from an inline script and
  hide reveal targets only under `.js`, so a script failure never leaves text invisible.
- Snippets: `assets/motion/reveal-on-scroll.css` + `.js`.

## Web components

- Custom properties pierce shadow DOM, so components can read `var(--color-accent)` directly.
  Expose style hooks with `::part()` for anything else.
- Form-associated custom elements need `ElementInternals` to participate in forms and labels;
  prefer native inputs when possible.

## Common pitfalls

- Missing `<meta name="viewport" content="width=device-width, initial-scale=1">`. Don't add
  `maximum-scale` or `user-scalable=no` (UC018).
- Forgetting `lang` on `<html>` and a unique `<title>` per page.
- `100vh` heroes (UC006): use `min-height: 100svh`.
- Icons as inline SVG without `aria-hidden="true"` (decorative) or a title/label (meaningful).
- jQuery-era `slideDown()` style animations of height (UC002): use the grid-rows technique or skip.
- Serving the site from `file://` for capture: fine for static pages (`capture.mjs index.html`),
  but relative font URLs and View Transitions need a real server (`npx serve .`).
