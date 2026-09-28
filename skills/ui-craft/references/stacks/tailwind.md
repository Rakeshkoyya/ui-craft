# Stack: Tailwind CSS (v4)

Tailwind is a way to apply tokens, not a replacement for them. Define the design system once in
`@theme`, then use utilities that read it. This file covers Tailwind v4 (CSS-first
configuration). If the project is on v3 (`tailwind.config.js` with `theme.extend`), keep v3
conventions or migrate deliberately with the official upgrade tool; don't mix the two.

## Setup

```css
/* app.css (Vite: @tailwindcss/vite plugin; Next/others: @tailwindcss/postcss) */
@import "tailwindcss";
```

Check the current install steps for your framework in the Tailwind docs before adding it.

## Tokens in `@theme`

Variables in `@theme` become both CSS custom properties and utilities. The namespace decides
which utilities: `--color-*` → `bg-*`, `text-*`, `border-*`…; `--font-*` → `font-*`; `--text-*` →
text sizes; `--spacing` → spacing scale; `--radius-*` → `rounded-*`; `--shadow-*` → `shadow-*`;
`--ease-*` → `ease-*`; `--animate-*` → `animate-*`; `--breakpoint-*` → responsive variants.

Keep the semantic layer in plain CSS (so it can switch per theme), and expose it to Tailwind with
`@theme inline`, which makes utilities use the variable reference rather than a copied value:

```css
@import "tailwindcss";

/* 1. Semantic tokens (switch per theme) */
:root {
  color-scheme: light dark;
  --bg:      light-dark(oklch(0.975 0.008 200), oklch(0.16 0.015 200));
  --surface: light-dark(oklch(0.995 0.004 200), oklch(0.2 0.018 200));
  --text:    light-dark(oklch(0.22 0.025 200), oklch(0.92 0.01 200));
  --muted:   light-dark(oklch(0.47 0.025 200), oklch(0.72 0.02 200));
  --line:    light-dark(oklch(0.89 0.015 200), oklch(0.32 0.02 200));
  --brand:   light-dark(oklch(0.52 0.13 200), oklch(0.76 0.11 200));
  --on-brand: light-dark(oklch(0.99 0.005 200), oklch(0.16 0.015 200));
}

/* 2. Static scales (the reset must come before any --color-* you add) */
@theme {
  --color-*: initial;           /* optional: remove default palette so only tokens exist */
  --spacing: 0.25rem;           /* 4px base: p-4 = 16px */
  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px;
  --text-display: clamp(2.6rem, 1.8rem + 4vw, 4.75rem);
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --shadow-card: 0 1px 2px oklch(0.2 0.02 200 / 0.06), 0 4px 12px oklch(0.2 0.02 200 / 0.08);
}

/* 3. Expose them as utilities: bg-bg, bg-surface, text-muted, border-line, bg-accent, text-on-accent */
@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-fg: var(--text);
  --color-muted: var(--muted);
  --color-line: var(--line);
  --color-accent: var(--brand);
  --color-on-accent: var(--on-brand);
  --font-display: var(--font-display-family);
  --font-sans: var(--font-body-family);
}
```

Removing the default palette (`--color-*: initial`) stops stray `bg-indigo-500` classes (UC005)
from compiling. If you keep the defaults, don't use them in components.

Motion tokens: load `assets/motion/tokens.css` normally, and expose only what utilities need
(`--ease-out` above gives `ease-out`). Use arbitrary values for durations:
`duration-(--dur-base)`. `(--var)` is v4 shorthand for `[var(--var)]`.

## Fonts

Load fonts with the framework's tool (next/font, @nuxt/fonts, Fontsource) and point `@theme`
at the resulting variables with `@theme inline` (as above). For `next/font`, set
`variable: "--font-display-family"` and add the class to `<html>`.

## Dark mode

By default `dark:` follows `prefers-color-scheme`. With `light-dark()` tokens you rarely need
`dark:` at all. For a manual toggle:

```css
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
```

…and set `color-scheme` on the same attribute so `light-dark()` follows it
(`[data-theme=dark] { color-scheme: dark; }`).

## Motion utilities

- Name properties: `transition-colors`, `transition-transform`, `transition-opacity`,
  `transition-[transform,opacity]`. Never `transition-all` (UC001).
- Reduced motion: `motion-safe:animate-…` and `motion-reduce:transition-none`. Better, keep
  motion in tokens that collapse under reduced motion.
- Custom keyframes live in `@theme`:

```css
@theme {
  --animate-rise: rise var(--dur-slow) var(--ease-out) both;
  @keyframes rise { from { opacity: 0; transform: translateY(var(--dist-md)); } }
}
```

- Full-height sections: `min-h-svh` / `min-h-dvh`, not `h-screen` (UC006).

## Component classes and custom utilities

- Repeated long class lists belong in a component (React/Vue/Svelte), not `@apply` everywhere.
- For small reusable CSS, use `@utility name { … }` or `@layer components { … }` reading tokens.
- Focus: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`
  on every interactive element; never `outline-none` alone (UC004).

## Pitfalls

- Dynamic class names (`bg-${color}-500`) aren't detected by the scanner. Map to full class
  strings. Add sources outside the project root with `@source`.
- Arbitrary values everywhere (`p-[13px]`, `text-[#3a3a3a]`) bypass the system. If you need a
  value twice, add a token.
- Third-party kits built on Tailwind (shadcn/ui and ports) define their own CSS variables; map
  those to your semantic tokens instead of keeping two sets ([components.md](../components.md)).
- Preflight resets headings and lists to unstyled; set base typography in `@layer base`.
