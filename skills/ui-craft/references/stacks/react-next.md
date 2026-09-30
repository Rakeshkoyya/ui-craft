# Stack: React and Next.js

Covers React SPAs (Vite) and Next.js (App Router). Tailwind specifics are in
[tailwind.md](tailwind.md). Next.js is ui-craft's default for new sites when no stack is named.

## New site scaffold

Create the app (flags change between releases; check `npx create-next-app@latest --help`):

```
npx create-next-app@latest <site> --ts --app --src-dir --eslint --import-alias "@/*"
npm i gsap @gsap/react        # scenes: ScrollTrigger, MotionPath, SplitText all ship in gsap
npm i motion                  # only if the site uses Motion for UI/layout animation instead
npm i lenis                   # only for motion dial 8+ storytelling pages (motion.md §7)
```

Tailwind is optional: take it if the user or project wants it; tokens stay CSS variables either
way. Pick **one** scene engine (GSAP by default, Motion if the project is already on it).

Layout that keeps the story visible in the code: one component per chapter, named in the
brand's words, rendered on the server; only the scene wrappers are client components.

```
src/
  app/
    layout.tsx               fonts (next/font), tokens, header/footer, one client MotionProvider if needed
    page.tsx                 home: the chapters in the order of the Structure plan
    projects/page.tsx        interior pages, each with its own arc (structure.md §6)
    projects/[slug]/page.tsx
  components/
    chapters/                ColdOpen.tsx, HowWeBuild.tsx, FieldLog.tsx … (server components)
    scenes/                  BuildingScene.tsx: the SVG, authored in its finished state (server-renderable)
    story/                   StoryScroll.tsx, use-story-scroll.tsx (client) + the .js engine files
  styles/
    tokens.css               colour/type/space tokens + the motion language's cssTokens
    story.css                from assets/motion/story/story.css
  content/                   chapter copy as TS objects or MDX, in the founder's voice
```

Wiring a sticky scene (the scene is passed in as server-rendered markup):

```tsx
// src/components/chapters/HowWeBuild.tsx — server component
import { StoryScroll } from '@/components/story/StoryScroll';
import { BuildingScene } from '@/components/scenes/BuildingScene';
import { steps } from '@/content/how-we-build';

export function HowWeBuild() {
  return (
    <StoryScroll label="How we build" layout="stage-right" language="weighty" mode="scrub"
      stage={<BuildingScene />}
      steps={steps.map((s) => ({ id: s.id, content: <><h3>{s.title}</h3><p>{s.body}</p></> }))} />
  );
}
```

Copy the engine files from `assets/motion/story/` into `src/components/story/` (they are plain
ES modules; GSAP is passed in, so no bundler config is needed). `useGSAP` from `@gsap/react`
scopes selectors and reverts every tween and ScrollTrigger on unmount, so App Router navigation
doesn't leak triggers. After fonts load or a route changes the layout, `ScrollTrigger.refresh()`
runs inside the wrapper.

## Where tokens live

- Next.js App Router: `app/globals.css` imported once in `app/layout.tsx`. Put tokens at the top
  (or in `styles/tokens.css` imported from it). Vite: `src/index.css` imported in `main.tsx`.
- Tokens are CSS custom properties. Don't duplicate them into a JS theme object unless a library
  requires one; if it does, have the JS object reference the variables (`"var(--color-accent)"`)
  so there's one source of truth.
- CSS Modules, vanilla CSS, or Tailwind all read the same variables.

## Fonts

Next.js: `next/font` self-hosts Google Fonts at build time, preloads them, and generates a
metric-adjusted fallback (`adjustFontFallback`, on by default) to avoid layout shift.

```tsx
// app/fonts.ts
import { Familjen_Grotesk, Figtree } from "next/font/google";
export const display = Familjen_Grotesk({ subsets: ["latin"], display: "swap", variable: "--font-display" });
export const body = Figtree({ subsets: ["latin"], display: "swap", variable: "--font-body" });

// app/layout.tsx
<html lang="en" className={`${display.variable} ${body.variable}`}>
```

Multi-word names use underscores (`Source_Sans_3`). Non-variable fonts need `weight`. Vite/React:
install Fontsource (`npm i @fontsource-variable/<family>`), import it once in `main.tsx`, and
reference the family in your tokens; or self-host as in [html-css.md](html-css.md).

## Images

Next.js `next/image` reserves space, lazy-loads and serves responsive formats:

```tsx
import Image from "next/image";
<Image src={hero} alt="Wheel room with six students at work" priority sizes="(min-width: 1024px) 50vw, 100vw" />
```

Static imports give width/height automatically; remote images need `width`/`height` (or `fill`
inside a sized, `position: relative` parent) and `images.remotePatterns` in `next.config`. Use
`priority` only on the LCP image. In plain React, use `<img>` with `width`, `height`, `srcset`.

## Route and page transitions

- **Next.js App Router**: React's `<ViewTransition>` (import from `react`) works with App Router
  navigations; wrap page content, name shared elements with the same `name`, and tag links with
  `transitionTypes` for direction. See the Next.js "view transitions" guide and
  `assets/motion/react-view-transition.tsx`. Put the wrapper in each `page.tsx`, not the layout
  (layouts persist, so their enter/exit never fire). Browsers without support navigate normally.
- **Motion library** (`npm i motion`, `import { motion, AnimatePresence } from "motion/react"`):
  for exit animations, layout animations and gestures. Page transition example:
  `assets/motion/motion-react-page-transition.tsx`. Tab indicator with `layoutId`:
  `assets/motion/motion-react-tab-indicator.tsx`.
- Use one JS animation engine per project (Motion or GSAP, not both); two engines fight over the
  same transforms and double the bundle. Principles: [motion.md](../motion.md).

## Reduced motion

```tsx
import { MotionConfig, useReducedMotion } from "motion/react";
// App root: Motion respects the OS setting for transform/layout animations
<MotionConfig reducedMotion="user">{children}</MotionConfig>

// Per component, when you need a different path:
const reduce = useReducedMotion();
<motion.div initial={{ opacity: 0, y: reduce ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} />
```

For CSS and View Transitions, use the media query rules in the motion tokens and recipes. For
hand-written hooks, subscribe to `matchMedia("(prefers-reduced-motion: reduce)")` in an effect.

## SSR, hydration and animation pitfalls

- **Invisible content**: an element server-rendered at `opacity: 0` waiting for a client
  animation stays invisible if JS is slow or fails, and it's invisible to the capture's first
  frames. Prefer CSS entrances, or make sure the initial state is visible when JS is off.
  Check the `t0` frame from `capture.mjs --motion`.
- **Hydration mismatches**: don't read `window`, `matchMedia`, `localStorage`, `Date.now()` or
  random values during render. Read them in `useEffect` (or `useSyncExternalStore` with a server
  snapshot). Theme: set the `data-theme` attribute with a tiny inline script in `<head>` before
  hydration, and add `suppressHydrationWarning` to `<html>`.
- **Client components**: animation libraries and anything using hooks need `"use client"`.
  Keep the boundary small: a client `<Reveal>` wrapper around server-rendered content, not a
  whole page marked client.
- **Scroll state in React state**: updating state on every scroll frame re-renders the tree.
  Use CSS scroll-driven animations, `IntersectionObserver`, or motion values (`useScroll`) that
  bypass React rendering.
- **Layout shift from fonts/images**: use `next/font` and `next/image`; check CLS in the report.
- **Portals**: dialogs and menus from libraries render into portals; make sure the portal root
  inherits the theme (tokens on `:root`, not on a wrapper div).

## Components

Search with `--stack react` (or `--stack next`, which also matches React rows):
`python <skill>/scripts/search.py "combobox" --stack next`. Map library theme variables to your
tokens ([components.md](../components.md)).
