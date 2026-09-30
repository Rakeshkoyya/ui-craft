# Storytelling motion

The main job of a ui-craft site is to tell the brand's story in motion: every chapter finds a
way to *show* what it says, and all of them move with the same physics. This file turns a
chapter's content into a motion graphic, picks the medium, and explains the scene engine in
`assets/motion/story/`. Foundations (tokens, performance, accessibility, techniques) stay in
[motion.md](motion.md); read that first if you haven't.

## Contents

1. Content has a verb; motion performs it
2. From verb to scene
3. Choosing the medium, per brand
4. Drawing code-built SVG scenes
5. The scene engine (`assets/motion/story/`)
6. Choreography across a page
7. Sync rules: one physics everywhere
8. Mobile, reduced motion, no JS
9. Performance budget
10. Verify

---

## 1. Content has a verb; motion performs it

Read each chapter's copy and name what the brand **does** in it. That verb is the motion. A
chapter that says "we build" should show something being built; one that says "we source from
twelve estates" should show the route.

| The chapter says | Verb | Motion graphic |
|---|---|---|
| we build, make, assemble | assemble | parts drop and lock into place in a sticky stage (`drop`, `grow`, `light`) |
| we source, deliver, travel | travel | a route draws across a map; a marker moves between stops (`path-journey`) |
| we grow your money, audience, crops | grow / compound | bars or branches grow from a baseline, numbers count (`grow`, `count`) |
| we fix, renovate, restore | transform | before/after wipe scrubbed by scroll (`before-after`) |
| we simplify | declutter | many parts fade away until one clear thing remains (exits) |
| we connect people or systems | connect | nodes pop, lines draw between them (`pop`, `draw`) |
| we protect, insure, secure | enclose | a shape wraps around the subject; the outside dims |
| we measure, analyse, prove | chart | a line chart draws per step with annotations (`draw`, `count`) |
| we craft with care, in detail | zoom | zoom from the whole into a detail (`zoom-through`) |
| we explain how it works | take apart | exploded view with labels (`move` from assembled) |
| we host, welcome | open | doors or curtains open, light warms (`wipe`, `light`, palette shift) |
| we believe | speak | manifesto words brighten as they're read (`text-highlight`) |
| we've done this for years | endure | a timeline draws through dated milestones (`path-journey`, `draw`) |
| here are our chapters / cases | turn pages | pinned chapters crossfade or wipe (`chapters`) |

A chapter without a clear verb (practical info, forms, FAQs) gets no scene, only state feedback.
That quiet is what makes the scenes land.

## 2. From verb to scene

| Scene | Module | Use for | Story beats |
|---|---|---|---|
| Sticky split with scene | `story-scroll.js` + `scene.js` | a visual that changes over 3–6 steps while text scrolls | method, transformation, proof |
| Pinned chapters | `chapters.js` | 3–5 full-screen chapters with a progress rail | manifesto, case studies, voices |
| Before / after | `before-after.js` | one subject in two states | transformation, tension |
| Text highlight | `text-highlight.js` | a belief or origin paragraph read at scroll speed | voice |
| Zoom-through | `zoom-through.js` | entering a world or a detail | opening, method, finale |
| Image sequence | `image-sequence.js` | photoreal rotation or unboxing from renders | product |
| Path journey | `path-journey.js` | routes, timelines, processes as a path | place, origin, method |
| Pinned horizontal | `../gsap-pinned-horizontal.js` | a lineup or panorama | catalogue, place |
| Stacking cards | `../sticky-stack-cards.css` | 3–6 steps or values as a deck | method, voice |

Search both catalogues with brief words: `search.py "build assemble" --domain motion` and
`search.py "construction process" --domain sections`.

## 3. Choosing the medium, per brand

The same scene can be drawn in different media. Choose by what the brand **has** and what the
motion language **needs**, not by what's most impressive.

| Medium | Pick when | Cost | Drive it with |
|---|---|---|---|
| **Code-drawn SVG** (default) | diagrams, buildings, maps, charts, products drawn simply; no designer assets; colours must follow tokens | light; you draw it | `scene.js` verbs on `[data-step]` parts |
| **CSS / DOM** | type-led scenes, cards, panels, UI | lightest | `chapters.js`, `text-highlight.js`, CSS scroll timelines |
| **Photography + clip/zoom** | the brand has strong real photos (places, people, work) | light–medium | `before-after.js`, `zoom-through.js`, `image-reveal-clip` |
| **Canvas image sequence** | photoreal product rotation, unboxing, a render flythrough | 60–150 frames, 1.5–4 MB WebP, lazy | `image-sequence.js` |
| **Scrubbed video** | a real timelapse (a build, a harvest) | encode every frame as a keyframe (`-g 1`) or it stutters | `adapters.js` `videoScrub` |
| **Lottie (dotLottie)** | a designer delivers vector animation; illustration-led brands | 20–200 KB; colours baked into the file | `adapters.js` `lottieScrub` |
| **Rive** | interactive characters or state-machine illustrations | runtime ~ 150 KB | `adapters.js` `riveNumberInput` |
| **three.js / React Three Fiber** | a 3D world or product the brand genuinely needs; motion 9–10 | heavy; lazy-load; needs a model | `onProgress` callback into your render loop |

Rules: never ship stock Lottie clip-art that ignores the palette; if an asset can't be themed with
the brand tokens, redraw it as SVG. Mixing media is fine (SVG diagram in one chapter, photography
in another) as long as the motion language stays the same.

## 4. Drawing code-built SVG scenes

Without designer assets you draw the scene yourself. It has to look designed, not clip-art.

- **One viewBox, layered groups back to front**: sky/ground → structure → details → labels. Give
  each group an id; parts that animate get `data-step` and `data-enter`.
- **Three to five tones from the palette**, as CSS variables (`fill: var(--scene-2)`), so the
  scene follows the tokens and dark mode. Shade faces consistently: light from one side.
- **The brand's shape language**: corner radius, stroke weight and angles match the UI (a weighty
  brand's scene has thick strokes and square joins; an organic one has round caps and curves).
- **A simple convention**: straight elevation, a 30° isometric, or a flat map. Don't mix.
- **Detail where the eye rests**, flat everywhere else: windows light up, the crane hook swings, a
  single figure gives scale.
- **Author the finished state.** The markup shows the scene complete; the engine animates *from*
  hidden. If JavaScript fails, the visitor sees the finished drawing.
- **Label in HTML**, not in SVG text, where the labels carry meaning; keep decorative stages
  `aria-hidden="true"` and put the meaning in the step text.

A construction stage, trimmed:

```html
<figure class="story__stage" aria-hidden="true">
  <svg viewBox="0 0 600 640">
    <rect class="ground" x="0" y="560" width="600" height="80"/>
    <rect data-step="0" data-enter="grow" x="120" y="540" width="360" height="24"/>   <!-- slab -->
    <g data-step="1" data-enter="drop" data-order="0"> …columns… </g>
    <g data-step="2" data-enter="drop" data-order="1"> …floor 1… </g>
    <g data-step="2" data-enter="drop" data-order="2"> …floor 2… </g>
    <g data-step="3" data-enter="light"> …windows… </g>
    <g data-step="1" data-enter="slide" data-dir="right" data-exit-step="4" data-exit="lift"> …crane… </g>
  </svg>
</figure>
```

## 5. The scene engine (`assets/motion/story/`)

Framework-agnostic ES modules. GSAP is passed in, never imported at the top of a module, so the
same files work from npm, a CDN, or a Next.js client component. Every init returns a cleanup
function and uses `gsap.matchMedia()` to split motion-ok from reduced motion.

| File | Export | Job |
|---|---|---|
| `languages.js` | `MOTION_LANGUAGES`, `resolveLanguage()`, `applyCssTokens(language)` | the seven presets from [story.md](story.md) §7: easing, duration, stagger, distance, scrub smoothing, and matching CSS motion tokens (`cssTokens`) |
| `scene.js` | `buildScene(stage, { gsap, language })` | reads `[data-step]` parts and their verbs, returns a paused timeline with labels `step-0 … step-N` |
| `story.css` | — | the sticky split layout; `data-layout="stage-right \| stage-left \| stage-top \| stage-behind"` |
| `story-scroll.js` | `initStoryScroll(section, { gsap, ScrollTrigger, language, mode, timeline, onStep, onProgress, anchor })` | ties steps to the timeline: `mode: 'scrub'` follows the scroll; `'play'` plays each step when it becomes active |
| `adapters.js` | `videoScrub`, `lottieScrub`, `riveNumberInput`, `callback`, `all` | turn a video, Lottie, Rive or three.js stage into an `onProgress(p)` target |
| `chapters.js` / `.css` | `initChapters(section, { gsap, ScrollTrigger, language, snap, length })` | pinned chapters with transitions and a progress rail |
| `before-after.js` / `.css` | `initBeforeAfter(figure, { gsap, ScrollTrigger, language, from, to })` | scrubbed wipe plus an accessible range input |
| `text-highlight.js` / `.css` | `initTextHighlight(el, { gsap, ScrollTrigger, language, dim })` | words brighten as they're read |
| `zoom-through.js` / `.css` | `initZoomThrough(section, { gsap, ScrollTrigger, language, length })` | scale through a window into the next scene |
| `image-sequence.js` | `initImageSequence(wrapper, { gsap, ScrollTrigger, canvas, count, frames, pin })`, `createImageSequence()` (plug into `onProgress`) | canvas frame scrub with progressive preload |
| `path-journey.js` | `initPathJourney(svg, { gsap, ScrollTrigger, MotionPathPlugin, language })`, `buildJourney()` (a timeline for story-scroll) | route draws, marker follows (MotionPathPlugin), stops activate |
| `use-story-scroll.tsx`, `StoryScroll.tsx` | `useStoryScroll`, `<StoryScroll>` | React / Next.js wrappers using `@gsap/react` `useGSAP` |
| `sticky-steps-motion.tsx` | `<StickySteps>` | the same pattern with the Motion library, for projects already on Motion |

**Scene verbs** (`data-enter` on a part): `rise`, `drop`, `slide` (+ `data-dir`), `grow` (scaleY from
`data-origin`, default bottom), `grow-x`, `pop`, `fade`, `light`, `wipe` (+ `data-dir`), `draw`
(SVG stroke), `count` (final number stays in the HTML), `move` (explicit
`data-from="x:0 y:-120 rotate:-8 scale:.6 opacity:0"`). `data-order` staggers parts within a step;
`data-exit-step` + `data-exit="fade | drop | slide | lift"` removes a part later (scaffolding,
a crane). The motion language sets how every verb feels, so the same scene in `weighty` and in
`airy` reads as two different brands.

**Scrub or play?** Scrub when the reader should feel in control of time (a build, a route, a
chart). Play when half-finished states look broken or the scene is long (a character, a complex
assembly): each step plays fully once it's active, at the language's own pace.

Framework choice: GSAP (free, all plugins) is the default engine for scenes. On a project that
already ships Motion, use `sticky-steps-motion.tsx` and drive SVG parts with `useTransform`
rather than adding GSAP. Never ship both engines for the same job ([motion.md](motion.md) §4).

## 6. Choreography across a page

- **Follow the intensity curve** from [structure.md](structure.md) §5: one showpiece, quiet
  chapters around it.
- **Scroll length**: a sticky scene gets 3–6 steps, each ~70–90 % of the viewport tall; a pinned
  scene lasts at most ~3 viewport heights.
- **Cuts between chapters** follow the metaphor: hard cuts for weighty or mechanical brands,
  dissolves for organic or airy ones, **match cuts** (a shape or line continues from one chapter
  into the next) for the one transition that matters most.
- **Echo the showpiece**: its line becomes a divider, its shapes become icons, its verb becomes a
  hover state.
- **Page transitions** use the same language: a weighty site's pages stack in from below; an airy
  site's pages dissolve (View Transitions, [motion.md](motion.md) §6).

## 7. Sync rules: one physics everywhere

1. **One motion language** sets scene easing *and* the UI tokens: load the preset's `cssTokens`
   into `:root` (`applyCssTokens('weighty')`, or copy them into `tokens.css`) so hovers, menus and dialogs share its rhythm.
2. **Direction means something** and stays consistent: building brands move up, journeys move
   left to right (reading direction), growth spreads from a base or centre, a decluttering brand
   removes rather than adds.
3. **Colour takes part in the story** when the metaphor has time in it: dawn to day across a
   day-in-the-life, green to amber across tea processing, grey to bright across a renovation.
   Shift palette tokens per chapter, never randomly per element.
4. **Type moves like the brand**: weighty headlines drop into place; airy ones fade; playful ones
   pop word by word. One text treatment per site.
5. **Silence is part of the rhythm**: at least one chapter in three has no scene at all.

## 8. Mobile, reduced motion, no JS

- **Mobile (< 48rem)**: sticky stages move to the top (~45 svh) with steps scrolling beneath as
  cards; pinned horizontal rails become native swipe rails with snap; image sequences use every
  second frame; 3D becomes a poster or video.
- **Reduced motion**: no scrubbing, zooming, parallax or pinning. Scenes jump to each step's end
  state as the step becomes active (the story is still told, in discrete frames); highlight text
  is fully bright; before/after keeps only the range input.
- **No JS / script failure**: the authored markup is the finished state, so everything is
  visible; step texts are ordinary content in reading order. Never hide a part in CSS without the
  engine's JS-ready gate.
- **Keyboard and screen readers**: meaning lives in the step text, not the drawing. Focusable
  content inside steps stays in DOM order; nothing is only reachable by scrolling.

## 9. Performance budget

| Scene type | Budget |
|---|---|
| SVG scene | ≤ ~400 elements; animate groups, not hundreds of paths; no filters on large areas |
| Image sequence | ≤ 150 frames; WebP/AVIF; first frames preloaded, rest progressive; ≤ 4 MB total |
| Video scrub | ≤ 10 s, all-intra encode, ≤ 6 MB, poster first |
| Lottie / Rive | load when the chapter approaches (`import()` on IntersectionObserver) |
| three.js | lazy-load the chapter; cap DPR at 2 (1.5 on mobile); pause when off-screen |
| Whole page | at most 2 pinned scenes; GSAP loaded after first paint on content-first pages |

Worked example of every scene, one fictional brand each (construction, tea importer, climate
nonprofit, renovation studio, hardware, film festival): `examples/story-scenes/` in the repo.
GSAP tip: when tweening an SVG `pathLength="1"` dash offset, set `autoRound: false` or the
line jumps from hidden to fully drawn.

## 10. Verify

Capture with `capture.mjs --full-page --motion`, then `--reduced-motion`. In the scroll filmstrip,
**every step of every scene must be visible as a distinct state**. If two consecutive frames look
the same, the scene isn't telling that step. Checklist:

- [ ] Each chapter's verb is named; its motion performs it (or it deliberately has none).
- [ ] One motion language across scenes, UI tokens and page transitions.
- [ ] The medium matches the brand's assets; every asset follows the palette.
- [ ] Scenes are authored in their finished state; nothing stuck invisible without JS.
- [ ] Mobile layout of each scene designed; reduced motion shows discrete steps.
- [ ] Filmstrip shows every step; report has no non-composited flags (except documented `draw`).
