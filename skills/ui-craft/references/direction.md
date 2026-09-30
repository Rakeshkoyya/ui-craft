# Direction

How to turn a brief into a point of view before any code exists. Output of this step: one
"Reading this as:" line, three dial values, a short domain exploration, and a named signature
element. Everything later (tokens, type, layout, motion) is checked against it.

For brand sites, run [story.md](story.md) and [structure.md](structure.md) first: most signals
below then come from the Story brief, the signature element is the central metaphor in motion,
and the motion dial is read together with the motion language. For app screens, start here.

## Contents

1. Read the brief
2. The "Reading this as:" line
3. The three dials
4. Domain exploration
5. The four tests
6. AI-default looks to avoid
7. Direction archetypes (starting vocabulary)

---

## 1. Read the brief

Before deciding anything, pull these signals out of the request, the repo, and any assets:

| Signal | Where it comes from | What it decides |
|---|---|---|
| Page kind | "landing page", "docs", "dashboard", "portfolio", route names | Layout family, density, how much motion is appropriate |
| Audience | Named users, industry, price point, age | The aesthetic register. The audience picks the look, not your taste |
| Job to be done | The one action the page exists for (buy, book, read, sign up, compare) | What gets the boldness; what stays quiet |
| Vibe words | "calm", "bold", "premium", "playful", "serious" | Dial values, type choices |
| References | URLs, screenshots, "like Linear/Stripe/an old newspaper" | Borrow the principle, never the pixels |
| Existing assets | Logo, brand colors, fonts, photography, `.ui-craft/design.md` | Hard constraints. Build around them |
| Quiet constraints | Public sector, healthcare, finance, kids, accessibility-first, low-end devices | Override aesthetics. Lower variance and motion, raise legibility |

If a signal is missing, infer the most likely value from the others and say so in the
direction line. Don't interview the user.

**Ask at most one question**, and only when two plausible readings would produce clearly
different sites (for example: "Is this for investors or for end customers?"). Offer the two
readings as options. Otherwise declare your reading and proceed; the user can correct it.

## 2. The "Reading this as:" line

Write one line, show it to the user, then continue working:

> **Reading this as:** <page kind> for <audience>, <tone in 3–5 words> — <signature element>,
> <motion character / motion language>. Dials: variance N · motion N · density N.

Examples (the shape to copy, not the content — your brief's subject supplies its own signature):

| Brief | Reading this as | Dials (V · M · D) |
|---|---|---|
| Fintech | savings app for freelancers, steady and plain-spoken — an income-smoothing chart that draws once as you reach it, quick settle motion | 3 · 4 · 5 |
| Dev tool | changelog and docs hub for a database CLI, precise and quiet — monospaced version rail down the left edge, near-instant state changes | 3 · 2 · 7 |
| Restaurant | late-night noodle bar, loud and hungry — a hand-lettered menu board that scrolls sideways, snappy hover feedback | 7 · 5 · 4 |
| Nonprofit | river-cleanup volunteer drive, urgent but hopeful — a map where cleared stretches fill in as you scroll, calm reveals | 4 · 5 · 4 |
| Fashion | capsule outerwear drop, cold and editorial — cropped full-bleed photography wiped in on enter, slow deliberate motion | 8 · 6 · 2 |
| SaaS dashboard | on-call incident console, dense and calm — severity timeline as the spine of every view, motion only for state changes | 2 · 2 · 9 |
| Portfolio | motion designer's reel site, confident and playful — case studies as stacked cards that recede as the next arrives | 7 · 8 · 3 |
| Event | two-day climate-tech summit, bright and civic — a countdown-to-agenda strip that turns into the live schedule on the day | 5 · 5 · 5 |

Write it as one sentence in the "Reading this as:" format above.

A good line names something only this product would have. "Modern, clean, and professional"
is not a direction; it describes every template.

## 3. The three dials

Each dial runs 1–10. They are shorthand for many small decisions; set them once and let them
drive tokens and layout. Record them in `.ui-craft/design.md`.

### VARIANCE — how far the layout departs from the expected

| Band | In practice |
|---|---|
| 1–3 | Symmetric 12-column grid, centered containers, predictable section order, consistent card sizes. Trust over surprise |
| 4–6 | Offset columns (7/5, 8/4), one full-bleed moment, mixed media aspect ratios, a section that breaks the grid on purpose, left-aligned hero |
| 7–8 | Asymmetric grids (`2fr 1fr 1fr`), overlapping elements, oversized type cropping at the edge, varied section rhythm, editorial whitespace |
| 9–10 | Poster-like compositions, rotated or stacked type, unconventional navigation. Reserve for art, fashion, agencies, events |

Infer: portfolios, agencies, fashion, culture → 6–9. Consumer product marketing → 4–6.
SaaS app screens, docs, government, healthcare → 2–4. Above 4, avoid centering the hero by
reflex. Above 7, check that reading order and focus order still make sense.

### MOTION — how much the interface moves

| Band | In practice |
|---|---|
| 1–2 | State feedback only: hover/active/focus color and shadow shifts, 100–150 ms. Nothing moves on load |
| 3–4 | Plus: overlay and menu enter/exit, small content reveals, tab/accordion transitions. 150–300 ms |
| 5–6 | Plus: one orchestrated load sequence, scroll reveals on key sections (not every block), route transitions |
| 7–8 | Plus: scroll-linked progress, shared-element/page transitions, pinned storytelling sections, animated type |
| 9–10 | Cinematic: scroll-driven scenes, WebGL or canvas moments. Needs a performance budget and a strong reason |

Infer: calm, trust, utility, dense data → 2–4. Product marketing → 4–6. Launch pages,
portfolios, entertainment → 6–8. If motion is set above 4, the page must actually move in the
captured frames; otherwise lower the dial to match reality. Every level honors
`prefers-reduced-motion`. Details and recipes: [motion.md](motion.md).

### DENSITY — how much information per screen

| Band | In practice |
|---|---|
| 1–3 | Gallery: one idea per viewport, section padding 96–160 px, large type, lots of air |
| 4–6 | Standard marketing/product: 64–112 px section padding, 2–3 columns of content |
| 7–8 | Product UI: compact rows (36–44 px), 8–16 px gaps, tables, sidebars, smaller type steps |
| 9–10 | Cockpit: dashboards and terminals. Hairline dividers instead of cards, mono numerals, 4 px rhythm |

Infer: luxury, portfolio, one-product launches → 2–3. Most marketing sites → 4–5. Docs, admin,
analytics → 7–9. Density changes the spacing scale in [tokens.md](tokens.md) and the grid in
[layout.md](layout.md), not just padding in one place.

## 4. Domain exploration

Sameness comes from designing with no subject in mind. Spend two minutes on the subject before
touching color or type. Write these down (in your head or in the design memory):

1. **Concepts** — five or more nouns, verbs, or objects from the subject's world. For a
   coffee roaster: roast curve, green bean sacks, cupping spoons, origin stamps, drum roaster.
2. **Color world** — five or more colors that physically exist in that world (the burlap, the
   roast stages from pale green to dark brown, the enamel of the scale). Palette roles come
   from here, not from a trending palette.
3. **Signature** — one element that only this product could have: the roast curve as a section
   divider, origin stamps as category badges, a cupping-score dial. It gets the boldness.
4. **Defaults being rejected** — name three obvious choices and what replaces each:
   - "Hero with a centered headline over a stock photo" → roast-curve line that draws across a
     full-bleed bag photograph.
   - "Three feature cards" → a single long table comparing origins, one row per bean.
   - "Inter everywhere" → a condensed grotesk for labels, a warm serif for the story.

If the brief doesn't say what the subject is, propose one and confirm it in the direction
line. Palettes and font pairings from `search.py --domain palettes|fonts` are raw material to
adjust toward this color world, never a finished answer.

## 5. The four tests

Run these on the token plan (step 3 of the workflow) and again on the first screenshots.

| Test | Question | Fails when |
|---|---|---|
| **Swap** | If you replaced the fonts, colors and imagery with the generic defaults, would anything important change? | Nothing changes. The design has no decisions in it |
| **Squint** | Blur your eyes (or the screenshot). Is there one clear focal point per viewport and an obvious reading order? | Everything is the same weight; or three things compete |
| **Signature** | Point to at least three concrete places where the signature element or the domain shows up | You can only point to the logo |
| **Token** | Read the token names aloud. Do they belong to this product's world and describe roles? | Names like `--purple-500` used directly in components, or roles copied from another project |

When a test fails, change the signature element or the one bold decision. Don't restyle
everything; that usually produces a different generic look.

## 6. AI-default looks to avoid

These show up when a model has no direction. Treat them as defaults, not choices: if the brief
genuinely asks for one, use it deliberately and make the rest of the page specific. Mechanical
versions are linted by `slop_lint.py`; see [anti-patterns.md](anti-patterns.md).

| Look | What it is | Why it reads as generated |
|---|---|---|
| **Indigo-violet glow** | Indigo→purple gradients (`#6366f1`→`#a855f7`), purple glows, gradient text headline, dark background | The single most common output for "modern SaaS" |
| **Glass on blur** | Frosted translucent cards over blurred gradient blobs, on every section | Decoration without structure; poor contrast |
| **Three-card feature row** | Three equal cards, emoji or line icon on top, title, two lines of text | Filler layout that fits any product |
| **Centered everything** | Every section a centered headline, centered paragraph, centered button | No hierarchy or rhythm; reads as a template |
| **SaaS card kit** | Every block the same rounded card, same soft shadow, same padding | Removes all contrast between content types |
| **Cream + serif + terracotta** | Off-white `#f4f1ea`-type page, serif headings, clay/terracotta accent | The default "warm, premium" answer |
| **Near-black + acid accent** | Black page, one neon-green or lime accent, mono labels | The default "technical, edgy" answer |
| **Espresso + brass** | Dark brown/black with gold or brass accents | The default "luxury" answer |
| **Template chrome** | Tracked uppercase eyebrow above every heading, `01 / 02 / 03` section numbers, `→` on every CTA, `A · B · C` meta strings | Labels added for texture, not meaning |
| **Div-built fake UI** | Fake dashboards, terminals and phone screens assembled from divs as hero art | Obviously not the product; shows no real value |
| **Stock 3D blobs** | Glossy abstract 3D shapes or orbs as the hero visual | Says nothing about the subject |
| **Inter for everything** | One neutral sans for display and body, default weights | No typographic voice |
| **Fade-up on everything** | Every block fades and rises 20 px as it scrolls in, same timing | Motion as wallpaper; slows reading |
| **Hype copy** | "Unlock the power of…", "Elevate your workflow", "Seamless" | Words that fit any product mean nothing |

## 7. Direction archetypes (starting vocabulary)

These are vocabulary for talking about a direction, not presets to apply. Pick the one closest
to the brief, then bend it with the domain exploration. Two sites built from the same archetype
should still look unrelated because their subjects differ.

**Editorial** — reading first. Strong typographic hierarchy, a serif or characterful grotesk
for display, generous measure control, images with captions, rules and columns instead of
cards. Variance 5–7, motion 2–4, density 3–5. Risk: becoming the cream-and-serif default.

**Technical / precise** — for tools, infrastructure, data. Tight grid, mono accents for real
data (versions, numbers, keys), hairline borders, restrained color with one functional accent,
near-instant transitions. Variance 2–4, motion 2–3, density 6–8. Risk: near-black + acid
accent, or fake terminal art.

**Warm / crafted** — for makers, food, small businesses, education. Tactile textures or real
photography, rounded-but-not-bubbly shapes, a friendly serif or humanist sans, earthy or
produce-derived colors. Variance 4–6, motion 3–5, density 3–5. Risk: stock "artisan" imagery.

**Bold / brutal** — for campaigns, culture, events, youth brands. Heavy display type at huge
sizes, hard edges, full-contrast borders, flat saturated fills, deliberate awkwardness.
Variance 7–9, motion 4–7, density 3–6. Risk: unreadable; keep body text and focus states
conventional.

**Luxury / quiet** — for hospitality, fashion, architecture, high-end services. Space as the
main material, thin or high-contrast type, a near-monochrome palette, slow and small motion,
photography carrying the color. Variance 4–6, motion 2–4, density 1–3. Risk: espresso + brass,
or so sparse the page says nothing.

**Playful** — for consumer apps, kids, games, food brands. Rounded type, chunky radii, bright
flat color used in blocks, springy feedback on interaction, illustrations with a consistent
hand. Variance 5–7, motion 5–7, density 3–5. Risk: noise; keep one accent family.

**Civic / trustworthy** — for government, healthcare, finance, nonprofits. Plain language,
highly legible type, obvious navigation, strong contrast, minimal decoration and motion,
predictable layout. Variance 2–3, motion 1–3, density 4–6. Risk: looking unfinished; craft
shows in spacing and typography.

**Cinematic / immersive** — for launches, films, games, flagship products. Full-bleed media,
scroll-driven scenes, large type over imagery, dark or media-driven palette. Variance 6–9,
motion 7–10, density 1–3. Risk: slow pages and motion sickness; needs a performance budget
and a complete reduced-motion path.
