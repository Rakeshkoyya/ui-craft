# Motion

Motion is where a site stops looking like a template and starts feeling made. It is also where
most generated UIs go wrong: everything fades up, everything takes the same 300 ms, nothing is
honest about what changed. This file is the working guide. Snippets live in `assets/motion/`;
find one with `python <skill>/scripts/search.py "<effect>" --domain motion`. Scroll storytelling —
turning each chapter into a motion graphic, choosing the medium, and the scene engine in
`assets/motion/story/` — is in [storytelling-motion.md](storytelling-motion.md).

## 1. Every animation needs a job

Before writing an animation, name its job. If you can't, delete it.

| Job | What it tells the user | Examples |
|---|---|---|
| **Orientation** | where am I, where did I come from | page transitions, shared-element morphs, a drawer sliding from the edge it lives on |
| **Feedback** | the system heard you | press states, toggles, a saved checkmark, a tab indicator moving |
| **Continuity** | this is the same thing, changed | list reorder (FLIP), accordion opening in place, a card expanding into a detail view |
| **Hierarchy** | look here first | hero load sequence, one staggered group, a count-up on the key stat |
| **Delight** | this was made with care | magnetic CTA, cursor glow, a marquee of logos |

Delight is the most expensive category — it costs attention and performance and ages fastest.
Spend it in one or two places per page, on things users see once (hero, primary CTA), never on
things they use repeatedly (nav, form fields, table rows).

Rules that follow from this:

- **One lead animation per viewport.** When a screen loads, one thing moves first and most. Everything
  else is quieter or still. Two competing entrances read as noise.
- **Animate the change, not the element.** A button doesn't need to bounce in; the result of pressing
  it needs to appear from somewhere sensible.
- **Repeated actions get faster motion.** Something users do 50 times a day (opening a menu, switching
  tabs) should be ≤ 200 ms or instant. Things seen once (hero) may be slower.
- **Never block input.** Users must be able to click, scroll and type during any animation.

## 2. Motion tokens

Motion gets the same token treatment as color and space. `assets/motion/tokens.css` is a ready
starting point; tune the values, keep the names.

| Token | Default | Use for |
|---|---|---|
| `--dur-instant` | 90 ms | color/opacity feedback: hover, press, checkbox |
| `--dur-fast` | 160 ms | small UI and **exits**: tooltip, menu close, toast leave |
| `--dur-base` | 260 ms | default: menu open, tab switch, accordion, card hover |
| `--dur-slow` | 420 ms | big surfaces: dialog, drawer, page content, shared-element morph |
| `--dur-deliberate` | 700 ms | one-off hero moments only |

Easings:

| Token | Curve | Use for |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | anything **entering** — fast start, gentle landing |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | something moving **between two on-screen positions** |
| `--ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | anything **leaving** — accelerates away |
| `--ease-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` | long travel, hero text, the one lead animation |
| `--ease-spring` | `linear(…)` sampled spring, ~5 % overshoot | playful pops, toggles, pills (pair with ≥ 420 ms) |

Distances: `--dist-xs/sm/md/lg` = 4/8/16/32 px. Entrance travel should hint at direction, not fly
across the screen — 8–32 px is almost always enough. Stagger: `--stagger` 60 ms, capped at
`--stagger-max` 8 items.

Personality comes from tuning, not from adding effects:

- **Calm / luxury / editorial:** durations ×1.3, `--ease-emphasized` for entrances, no spring, little stagger.
- **Product / tool:** durations ×0.8, ease-out everywhere, spring only on toggles.
- **Playful / consumer:** spring on pops and pills, 80 ms stagger, slightly larger distances.

Size rule: bigger elements and longer travel need more time; tiny elements moving far look
frantic. If an animation "feels slow", shorten the distance before shortening the duration.

## 3. Choreography

- **Sequence by importance, not DOM order.** Hero: headline → supporting copy → CTA → media. The
  eye should finish where you want the click (`hero-load-sequence.css`).
- **Stagger shows grouping.** Siblings arriving 40–80 ms apart read as a set. Cap it: with 20
  items, stagger the first 6–8 and let the rest arrive together; total group time ≤ ~600 ms.
- **Don't stagger what people want to read now.** Search results, table rows and prices appear
  immediately; stagger is for marketing moments.
- **Overlap, don't chain.** Start the next step before the previous one ends (≈ 30–60 % overlap).
  Strict sequencing feels slow.
- **Entrances vs exits are asymmetric.** Exits are ~60–70 % of the entrance duration, use the
  accelerating curve, and travel less (or just fade). The user has already decided to move on;
  don't make them watch the old thing leave. With `AnimatePresence mode="wait"` the exit
  directly delays the enter — keep it ≤ 160 ms.
- **Direction means something.** Forward navigation moves content left/up, back moves it
  right/down; a drawer slides from the edge it lives on; a dropdown grows from its trigger
  (`transform-origin`), not from its center.
- **Reveal once.** Scroll entrances play the first time only: `reveal-on-scroll` (IntersectionObserver
  adds a class, then unobserves). A `view()` timeline is *scrubbed* — it reverses on scroll-up and
  replays on every pass — so it is only for deliberate scroll-linked moments
  (`scroll-scrubbed-reveal`, `draw-on-scroll`, `sticky-stack-cards`, parallax, progress bars).

### Never leave content invisible

An entrance that starts at `opacity: 0` is a bet that a script will run and an observer will fire.
Lose the bet and the section is blank — for no-JS visitors, crawlers, print, and screenshot tools.

- **Gate the hidden state behind a JS-ready class.** CSS hides only under `.reveal-ready` (or `.js`)
  on `<html>`, set by a tiny inline `<head>` script. No class → nothing hidden. Never write
  `[data-reveal] { opacity: 0 }` unconditionally.
- **Give the gate a timeout.** The inline script removes the class after ~2.5 s unless the observer
  script has marked itself live (`.reveal-live`). This covers a blocked or failed module (e.g.
  `type="module"` on `file://`), a CDN outage, or a script error. The snippet is in
  `reveal-on-scroll.css`.
- **Reduced motion, print and no IntersectionObserver → reveal everything**, not "hide forever".
- **Hide with opacity/transform, never with the observed element's own `clip-path`.**
  IntersectionObserver counts the target's clip, so a fully clipped target never intersects and
  never reveals. Clip a child and observe the parent (`image-reveal-clip.css`).
- **Verify it.** `capture.mjs` scrolls through the page before full-page shots; any block still at
  `opacity: 0` after that is a stuck reveal and gets flagged — fix it, never ship it. Scrubbed
  (`view()`) elements below the fold can legitimately be mid-animation in a full-page shot; judge
  those from the scroll filmstrip and keep essential copy out of them.

## 4. Technique decision table

Default to the lightest technique that can do the job: **CSS first, then WAAPI / Motion, GSAP for
complex timelines and scroll storytelling.** Never add a library for something CSS already does.

| Effect | First choice | When to step up |
|---|---|---|
| Hover / press / focus states | CSS `transition` on transform/opacity/color | never |
| Page-load hero sequence | CSS keyframes + delays (`hero-load-sequence.css`) | GSAP timeline if > 6 steps or needs to be scrubbable/replayable |
| Reveal on scroll (once) | IO adds a class once + CSS transition, gated (`reveal-on-scroll.*`) | Motion `inView` if the project already ships Motion (`motion-inview-stagger.js`) |
| Scrubbed entrance (reverses with scroll) | CSS `view()` timeline, static fallback (`scroll-scrubbed-reveal.css`) | GSAP ScrollTrigger `scrub` inside a larger story |
| Media reveal | `clip-path: inset()` wipe + inner scale, once (`image-reveal-clip.css`) | — |
| SVG line / chart draw | `pathLength="1"` + `stroke-dashoffset` on a view timeline, JS fallback (`draw-on-scroll.*`) | GSAP DrawSVG / MorphSVG for multi-path illustrations |
| Reading progress bar | `scroll(root)` timeline on a `scaleX` bar (`scroll-progress-bar.*`) | — |
| Stacking cards | `position: sticky` + scrubbed scale (`sticky-stack-cards.css`) | GSAP pin if cards must also change content |
| In-page anchor links | native `scroll-behavior: smooth` + `scroll-margin` (`smooth-anchor-scroll.css`) | Lenis only on scroll-story pages |
| Dialog / popover / menu open-close | `@starting-style` + `allow-discrete` (`dialog-enter-exit.css`) | component library's own animation |
| Staggered group | CSS delays with `--i` / `sibling-index()` (`stagger-entrance.css`) | Motion `stagger()` / GSAP `stagger` for dynamic or interruptible lists |
| List add/remove/reorder | View Transitions or AutoAnimate | Motion `layout` / `AnimatePresence` in React |
| Tab / nav indicator | FLIP with WAAPI (`tab-indicator.js`) | Motion `layoutId` in React (`motion-react-tab-indicator.tsx`) |
| Accordion / disclosure | `<details>` + `::details-content` + `interpolate-size`, or grid 0fr→1fr (`accordion.css`) | component library's own animation |
| Same-page state morph (filter, expand card, theme) | `document.startViewTransition` (`view-transition-same-document.js`) | Motion `layout` in React |
| MPA page transitions | `@view-transition { navigation: auto; }` (`view-transition-cross-document.css`) | — |
| SPA route transitions | framework's View Transition hook (below) | Motion `AnimatePresence` (`motion-react-page-transition.tsx`) |
| Parallax | CSS scroll-driven, transform only (`parallax.css`) | GSAP ScrollTrigger `scrub` if part of a larger story |
| Pinned / horizontal scroll story | GSAP ScrollTrigger (`gsap-pinned-horizontal.js`) | — |
| Sticky scene that builds as text scrolls (scrollytelling) | `story/story-scroll.js` + `story/scene.js` (declarative parts, scrub or play) | Motion `useScroll` (`story/sticky-steps-motion.tsx`) on Motion projects |
| Pinned chapters, before/after, text highlight, zoom-through, route journey, image sequence | `story/chapters.js`, `before-after.js`, `text-highlight.js`, `zoom-through.js`, `path-journey.js`, `image-sequence.js` | Lottie / Rive / video / three.js stages via `story/adapters.js` |
| Smooth wheel scrolling | usually **none** | Lenis on storytelling pages only (`lenis-gsap.js`) |
| Split-text reveal | word split + CSS (`text-split-reveal.*`) | GSAP SplitText (`mask: 'lines'`, `autoSplit`) for line splits that survive resize |
| Marquee | CSS keyframes, pausable (`marquee.*`) | — |
| Number count-up | rAF + Intl (`number-counter.js`) | — |
| Magnetic / cursor glow | small JS + transform / custom props (`magnetic-button.js`, `spotlight-card.*`) | — |
| Designer-made vector motion | dotLottie (`@lottiefiles/dotlottie-web`) | Rive for interactive, state-machine driven pieces |
| 3D hero / product viewer | three.js / React Three Fiber, lazy-loaded | — |

Library facts (verified 2026-09-27; see `data/libraries/motion.csv` for install lines):

- **Motion** (`npm install motion`): React API from `motion/react` (`motion`, `AnimatePresence`,
  `MotionConfig`, `LayoutGroup`, `layoutId`), vanilla API from `motion` (`animate`, `scroll`,
  `inView`, `stagger`, `spring`, `hover`, `press`). It is the former `framer-motion`, and Motion One
  was merged into it — don't install `framer-motion` or `motion-one` for new work. Vue: `motion-v`.
- **GSAP** (`npm install gsap`): free for everyone including commercial use, and every plugin —
  ScrollTrigger, SplitText, MorphSVG, ScrollSmoother, Flip — ships in the one public package
  (no more Club/private registry). The license is GSAP's own "no charge" license, not MIT; it
  forbids use in tools that compete with Webflow's visual animation builder. React: `@gsap/react`
  → `useGSAP(fn, { scope })` for automatic cleanup, `contextSafe` for handlers.
- **Lenis** (`npm i lenis`, MIT): import `lenis/dist/lenis.css`; React via `lenis/react`
  (`ReactLenis`, `useLenis`).
- **Anime.js v4** (`animejs`, MIT): named imports (`animate`, `stagger`, `createTimeline`, `onScroll`,
  `splitText`); v3 code is not drop-in.

## 5. Scroll-driven animation

Native CSS scroll timelines run off the main thread and need no listeners.

```css
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .card {
      animation: rise var(--ease-out) both;
      animation-timeline: view();             /* must come AFTER the shorthand */
      animation-range: entry 0% cover 35%;    /* start entering → 35% visible */
    }
  }
}
```

- `view()` tracks an element crossing the viewport; `scroll()` tracks a scroller's overall
  progress (reading-progress bars: `scroll(root)` on a `scaleX` bar).
- The `animation` shorthand resets `animation-timeline`, so declare the timeline after it.
- Duration is ignored for scroll timelines; `animation-range` decides where it plays.
- **Scroll timelines are scrubbed:** they run backwards when the user scrolls up. That suits
  parallax, progress bars, line drawing and scroll stories; it does not suit ordinary entrances
  (use `reveal-on-scroll`, which plays once).
- A sticky element doesn't move while stuck, so its own `view()` stalls; put a named
  `view-timeline` on the scrolling parent and animate children against it (`sticky-stack-cards.css`).
- **Support (Sept 2026):** Chrome/Edge 115+, Safari 26+. Firefox stable still has it behind a flag.
  Always wrap in `@supports` and decide the fallback: static for parallax and scale effects; a
  passive, rAF-throttled driver that only listens while the element is on screen for effects
  that carry meaning (`draw-on-scroll.js`, `scroll-progress-bar.js`).
- Don't hide content in CSS unless the fallback is guaranteed to reveal it (see "Never leave
  content invisible" in §3).
- Scroll listeners, if you must write one, are `{ passive: true }` and rAF-throttled (lint UC017).

## 6. View Transitions

The browser snapshots old and new states and animates between them. It is the best tool for
orientation and continuity, and it works without a library.

**Same-document** (`document.startViewTransition`, Baseline: Chrome 111, Safari 18, Firefox 144):

```js
document.startViewTransition({ update: () => render(next), types: ['forward'] });
```

Use `withViewTransition()` from `view-transition-same-document.js`: it falls back to the plain
callback form where `types` are unsupported, and skips the transition under reduced motion.

**Cross-document** (MPAs, zero JS): put `@view-transition { navigation: auto; }` on **both** pages
(`view-transition-cross-document.css`). Same-origin only. Chrome/Edge 126+, Safari 18.2+; Firefox
stable doesn't animate yet, which is harmless. The browser waits for the new page's first render,
so this rewards fast pages and punishes slow ones.

**Naming:** `view-transition-name` must be unique on the page at snapshot time. Name only what
should morph (the clicked card's image, not every card) — set it just before the transition
(`nameForTransition()`). `view-transition-class` groups styling for many names.
`:active-view-transition-type(forward)` styles by direction. Add `::view-transition { pointer-events: none; }`
so clicks during a transition aren't lost, and anchor the header by naming it and setting
`animation: none` on its group (`view-transition.css`).

**Framework hooks (checked 2026-09-27):**

| Stack | How |
|---|---|
| React 19.3+ | `import { ViewTransition, addTransitionType } from 'react'` — stable since React 19.3. Props `name`, `enter`, `exit`, `update`, `share`, `default`. Only animates updates inside a Transition / Suspense reveal / `useDeferredValue`. See `react-view-transition.tsx`. |
| Next.js App Router | Works without config (App Router ships React canary). `<Link transitionTypes={['nav-forward']}>` and `router.push(url, { transitionTypes })`. Put the directional wrapper in each `page.tsx`, not the layout. Older guides mention `experimental.viewTransition` / `unstable_ViewTransition` — outdated. |
| Astro | `import { ClientRouter } from 'astro:transitions'` in the layout head; `transition:name`, `transition:animate`, `transition:persist`. For plain MPAs, native `@view-transition` needs no router. |
| SvelteKit | `onNavigate` from `$app/navigation`: return a Promise that starts `document.startViewTransition(async () => { resolve(); await navigation.complete; })`. |
| Nuxt | `experimental: { viewTransition: true }` in `nuxt.config` (still experimental; respects reduced motion, `'always'` overrides it). DOM updates freeze during the transition, so avoid it on pages that fetch in setup. |
| Vue (no Nuxt) / others | call `document.startViewTransition` around the router's navigation. |

## 7. Smooth scrolling (Lenis) — usually don't

Smooth-scroll libraries ease wheel input. That can make scrubbed scroll stories and parallax feel
continuous, and it can make every other page feel sluggish and "not mine".

Use Lenis when **all** are true: the page is a scroll-driven narrative (pinned sections, scrubbed
timelines), it's a marketing/portfolio page, and you've tested it with a trackpad, a mouse wheel
and a keyboard. Don't use it on apps, dashboards, docs, e-commerce listings or long-form reading.

Non-negotiables when you do: native document scroll is kept (Lenis does this — scrollbar, keyboard,
find-in-page, anchors, `position: sticky` still work); touch stays native (`syncTouch` off); it is
not started under reduced motion; nested scrollers get `data-lenis-prevent`; with GSAP, drive it
from `gsap.ticker` and call `ScrollTrigger.update` on scroll (`lenis-gsap.js`). Known limits: no
CSS scroll-snap without `lenis/snap`, capped at 60 fps in Safari, no smoothing over iframes.
GSAP ScrollSmoother is the alternative when the page is already all-GSAP; same caveats.

## 8. Pattern notes

- **Pinned / horizontal scroll** — once or twice per page. Build it inside `gsap.matchMedia()` for
  wide screens with motion allowed; otherwise fall back to a native horizontal scroller with
  scroll-snap. Use `ease: 'none'` with `scrub` (position maps to scroll); `invalidateOnRefresh`
  and a `ScrollTrigger.refresh()` after fonts load.
- **Text reveal** — one display line per viewport. Split words (or lines with SplitText `mask: 'lines'`),
  never characters on long text. Keep the real text available to assistive tech: GSAP SplitText
  adds `aria-label` + `aria-hidden` children by default (`aria: 'auto'`); the framework-free
  snippet keeps a visually-hidden copy. Re-split on resize (`autoSplit`) or lines break wrong.
- **Marquee** — slow (30–60 s per loop), pause on hover/focus, a visible Pause button, paused
  off-screen, duplicate track `aria-hidden` + `inert`. Nothing essential inside it.
- **Parallax** — decoration only, never text; ≤ 8–14 % drift; transform only; static fallback.
- **Magnetic / cursor effects** — primary CTA only; clamp travel (≤ 12 px); disable for
  `(hover: none)` and reduced motion; move with transform so the hit area doesn't move.
- **Number counting** — the final value is in the HTML; count ≤ ~1.2 s with ease-out; tabular
  numerals so width doesn't jitter; screen readers get the final value once.
- **Layout animations (FLIP)** — measure first/last, apply the inverse transform, animate transform
  to zero. Motion's `layout`/`layoutId` does this for you in React; View Transitions do it for
  whole-DOM changes; `tab-indicator.js` shows the hand-rolled version.
- **Accordion height** — the one sanctioned layout animation, because opening must push content.
  Use `interpolate-size: allow-keywords` or the grid `0fr → 1fr` trick, `--dur-base`, never on
  anything else. Closed panels get `inert` (or use `<details>`).
- **Dialogs, popovers, menus** — the closed state *is* the exit state; `@starting-style` is the
  entry start; transition `display` and `overlay` with `allow-discrete` so the exit is visible.
  Enter `--dur-slow` ease-out, exit `--dur-fast` `--ease-exit`. Popovers grow from the trigger
  side (`transform-origin`). Where `overlay` is unsupported the exit just ends early — acceptable.
- **Line drawing** — `pathLength="1"` so every path uses `stroke-dasharray: 1 1` and offset 1 → 0
  without measuring. Dash offset repaints (capture.mjs flags it): fine for one modest SVG; use the
  `wipe` (clip-path) mode for large or many-path art. Charts that carry data draw once, not scrubbed.
- **Sticky stacks** — 3–6 cards, each shorter than the viewport; covered cards recede (scale
  ≈ 0.92), never fade to unreadable. Turn stacking off on short viewports.
- **Anchor scrolling** — native `scroll-behavior: smooth` under `no-preference` only, plus
  `scroll-margin-block-start` for the sticky header. Scripts that scroll (including screenshot
  tools) pass `behavior: 'instant'` when they need an exact position.
- **Skeletons** — same dimensions as the real content; shimmer with a transformed pseudo-element,
  not `background-position`; only for waits > 300 ms.
- **Page-load sequence** — readable by ~300 ms, done by ~1.2 s; the LCP text should not start at
  `opacity: 0` (use `0.01`) or be delayed behind other animations.

## 9. Performance

- **Compositor-only properties:** `transform` (incl. `translate`/`scale`/`rotate`), `opacity`,
  `filter`, `clip-path`. Anything else (`width`, `height`, `top`, `margin`, `box-shadow`,
  `background-position`) runs layout or paint every frame. Fake shadows by fading a pseudo-element's
  opacity; fake size by `scale` on a fixed-size element.
- **Never `transition: all`** (UC001) — it animates properties you didn't intend, including layout.
- **`will-change` sparingly:** only on elements about to animate, removed afterwards; never as a
  global rule. Each promoted layer costs GPU memory.
- **Blur is expensive:** don't animate `filter: blur()` or `backdrop-filter` on large areas
  (full-bleed images, whole sections). Small elements for short durations only.
- **Off-screen work:** pause loops (marquee, canvas, Lottie, three.js) when not visible
  (IntersectionObserver) and when `document.hidden`. `content-visibility: auto` on long below-the-fold
  sections cuts render cost (give them `contain-intrinsic-size` to avoid scroll jumps).
- **Lazy-load heavy engines:** import GSAP/three.js/Lottie after first paint or when the section
  approaches (`await import('gsap')`). A motion library is not worth an LCP regression.
- **Batch DOM reads before writes** in JS animations; use rAF, never `setInterval`.
- **Durations over 1 s** on UI transitions (UC012) feel broken; loops and scrubbed effects are exempt.

## 10. Accessibility

- **`prefers-reduced-motion: reduce` is required, not optional** (UC003). Reduced does not mean
  none: remove travel, zoom, parallax, scroll-jacking and autoplay; keep short opacity/color changes
  that carry meaning (a state change must still be perceptible). `tokens.css` zeroes distances so
  token-based animations degrade automatically.
- **Where to put the check:** wrap movement in `@media (prefers-reduced-motion: no-preference)` (opt-in
  is safer than opt-out); in JS check `matchMedia('(prefers-reduced-motion: reduce)')` before
  starting; in Motion use `<MotionConfig reducedMotion="user">` (disables transform and layout
  animations, keeps opacity) or `useReducedMotion()`; in GSAP use `gsap.matchMedia()`.
- **Pause, stop, hide (WCAG 2.2.2):** anything that moves automatically for more than 5 s and runs
  alongside other content needs a pause control — marquees, carousels, looping background video,
  ambient canvases. Hover-to-pause alone is not enough (keyboard and touch users).
- **Vestibular triggers:** large parallax, zoom-on-scroll, full-screen slides, spinning, and scroll
  hijacking. Keep them small, or remove them under reduced motion (`parallax.css` does).
- **No flashing** more than 3 times per second (WCAG 2.3.1).
- **Focus follows navigation:** after a route transition, move focus to the new page's `h1` or main
  landmark (`motion-react-page-transition.tsx`), and don't animate focus rings away.
- **Hidden ≠ gone:** content hidden for an entrance must still be reachable; never leave it at
  `opacity: 0` if the script fails.

## 11. Motion budget by the motion dial

The direction line sets a motion dial (1–10; see `references/direction.md`). It caps how much
motion a page gets. Count per page, not per component.

| Dial | Feel | Budget |
|---|---|---|
| 1–2 | still, utilitarian | state feedback only (hover/press/focus, ≤ 160 ms). No entrances, no scroll effects. |
| 3–4 | calm, product | + menus/dialogs/accordions animate (`dialog-enter-exit`); smooth anchor scrolling; one subtle page-load fade; View Transitions for navigation; reading progress bar on long articles. |
| 5–6 | polished marketing | + hero load sequence; section reveals, once (one per section); one staggered group per page; 1–2 image clip reveals; tab indicators; count-up on key stats. |
| 7–8 | expressive brand | + one scroll story (a `story/` scene, pinned section, sticky card stack **or** a line drawn on scroll) **or** text-split headline; one delight effect (magnetic CTA or cursor glow); marquee; subtle parallax on 1–2 images. |
| 9–10 | showcase / portfolio | + Lenis smooth scroll, multiple scroll chapters, WebGL/Lottie/Rive motion graphics, custom cursor — still one lead animation per viewport, still a reduced-motion path, still ≥ 50 fps. |

Above 6, re-check: is each effect earning its job from §1? Removing one strong effect is usually
better than adding a fifth.

## 12. Verify motion with your own eyes

Reading keyframes tells you nothing about how it feels. Capture it:

```
node <skill>/scripts/capture.mjs http://localhost:3000 --motion
node <skill>/scripts/capture.mjs http://localhost:3000 --reduced-motion
```

- `--motion` saves `motion-<viewport>-t0/150/300/600/1000.png` after load and a scroll filmstrip
  `scroll-<viewport>-<n>.png`. Open them in order. Check: at t=0 is the page blank or broken (bad)?
  By t=300 is the headline readable? At t=1000 is everything settled? Does the filmstrip show
  content that never appeared (a reveal that never fired) or blank gaps?
- `report.md` → **Animations (document.getAnimations)** lists each running animation's target,
  properties, duration, easing and iterations, and flags **non-composited** properties (anything
  outside transform/opacity/filter/clip-path/translate/scale/rotate). Fix every flag — usually by
  switching to transform or scale.
- With `--reduced-motion`, the report flags any animation still running at capture. Aim for zero:
  page-load entrances (hero, staggered groups) should be off entirely under reduced motion, and
  loops (marquee, shimmer, spinners) stopped. Opacity fades that respond to a user action are
  fine — they don't run at load.
- Also watch the report's CLS: animation must never cause layout shift. Entrance transforms don't;
  late-loading fonts and images do.
- Can't run a browser? Say motion was not visually verified. Scrub a Chrome DevTools Performance
  recording or the Animations panel if available; aim for no long frames during animations.

Checklist before calling motion done:

- [ ] Every animation's job is nameable (§1); one lead per viewport.
- [ ] All durations/easings come from tokens; exits faster than entrances.
- [ ] Only compositor properties animate (report has no non-composited flags) — accordions excepted.
- [ ] Reduced motion: no travel/zoom/parallax/autoplay; content fully visible; report clean.
- [ ] Anything looping > 5 s has a visible pause control and pauses off-screen.
- [ ] Content is visible without JS and when a motion script fails (hidden states gated behind a
      JS-ready class with a timeout); the full-page shot has no block stuck at `opacity: 0`.
- [ ] Entrances play once; only deliberately scrubbed effects reverse on scroll-up.
- [ ] Frames at 0/300/1000 ms and the scroll filmstrip look intentional at 390 px and 1440 px.
