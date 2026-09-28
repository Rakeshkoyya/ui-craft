# Design memory — Kiln & Cloud

<!--
  ui-craft design memory. Read this before any UI work in this repo; its decisions are settled.
  Values must match the code; css/tokens.css is the source of truth.
-->

## Direction

- **Reading this as:** a one-page shop-and-workshop site for a two-person stoneware studio in Porto, calm, tactile and exact — glaze test tiles in Porto's cobalt that thread through collection, process and workshops, plus one kiln-firing curve drawn by scroll; slow, settle-in motion.
- **Audience and job:** locals and visitors who buy tableware in small batches and book Saturday wheel workshops. Jobs: see batch 14 → email an order; book a workshop seat.
- **Signature element:** the glaze test tile (small slab, raw clay top, glazed bottom, hanging hole). Appears in the hero glaze strip (links to each piece) and next to every piece's glaze code (C-04, T-11…). Secondary: the kiln firing curve in the dark process section.
- **Defaults rejected:**
  - Cream + serif + terracotta "artisan" look → cool porcelain-slip neutrals (hue 258) with one azulejo-cobalt accent.
  - Three icon cards for "our process" → a real firing curve (temperature vs hours) plus six dated steps ("Day 1", "Days 2–8").
  - Stock product photos / 3D blobs → flat SVG pieces with speckled-stoneware texture at fixed aspect ratios.

## Dials

variance 5 · motion 5 · density 3

Small, calm craft studio: offset grids (7/5, 8/4) on one stable left edge; one orchestrated hero, reveal-once per block, one staggered group, one scrubbed chart; gallery-like air.

## Tokens

- **File:** css/tokens.css (motion tokens use ui-craft names, tuned ~1.3× slower)
- **Brand hue / source:** oklch hue 258 for neutrals; accent cobalt oklch(0.44 0.15 262)
- **Color roles** (light only; process section and footer use the inverse "kiln" roles):

| Role | Light | Inverse (kiln) |
|---|---|---|
| bg | --slip oklch(0.965 0.006 258) | --kiln oklch(0.2 0.03 262) |
| surface / raised | --bisque oklch(0.992 0.003 258) | --kiln-2 oklch(0.25 0.035 262) |
| band | --grog oklch(0.925 0.009 258) | — |
| text | --iron oklch(0.22 0.028 258) | --kiln-text oklch(0.93 0.01 80) |
| muted | --ash oklch(0.47 0.022 258) | --kiln-muted oklch(0.76 0.02 80) |
| border / border-strong | --seam L0.86 / --seam-strong L0.62 | --color-rule-inverse (white 12%) |
| accent | --cobalt oklch(0.44 0.15 262) | — |
| accent-text | --bisque | — |
| focus | cobalt | --ember oklch(0.8 0.13 62) |
| data-heat | — | --ember (kiln curve, step days) |
| success / danger | oklch(0.48 0.1 160) / oklch(0.47 0.16 25) | — |

- **Glaze primitives** (--glaze-celadon, -tenmoku, -shino, -cobalt, -ash, -iron, --clay-raw/-dark): illustration and tiles only, never text.
- **Contrast checked:** 2026-09-27, `contrast.py --css css/tokens.css --pairs …`; lowest text pair muted on band 5.47:1; border-strong on bg 3.29:1 (non-text, needs 3:1).
- **Spacing:** 4px base; --space-1…10 = 4/8/12/16/24/32/48/64/96/128; section padding `clamp(space-8, 9vw, space-10)`.
- **Radius:** soft; sm 4 · md 8 · lg 14 · full 999 (buttons are pills).
- **Depth strategy:** hairline borders + subtle shadows (shadow-1 date card, shadow-2 hero art / mobile nav, shadow-3 dialog).
- **Z-index:** raised 10 · sticky 100 · overlay 200 · modal 300.
- **Theme switching:** n/a (light only).

## Typography

| Role | Family | Weights | Source / loading |
|---|---|---|---|
| Display | Hedvig Letters Serif (opsz 12–24) | 400 | Google Fonts CSS API, display=swap, preconnect |
| Body | Hedvig Letters Sans | 400 | same |
| Mono | none | — | — |

- **Scale:** ~1.333 desktop / ~1.2 phone; --text-xs … --text-3xl, clamp with a rem term.
- **Line heights:** body 1.6, subheads 1.25, h2 1.1, display 1.06.
- **Measure:** 62ch body; hero lede 36ch.
- **Tracking:** display −0.025em, h2 −0.015em; tile codes +0.04em.
- **Numerals / details:** tabular-nums on prices, dates, tile codes, step days; `text-wrap: balance` on headings, `pretty` on paragraphs.
- **Fallback metrics:** "Display Fallback" (Georgia) and "Body Fallback" (Arial) with hand-estimated size-adjust/ascent overrides.

## Motion

- **Tokens file:** css/tokens.css (durations 110/180/320/560/900 ms).
- **What moves:** hero lines rise from a mask (900 ms, emphasized, 110 ms apart) → lede 420 ms → CTA and glaze strip 560 ms → art settles; the cobalt glaze pours down the hero pitcher via clip-path (240 ms delay, 900 ms); section blocks reveal once (IntersectionObserver, 28 px, 560 ms); the collection is the one staggered group (70 ms); the kiln curve is drawn with clip-path on `animation-timeline: view()`; header hairline fades in over the first 80 px of scroll; dialog rises in (320/560 ms) and leaves faster (180 ms, ease-exit); tiles tilt on hover; piece art scales 1.035 on hover.
- **What never moves:** body text after its reveal, nav links, prices, date rows.
- **Page / route transitions:** none (one page).
- **Scroll effects:** reveals on section heads, steps, workshop blocks, quotes, visit; kiln curve scrub.
- **Libraries:** none (CSS + ~150 lines vanilla JS, classic `defer` script so it runs from file://).
- **Reduced motion:** nothing hidden, no travel, no load sequence; kiln curve static and complete; header hairline always visible. Verified: 0 animations running in `capture.mjs --reduced-motion`.

## Components & libraries

| Library | Version | Used for | Why | Theming |
|---|---|---|---|---|
| none | — | — | native `<dialog>` covers the only complex widget | — |

- **Hand-rolled components:** booking dialog → native `<dialog>` + showModal (focus trap, Esc, top layer), text errors linked by aria-describedby; mobile menu → disclosure button with aria-expanded, Esc closes and returns focus.
- **Icons:** one inline close icon, 2px stroke, currentColor.

## Patterns

- **Primary button** — 48px min height · 12/24 padding · pill · text-sm · cobalt fill; hover cobalt-deep; active translateY(1px) scale(.98).
- **Small button** — 40px · 8/16 padding; quiet (outline) variant for "Join waitlist".
- **Piece** — no card chrome: framed art (radius-lg, 1px border, tinted ground) + meta below; wide variants for plate (4:3) and serving dish (400:190, split layout on desktop).
- **Section** — section-pad block padding; container 1240px; topic change = background change (slip → kiln → slip → grog → slip → kiln footer).
- **Form field** — 48px · label above · 1px border-strong; invalid = 2px danger border + text error.

## Placeholders to replace before launch

- Press quotes and publications (Casa & Mesa, Weekend Porto, Norte Design Review) are sample copy — marked in an HTML comment and `data-placeholder`.
- Prices, stock counts, workshop dates, the address (Rua do Bonfim 214), email addresses and the potters' names are plausible stand-ins.
- All piece images are SVG illustrations; swap for photography at the same aspect ratios (1:1, 4:3, 400:190, 7:8 hero).

## Decisions log

| Date | Decision | Rationale |
|---|---|---|
| 2026-09-27 | Cobalt-on-porcelain palette, not cream/terracotta | Porto azulejo + cobalt oxide is specific; cream + terracotta is the listed AI default |
| 2026-09-27 | Classic `defer` script, not `type="module"` | Modules are blocked on file:// (capture round 1 CORS error) |
| 2026-09-27 | Reveals via IntersectionObserver once, not `view()` | view() reveals reverse on scroll-up; the site should reveal once |
| 2026-09-27 | Kiln-curve labels become a numbered list below 48rem | In-SVG labels would render ~6px on phones |
| 2026-09-27 | Booking = prefilled mailto request, not a fake "booked" state | No backend; be honest about what happens |
