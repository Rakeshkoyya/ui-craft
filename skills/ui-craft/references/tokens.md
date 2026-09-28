# Tokens

Tokens are the design decisions written down once, as CSS custom properties, so that every
component draws from the same small set of values. If a value appears in a component and not
in the tokens, it's either a mistake or a missing token.

## Contents

1. Architecture: primitive → semantic → component
2. Color roles
3. Building a palette in OKLCH from one hue
4. Dark mode
5. Spacing
6. Radius
7. Shadows and elevation
8. Z-index
9. Motion tokens
10. Example `tokens.css`
11. Checking tokens

---

## 1. Architecture: primitive → semantic → component

Three layers, each allowed to reference only the layer above it:

| Layer | Example | Who uses it |
|---|---|---|
| **Primitive** — raw values, named by what they are | `--clay-600: oklch(0.52 0.12 45)` | Only the semantic layer |
| **Semantic** — named by role | `--color-accent: var(--clay-600)` | Components and page CSS |
| **Component** — optional, for values one component needs to expose | `--button-radius: var(--radius-md)` | That component, and themes overriding it |

Why: when the brand hue changes, you edit primitives; when dark mode flips, you remap semantics;
components never change. Components that use `--clay-600` directly break both.

Naming: roles, not colors (`--color-accent`, not `--color-orange`). Name primitives after the
domain when that helps the Token test in [direction.md](direction.md): `--ink`, `--paper`,
`--kiln` say more than `--gray-900`.

## 2. Color roles

Define every role below. Most sites need no more; resist adding a second accent.

| Role | Purpose | Must contrast with |
|---|---|---|
| `--color-bg` | Page background | — |
| `--color-surface` | Cards, panels, inputs sitting on the page | — |
| `--color-raised` | Popovers, menus, dialogs above surfaces | — |
| `--color-text` | Body and headings | bg, surface, raised ≥ 4.5:1 |
| `--color-muted` | Secondary text: captions, metadata, placeholders | bg and surface ≥ 4.5:1 |
| `--color-border` | Dividers, input outlines, card edges | Input borders ≥ 3:1 against their background (non-text contrast); decorative dividers can be lower |
| `--color-accent` | Primary action, links, the one highlight | bg ≥ 3:1 when it is a button fill or icon; ≥ 4.5:1 when it colors text |
| `--color-accent-text` | Text/icons placed on the accent fill | accent ≥ 4.5:1 |
| `--color-accent-hover` | Hover/pressed state of accent | same as accent |
| `--color-focus` | Focus ring | ≥ 3:1 against every background it appears on |
| `--color-success`, `--color-warn`, `--color-danger` | Status. Each with a `-text` (on bg) and `-surface` (tinted background) variant | Text variants ≥ 4.5:1 on bg |

Rules that prevent most color problems:

- **One accent.** Hierarchy comes from size, weight and the text/muted split, not from more hues.
  A 60/30/10 split (neutrals / surfaces / accent) is a good sanity check.
- **Tinted neutrals.** Push bg, surface, border and muted slightly toward the brand hue
  (chroma 0.005–0.02 in OKLCH). Pure greys next to a colored accent look unrelated.
- **No pure black or white** for large areas. `#000` text on `#fff` is harsh and flags UC014;
  use something like `oklch(0.2 0.01 h)` on `oklch(0.985 0.005 h)`.
- **Status colors are not decoration.** Don't reuse danger-red as the brand accent.
- **Links in body text** need a non-color cue (underline) — see [accessibility.md](accessibility.md).

## 3. Building a palette in OKLCH from one hue

OKLCH (`oklch(L C H)`) is perceptually even: equal steps in L look like equal steps in
lightness at any hue, which HSL doesn't give you. That makes derived scales and contrast
predictable.

- **L** lightness 0–1. Text on light backgrounds lives around 0.2–0.3; light backgrounds 0.96–0.99.
- **C** chroma, 0 (grey) to about 0.37. Most UI accents sit at 0.10–0.20. Very high chroma can
  fall outside sRGB and be clipped on ordinary screens.
- **H** hue angle 0–360 (roughly: 25 red, 70 orange, 100 yellow, 145 green, 200 cyan, 260 blue,
  300 purple, 350 pink).

Derive the whole palette from one brand hue:

```css
:root {
  --hue: 45;  /* one number: change it and the palette follows */
  --paper:  oklch(0.975 0.008 var(--hue));
  --card:   oklch(0.995 0.004 var(--hue));
  --line:   oklch(0.88  0.015 var(--hue));
  --ink-2:  oklch(0.47  0.02  var(--hue));
  --ink:    oklch(0.22  0.02  var(--hue));
  --brand:  oklch(0.55  0.15  var(--hue));
  --brand-hover: oklch(from var(--brand) calc(l - 0.06) c h);
}
```

Notes:

- Different hues reach different maximum chroma at a given lightness (yellow is only vivid when
  light; blue only when darker). After changing `--hue`, re-run the contrast check.
- `oklch(from …)` (relative color syntax) and `color-mix(in oklch, a, b)` let you derive hover,
  tints and borders without new primitives. Both are supported in current evergreen browsers;
  if you must support older ones, precompute the values.
- A curated palette from `search.py --domain palettes` gives hex starting points. Convert them
  into your roles, then nudge toward the color world from your domain exploration.

## 4. Dark mode

Dark mode is a second mapping of the semantic layer, not an inversion.

- **Don't invert.** Inverted palettes make accents glow, turn shadows into halos and ruin
  photography. Design the dark values.
- **Background is not black.** Use a very dark tinted color (L ≈ 0.14–0.2). It leaves room for
  depth below and avoids smearing on OLED screens when scrolling.
- **Elevation by lightness.** Shadows barely read on dark backgrounds, so each raised layer gets
  a little lighter (bg 0.16 → surface 0.2 → raised 0.24). Keep a subtle border on raised layers.
- **Lower chroma, raise lightness** for the accent (for example L 0.72 instead of 0.55) and
  flip `--color-accent-text` to a dark value if needed for contrast.
- **Soften text.** Body text around L 0.9–0.93 rather than pure white reduces glare.
- **Tell the browser.** `color-scheme` makes form controls, scrollbars and system colors match:

```css
:root { color-scheme: light dark; }            /* follow the OS */
:root[data-theme="light"] { color-scheme: light; }
:root[data-theme="dark"]  { color-scheme: dark; }
```

`light-dark()` picks a value based on the used color scheme, so one declaration covers both
themes and a manual toggle works by only changing `color-scheme`:

```css
:root {
  color-scheme: light dark;
  --color-bg:   light-dark(oklch(0.975 0.008 45), oklch(0.17 0.012 45));
  --color-text: light-dark(oklch(0.22 0.02 45),   oklch(0.92 0.01 45));
}
```

If you need older browsers, use `@media (prefers-color-scheme: dark)` plus a
`[data-theme="dark"]` selector instead. Also add `<meta name="theme-color">` values for both
schemes, and set the theme attribute before first paint (inline script in `<head>`) to avoid a
flash of the wrong theme. Capture with `capture.mjs --dark` to check it.

## 5. Spacing

Use one scale on a 4 px base. Every margin, padding and gap comes from it.

| Token | Value | Typical use |
|---|---|---|
| `--space-1` | 4px | Icon-to-label gap |
| `--space-2` | 8px | Tight groups, chip padding |
| `--space-3` | 12px | Input padding, compact rows |
| `--space-4` | 16px | Default gap, card padding on mobile, page gutter on phones |
| `--space-5` | 24px | Card padding, gaps between related blocks |
| `--space-6` | 32px | Gaps between groups |
| `--space-7` | 48px | Between sub-sections |
| `--space-8` | 64px | Section padding (dense) |
| `--space-9` | 96px | Section padding (standard) |
| `--space-10` | 128px | Section padding (airy), hero breathing room |

Rules: spacing inside a group is smaller than spacing between groups (proximity is how people
see structure). The DENSITY dial shifts which steps you use: density 2 uses `--space-9`/`-10`
for sections; density 8 uses `--space-6`/`-7`. For fluid section spacing, clamp between two
steps: `padding-block: clamp(var(--space-8), 8vw, var(--space-10));`.

## 6. Radius

Pick one radius personality and derive a small set:

| Personality | sm / md / lg | Fits |
|---|---|---|
| Sharp | 0 / 2px / 4px | Editorial, brutal, technical |
| Soft | 4px / 8px / 12px | Most products |
| Round | 8px / 16px / 24px + `--radius-full: 999px` for pills | Playful, consumer |

Nested elements use concentric radii: inner radius = outer radius − the padding between them.
A 16 px card with 8 px padding holds an 8 px image, not another 16 px one. Mixing radius
personalities on one page is an AI tell.

## 7. Shadows and elevation

Pick one depth strategy for the site and stick to it: **borders only**, **subtle shadows**, or
**layered shadows**. Mixing them makes surfaces feel unrelated.

Tint shadows with the background hue instead of pure black, and layer a tight shadow with a
soft one so the edge is defined:

```css
--shadow-1: 0 1px 2px oklch(0.2 0.02 var(--hue) / 0.08);
--shadow-2: 0 1px 2px oklch(0.2 0.02 var(--hue) / 0.06), 0 4px 12px oklch(0.2 0.02 var(--hue) / 0.08);
--shadow-3: 0 2px 4px oklch(0.2 0.02 var(--hue) / 0.06), 0 12px 32px oklch(0.2 0.02 var(--hue) / 0.12);
```

Elevation levels map to roles: 0 page, 1 cards, 2 dropdowns and sticky headers, 3 dialogs. In
dark mode, express the same levels through lighter surfaces (section 4) and keep shadows faint.
Don't animate `box-shadow` on many elements; animate the opacity of a pseudo-element that
carries the bigger shadow instead (see [motion.md](motion.md)).

## 8. Z-index

A named, small scale ends z-index wars and keeps UC007 (`z-index ≥ 999`) quiet:

```css
--z-base: 0;
--z-raised: 10;     /* sticky table headers, overlapping cards */
--z-sticky: 100;    /* sticky site header */
--z-overlay: 200;   /* drawer/dialog backdrops */
--z-modal: 300;     /* dialogs, drawers */
--z-popover: 400;   /* menus, tooltips, toasts */
```

Many stacking bugs are not z-index problems but stacking-context problems (`transform`,
`filter`, `opacity < 1` and `isolation: isolate` create new contexts). Native `<dialog>` and the
`popover` attribute render in the top layer and need no z-index at all.

## 9. Motion tokens

Durations and easings are tokens too. The canonical set lives in `assets/motion/tokens.css`
(durations `--dur-instant`, `--dur-fast`, `--dur-base`, `--dur-slow`, `--dur-deliberate`;
easings `--ease-out`, `--ease-in-out`, `--ease-exit`, `--ease-emphasized`, `--ease-spring`;
distances `--dist-*`, `--scale-in`, `--stagger`). Load it with your tokens and don't redefine
the names. How and when to use each: [motion.md](motion.md).

## 10. Example `tokens.css`

A complete starting file. Adjust `--hue`, the type families and the radius personality; keep
the structure.

```css
/* tokens.css — primitives, then semantic roles, then theme mapping */
@import url("../assets/motion/tokens.css"); /* or copy it in; path depends on your project */

:root {
  color-scheme: light dark;
  --hue: 200;

  /* Primitives */
  --tide-50:  oklch(0.975 0.008 var(--hue));
  --tide-0:   oklch(0.995 0.004 var(--hue));
  --tide-200: oklch(0.89  0.015 var(--hue));
  --tide-600: oklch(0.47  0.025 var(--hue));
  --tide-900: oklch(0.22  0.025 var(--hue));
  --tide-950: oklch(0.16  0.015 var(--hue));
  --tide-925: oklch(0.2   0.018 var(--hue));
  --tide-875: oklch(0.24  0.02  var(--hue));
  --signal-500: oklch(0.52 0.13 var(--hue));
  --signal-300: oklch(0.76 0.11 var(--hue));

  /* Semantic roles */
  --color-bg:        light-dark(var(--tide-50),  var(--tide-950));
  --color-surface:   light-dark(var(--tide-0),   var(--tide-925));
  --color-raised:    light-dark(var(--tide-0),   var(--tide-875));
  --color-text:      light-dark(var(--tide-900), oklch(0.92 0.01 var(--hue)));
  --color-muted:     light-dark(var(--tide-600), oklch(0.72 0.02 var(--hue)));
  --color-border:    light-dark(var(--tide-200), oklch(0.32 0.02 var(--hue)));
  --color-accent:    light-dark(var(--signal-500), var(--signal-300));
  --color-accent-hover: light-dark(oklch(0.46 0.13 var(--hue)), oklch(0.82 0.1 var(--hue)));
  --color-accent-text:  light-dark(oklch(0.99 0.005 var(--hue)), var(--tide-950));
  --color-focus:     var(--color-accent);
  --color-success:   light-dark(oklch(0.5 0.12 150), oklch(0.78 0.13 150));
  --color-warn:      light-dark(oklch(0.55 0.13 70),  oklch(0.82 0.13 80));
  --color-danger:    light-dark(oklch(0.52 0.18 25),  oklch(0.74 0.15 25));

  /* Type (see typography.md) */
  --font-display: "Familjen Grotesk", ui-sans-serif, system-ui, sans-serif;
  --font-body: "Figtree", ui-sans-serif, system-ui, sans-serif;
  --font-mono: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  --text-sm:   clamp(0.84rem, 0.82rem + 0.1vw, 0.9rem);
  --text-base: clamp(1rem, 0.96rem + 0.2vw, 1.125rem);
  --text-lg:   clamp(1.2rem, 1.1rem + 0.5vw, 1.4rem);
  --text-xl:   clamp(1.5rem, 1.3rem + 1vw, 2rem);
  --text-2xl:  clamp(2rem, 1.6rem + 2vw, 3rem);
  --text-3xl:  clamp(2.6rem, 1.8rem + 4vw, 4.75rem);

  /* Space, radius, depth, layers */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px; --space-5: 24px;
  --space-6: 32px; --space-7: 48px; --space-8: 64px; --space-9: 96px; --space-10: 128px;
  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px; --radius-full: 999px;
  --shadow-1: 0 1px 2px oklch(0.2 0.02 var(--hue) / 0.08);
  --shadow-2: 0 1px 2px oklch(0.2 0.02 var(--hue) / 0.06), 0 4px 12px oklch(0.2 0.02 var(--hue) / 0.08);
  --shadow-3: 0 2px 4px oklch(0.2 0.02 var(--hue) / 0.06), 0 12px 32px oklch(0.2 0.02 var(--hue) / 0.12);
  --z-raised: 10; --z-sticky: 100; --z-overlay: 200; --z-modal: 300; --z-popover: 400;
  --measure: 68ch;
  --container: 1200px;
  --gutter: clamp(16px, 4vw, 48px);
}

:root[data-theme="light"] { color-scheme: light; }
:root[data-theme="dark"]  { color-scheme: dark; }

html { background: var(--color-bg); color: var(--color-text); font-family: var(--font-body); }
:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
```

## 11. Checking tokens

- `python <skill>/scripts/contrast.py --css path/to/tokens.css` resolves `var()` chains, checks
  `light-dark()` tokens in both schemes, and auto-pairs `X-foreground`/`X-text` with `X`; text,
  muted, secondary, accent and link roles with bg/surface; and focus/ring/border-strong with
  bg/surface at 3:1. Roles named `inverse`/`dark` pair only with each other. Each row shows the
  threshold it was held to. Add anything it can't guess with `--pairs`, giving non-text pairs
  (input borders, icons, focus rings) a third field for 3:1:
  `--pairs color-muted:color-surface,color-link:color-bg,color-border:color-bg:3`
  (or `--non-text` to hold every pair in the run to 3:1).
- Themes switched by a class or `[data-theme]` selector instead of `light-dark()`: only the
  first definition of each property is read, so check the other theme by passing resolved values:
  `python <skill>/scripts/contrast.py "oklch(0.47 0.025 200)" "oklch(0.975 0.008 200)"`.
- Grep components for raw hex, `rgb(`, `px` font sizes and ad-hoc shadows. Each hit is a missing
  token or a mistake.
- Record the final values in `.ui-craft/design.md` ([design-memory.md](design-memory.md)).
