# Anti-patterns

Two kinds of problem make a UI look generated or feel broken:

- **Section A — mechanical rules (UC001–UC018).** Detectable with a regex, so
  `python <skill>/scripts/slop_lint.py src/` finds them and reports `path:line: UCxxx [severity] message`.
  Fix every `high`. Suppress a deliberate exception with a comment containing
  `ui-craft-ignore UCxxx` on the same or previous line, and say why in the comment.
- **Section B — judgement anti-patterns (UC-J01…).** Not lintable. Catch them by looking at the
  screenshots and running the tests in [direction.md](direction.md).

IDs and severities in section A match `docs/CONTRACTS.md` and the linter exactly.

---

## Section A — mechanical rules

### UC001 · high · `transition: all` / `transition-all`

Why: it animates every property that changes, including layout properties, colors you didn't
mean to animate, and properties added later. It causes jank and surprising motion.

```css
/* ✗ */ .btn { transition: all 0.3s; }
/* ✓ */ .btn { transition: background-color var(--dur-instant) var(--ease-out),
                           transform var(--dur-fast) var(--ease-out); }
```

Tailwind: replace `transition-all` with `transition-colors`, `transition-transform`,
`transition-opacity`, or `transition-[transform,opacity]`.

### UC002 · high · animating layout properties

Why: `width`, `height`, `top`, `left`, `margin` and `padding` force layout on every frame, so
animations stutter, especially on phones. Only `transform`, `opacity`, `filter` and
`clip-path` animate on the compositor.

```css
/* ✗ */ .drawer { transition: left 300ms; left: -320px; }
         .drawer.open { left: 0; }
/* ✓ */ .drawer { transition: transform var(--dur-slow) var(--ease-out); transform: translateX(-100%); }
         .drawer.open { transform: none; }
```

For height (accordions), animate `grid-template-rows: 0fr → 1fr` on a wrapper sparingly, or use
`interpolate-size: allow-keywords` where supported, or skip the animation. See [motion.md](motion.md).

### UC003 · high · motion without `prefers-reduced-motion` handling

Why: some people get dizzy or nauseous from on-screen movement. Every project that animates
needs a reduced-motion path. Reported once per run.

```css
/* ✓ */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
```

That blanket rule is a safety net; better is designing the reduced version (fade instead of
travel). The motion tokens in `assets/motion/tokens.css` already collapse travel distances.

### UC004 · high · `outline: none` without a focus-visible style

Why: keyboard users lose track of where they are. See [accessibility.md](accessibility.md).

```css
/* ✗ */ button:focus { outline: none; }
/* ✓ */ button:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
```

Tailwind: `outline-none` must come with a visible replacement such as
`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent` (v4 color
utilities come from your `@theme` tokens; see [stacks/tailwind.md](stacks/tailwind.md)).

### UC005 · med · default AI gradient (indigo / violet / purple)

Why: indigo-to-purple (`#6366f1`, `#8b5cf6`, `#a855f7`, `from-indigo-500 to-purple-500`) is the
most recognizable "generated" look. If the brand is genuinely purple, derive the palette from
the brand hue instead of the framework defaults, and suppress with a reason.

```css
/* ✗ */ background: linear-gradient(135deg, #6366f1, #a855f7);
/* ✓ */ background: var(--color-accent);   /* one brand-derived accent, flat or a subtle same-hue shift */
```

### UC006 · med · `100vh` / `h-screen` for full-height sections

Why: on mobile, `100vh` ignores the browser toolbar, so content hides under it and the hero
jumps when scrolling.

```css
/* ✗ */ .hero { height: 100vh; }
/* ✓ */ .hero { min-height: 100svh; }
```

Tailwind: `min-h-svh` or `min-h-dvh` instead of `h-screen`. See [layout.md](layout.md).

### UC007 · med · `z-index` ≥ 999

Why: huge z-indexes are a symptom of stacking fights; the next person adds 9999. Use the named
scale from [tokens.md](tokens.md), and native `<dialog>` / `popover` for top-layer UI.

```css
/* ✗ */ .modal { z-index: 99999; }
/* ✓ */ .modal { z-index: var(--z-modal); }
```

### UC008 · high · `<img>` without `alt`

Why: screen readers read the file name instead. Every image needs `alt`, empty for decoration.

```html
<!-- ✗ --> <img src="/team.jpg">
<!-- ✓ --> <img src="/team.jpg" alt="The five-person support team at the Leeds office" width="1200" height="800">
<!-- ✓ --> <img src="/squiggle.svg" alt="">
```

### UC009 · med · placeholder copy

Why: lorem ipsum, "Welcome to our website", "Your Company" and "John Doe" ship more often than
anyone intends, and they make the page read as a template. Write real copy ([copy.md](copy.md))
or clearly labeled placeholders listed for the user.

```html
<!-- ✗ --> <h1>Welcome to our website</h1>
<!-- ✓ --> <h1>Wheel-throwing classes for complete beginners</h1>
```

### UC010 · low · emoji as icons in headings, buttons, list markers

Why: emoji render differently on every OS, can't be styled with your tokens, and are read aloud
("rocket") by screen readers. Use an icon set that matches your type, or no icon.

```html
<!-- ✗ --> <h3>🚀 Fast deploys</h3>
<!-- ✓ --> <h3><svg aria-hidden="true" class="icon">…</svg> Fast deploys</h3>
```

### UC011 · med · `ease-in` or `linear` on UI entrances

Why: entering elements should decelerate (arrive quickly, settle gently). `ease-in` starts slow
and feels laggy; `linear` feels mechanical. `linear` is right only for continuous loops
(spinners, marquees) and scroll-linked progress.

```css
/* ✗ */ .toast { animation: slide-in 300ms ease-in; }
/* ✓ */ .toast { animation: slide-in var(--dur-base) var(--ease-out); }
```

### UC012 · med · UI transition durations over 1000 ms

Why: interface feedback over a second feels broken; users wait for it. Most UI motion sits
between 90 and 420 ms (the `--dur-*` tokens); one-off page-load moments up to about 700 ms.
Loops and marquees are exempt.

```css
/* ✗ */ .menu { transition: opacity 1.5s; }
/* ✓ */ .menu { transition: opacity var(--dur-fast) var(--ease-out); }
```

### UC013 · med · Inter / Roboto / Arial / system-ui as the display face

Why: the first family of the heading stack decides the page's voice; the defaults give it none.
Reported once. Body text in a neutral face is fine. See [typography.md](typography.md).

```css
/* ✗ */ h1, h2 { font-family: Inter, sans-serif; }
/* ✓ */ h1, h2 { font-family: var(--font-display); } /* e.g. "Familjen Grotesk", fallback… */
```

### UC014 · low · pure `#000` on `#fff` (or the reverse)

Why: maximum contrast causes glare and halation, especially on dark mode, and looks untuned.
Use tinted near-black and off-white from the palette; contrast stays far above AA.

```css
/* ✗ */ body { color: #000; background: #fff; }
/* ✓ */ body { color: var(--color-text); background: var(--color-bg); } /* e.g. oklch(0.22 0.02 h) on oklch(0.98 0.005 h) */
```

### UC015 · med · clickable `<div>`/`<span>` without role or tabindex

Why: it's invisible to keyboards and screen readers. Use a `<button>` (actions) or `<a href>`
(navigation).

```html
<!-- ✗ --> <div class="card" onClick={open}>…</div>
<!-- ✓ --> <button type="button" class="card" onClick={open}>…</button>
```

For a whole clickable card with a link inside, make the heading link cover the card with a
pseudo-element (`.card a::after { content: ""; position: absolute; inset: 0; }`) instead.

### UC016 · low · more than five `!important` in a file

Why: it's a sign of specificity fights; each one makes the next override harder. Lower the
specificity of the rule being fought, use cascade layers (`@layer`), or scope styles properly.
The reduced-motion safety net in UC003 is a legitimate use.

### UC017 · med · scroll listeners without `passive: true`

Why: non-passive scroll and touch listeners can block scrolling while the handler runs. Better
still, avoid scroll handlers: use `IntersectionObserver` for reveals and CSS scroll-driven
animations for progress.

```js
// ✗
window.addEventListener('scroll', onScroll);
// ✓
window.addEventListener('scroll', onScroll, { passive: true });
// ✓✓
new IntersectionObserver(onEnter, { rootMargin: '0px 0px -10% 0px' }).observe(el);
```

### UC018 · high · `user-scalable=no` or `maximum-scale=1`

Why: it stops people with low vision from zooming (WCAG 1.4.4). If iOS input zoom is the worry,
set input font size to at least 16 px instead.

```html
<!-- ✗ --> <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<!-- ✓ --> <meta name="viewport" content="width=device-width, initial-scale=1">
```

---

## Section B — judgement anti-patterns

These need eyes, not regex. Look for them in the screenshots; the fix is usually one decision
made on purpose, not more decoration.

### UC-J01 · Three identical feature cards

Three equal cards with an icon, a title and two lines is the default filler layout. Fix: ask
what the content actually is. Features with different weight deserve different sizes (one
large, two small); a comparison is a table; a process is a sequence; a single strong benefit
is a statement section with a real screenshot.

### UC-J02 · Center everything

Every section a centered stack of heading, paragraph and button. Nothing leads the eye and long
centered text is hard to read. Fix: left-align body text, use a grid with a clear left edge,
center only short statements (a closing CTA, a pull quote).

### UC-J03 · Glassmorphism by default

Frosted translucent panels over blurred blobs, used everywhere. It lowers contrast, costs
performance (backdrop-filter), and says nothing about the subject. Fix: solid surfaces with
tokens; keep glass for one functional place where content genuinely scrolls beneath (a sticky
header), with a contrast check.

### UC-J04 · Gradient text everywhere

Gradient fills on every headline and number. It reduces legibility, often fails contrast at one
end, and dilutes emphasis. Fix: solid text; if you use a gradient, use it once, on one word, as
the signature.

### UC-J05 · Fade-up on everything

Every block fades in and rises 20 px on scroll, with the same timing. It delays reading and
turns motion into wallpaper, and can leave content invisible if the script fails. Fix: one
orchestrated moment on load, reveals only on the few sections that benefit, content visible by
default without JavaScript. See [motion.md](motion.md).

### UC-J06 · Uniform motion speed

All animations at the same 300 ms ease regardless of size or distance. Small things should be
quicker than big things; exits quicker than entrances. Fix: use the duration tokens by size.

### UC-J07 · SaaS card kit (decorative sameness)

Every section is a rounded card with the same shadow and padding, so nothing contrasts. Fix:
most content doesn't need a container. Use whitespace, rules and background shifts; reserve
cards for things that are actually objects (a product, a plan, a post).

### UC-J08 · Fake social proof

Invented logos, quotes, star ratings, user counts. Dishonest, and readers can tell. Fix: use
real proof or leave the section out; mark placeholders clearly and list them for the user.

### UC-J09 · Stock 3D blobs and abstract orbs

Glossy 3D shapes as the hero visual say nothing about the product. Fix: show the product, the
subject, the people, or a diagram of how it works.

### UC-J10 · Div-built fake UI

Fake dashboards, terminals or phone screens made of divs as decoration. They look fake and
show no real value. Fix: a real screenshot (captured and cropped), a short product video, or
a simplified but honest illustration of the actual interface.

### UC-J11 · Template chrome and micro-label clutter

Tracked uppercase eyebrows above every heading, `01 / 02 / 03` numbering on non-sequential
sections, `→` on every button, status dots, version badges, `A · B · C` meta strings. Fix: keep
a label only where it carries information; number only real sequences.

### UC-J12 · The AI-default palettes

Indigo-violet on dark, cream + serif + terracotta, near-black + acid green, espresso + brass.
Each is fine when the brief asks for it and generic when it doesn't. Fix: derive the palette
from the domain's color world ([direction.md](direction.md)).

### UC-J13 · Mixed radii, shadows and icon styles

Buttons at 6 px, cards at 16 px, inputs at 4 px; outline icons next to filled ones; shadows
from three different systems. Fix: one radius personality, one depth strategy, one icon set.

### UC-J14 · Hero that could belong to anyone

Big centered headline ("Build the future of X"), gradient background, two buttons, floating
blob. Fix: a specific headline ([copy.md](copy.md)), a visual of the real thing, and the
signature element placed here.

### UC-J15 · Everything shouts

Several accents, bold everywhere, multiple competing CTAs, animations everywhere. Squint test
shows no focal point. Fix: choose the one thing that gets the boldness; turn everything else down.

### UC-J16 · Motion claimed, motion not shown

The dials say motion 6, but the captured frames show a static page (or content stuck at
`opacity: 0`). Fix: make the motion real and visible in `--motion` frames, or lower the dial.

### UC-J17 · Desktop layout squeezed onto mobile

Tiny multi-column grids, cramped tables, desktop nav crammed into 390 px, hover-only
affordances. Fix: design the phone layout first ([layout.md](layout.md)).

### UC-J18 · Dark mode by inversion

Neon accents glowing on pure black, heavy black shadows, harsh white text. Fix: dark mode as a
designed mapping with lighter elevated surfaces ([tokens.md](tokens.md)).

### UC-J19 · Missing states

Only the happy path exists: no empty, loading, error, hover, focus, active or disabled states.
Fix: design every state of every interactive component; write the copy for each.

### UC-J21 · The default skeleton

Hero → logo strip → three feature cards → how-it-works 1-2-3 → testimonial carousel → pricing →
FAQ → CTA banner, in that order, reskinned for each brand. Three generations with different
colours still read as one site. Fix: design the structure from the story and the content the
brand has ([structure.md](structure.md)); replace each default block with its story-shaped
archetype (`search.py "<need>" --domain sections`).

### UC-J22 · Decoration instead of story

Motion that could sit on any site (floating blobs, generic fade-ups, a particle background)
while the brand's actual work is never shown. Fix: name each chapter's verb and let the motion
perform it ([storytelling-motion.md](storytelling-motion.md) §1): a builder's site builds, an
importer's route draws.

### UC-J23 · Channels out of sync

A weighty construction scene beside springy, playful buttons; a palette unrelated to the
metaphor; page transitions in a third style. Each channel was decided alone. Fix: one motion
language sets scene easing and UI tokens; the palette comes from the metaphor's world
([story.md](story.md) §6–7).

### UC-J24 · Invented story facts

A generated story that states a founding year, awards, client names, numbers or quotes nobody
supplied. Fix: generate the narrative, never the facts; use bracketed placeholders and list
them in the hand-off ([story.md](story.md) §4).

### UC-J20 · Claiming quality without looking

Declaring the page "looks great" or "polished" from reading code. Fix: capture, open the
images, score with the rubric in [visual-loop.md](visual-loop.md), or state that visual
verification wasn't done.
