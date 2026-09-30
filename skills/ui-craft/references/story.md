# Story

A ui-craft site tells the brand's story, and every design channel tells the same one. This step
turns the brief (or a short interview, or a generated story) into a **Story brief** with one
**central metaphor** and one **motion language**. Direction, structure, tokens, layout and motion
are all derived from these two, which is what makes a site feel of a piece and unlike any
other.

Output: the Story brief (§5). Next: [structure.md](structure.md) turns it into a sitemap and
chapters; [direction.md](direction.md) turns it into dials and a direction line.

## Contents

1. When to run it
2. Adaptive intake: infer, ask, or interview
3. The question bank
4. When there is no story: generate one
5. The Story brief
6. The central metaphor: one idea, every channel
7. Motion languages
8. The founder's style
9. Checks

---

## 1. When to run it

| Situation | Story step |
|---|---|
| New site or full redesign | Full step |
| New page in an existing site | Read the recorded Story brief in `.ui-craft/design.md`; extend it, don't reinvent it |
| Audit, small tweak, dashboard or app screen | Skip. Apps have jobs, not stories; use `direction.md` only |

## 2. Adaptive intake: infer, ask, or interview

Count how many of the six **story signals** the brief, the existing site or the assets already
give you:

1. **Origin**: why the founder started, or where the business comes from.
2. **Tension**: what is wrong with the usual way; what the brand refuses to be.
3. **Transformation**: what changes for a customer (before → after).
4. **Proof**: real things that can be shown (work, numbers, clients, photos, press).
5. **Voice**: how the founder talks; references or brands they admire.
6. **Audience and action**: who it's for and the one thing they should do.

| Signals found | Do |
|---|---|
| 5–6 | Don't ask anything. Write the Story brief, show it with the direction line, continue. |
| 2–4 | Ask only for the missing signals, **in one message**, at most four questions. |
| 0–1 | Short interview: up to six questions from §3, in one message. |

Rules for asking:

- **Every question offers "No story yet — generate one for me"** (or "You decide") as an
  option. Anyone who picks it, skips the question or says "just build it" gets a generated
  answer (§4). The interview must never block the build.
- Use the environment's question tool when there is one (multiple-choice options with a free-text
  "Other"). Otherwise send a numbered list with lettered options, so a reply can be "1b, 2a,
  3: our mill burned down in 2009".
- Offer options drawn from **this** business, not generic personality quizzes: for a
  construction firm, "What made you start?" offers "a family trade", "tired of sites that run late
  and over budget", "a building you still walk past with pride".
- Ask once. After the answers, write the brief and proceed. Don't run a second round unless a
  reply contradicts the brief.

## 3. The question bank

Pick the questions that fill missing signals; rewrite the options for the business at hand.

| # | Signal | Question | Option shapes (always add the generate option) |
|---|---|---|---|
| 1 | Origin | What made you start this? | A frustration you lived through · a craft or trade passed down · a gap you saw from inside the industry · a moment or place that started it |
| 2 | Tension | What do you refuse to be like? | The slow / opaque / overpriced / impersonal version of this industry · name it in your words |
| 3 | Transformation | What's different for a customer after working with you? | Time saved · worry removed · something beautiful made · a result they can measure |
| 4 | Feeling | What should a visitor feel in the first ten seconds? | Calm confidence · excitement · trust and safety · curiosity · warmth and belonging |
| 5 | Voice / style | If the brand were a person walking in, what would they be like? | Quiet expert in workwear · sharp engineer · warm host · bold showman · thoughtful editor |
| 6 | Proof | What can we show that's real? | Finished work and photos · numbers we can publish · named clients or press · a founder willing to be on the page · nothing yet (use clearly marked placeholders) |
| 7 | References | Two or three sites or brands you admire, from any industry? | Free text. Take the principle (pacing, type contrast, restraint), never the look |

Question 5 is the fastest way to the founder's style (§8). Question 6 decides which sections are
possible at all ([structure.md](structure.md) §4: content decides chapters).

## 4. When there is no story: generate one

If the user chose "generate one for me" (or gave no answer), write a story that fits the
business, its place and its audience. Make it plausible and specific, and label it as proposed.

1. Pick a **story angle** that suits the business (table below). Name two runner-up angles in one
   line each so the user can swap: "Went with *The Steward*. Alternatives: *The Engineer*
   (precision) or *The Neighbour* (local roots)."
2. Write the brief (§5) from that angle, using details that are true of the business type and
   place (materials, trade rituals, the local landscape, the customer's actual day).
3. **Never invent verifiable facts.** Founding years, awards, client names, numbers, quotes,
   certifications and team names become bracketed placeholders (`[founding year]`,
   `[client quote — needs approval]`) and are listed in the hand-off. Sample copy in a demo is
   marked in the source and never presented as real (see [copy.md](copy.md)).

| Angle | The story it tells | Fits |
|---|---|---|
| The Maker | obsession with how the thing is made | trades, food, furniture, hardware |
| The Rebel | the industry's usual way is broken; here is the fix | challengers, fintech, DTC |
| The Guide | an expert who shows you the way through complexity | consultancies, clinics, education, legal |
| The Steward | care for a place, people or the planet over time | agriculture, conservation, property, family firms |
| The Pioneer | first into new territory | deep tech, science, space, new categories |
| The Neighbour | rooted in a place and its community | local services, cafés, gyms, independent retail |
| The Alchemist | turns raw into refined, before into after | renovation, beauty, design studios, restoration |
| The Engineer | precision, systems, nothing left to chance | developer tools, manufacturing, logistics, construction |
| The Host | an experience made for you | hospitality, events, travel, restaurants |
| The Archivist | heritage and continuity | old firms, archives, publishers, heritage crafts |

An angle is where the thinking starts, not a costume. Two Makers (a knife smith and a bike
builder) should still get unrelated sites because their metaphors, materials and proof differ.

## 5. The Story brief

Write this block, show it to the user with the direction line, then continue without waiting.
Record it in `.ui-craft/design.md` (section "Story").

```
STORY BRIEF — <brand>
Vision (founder's voice): "<one sentence the founder would actually say>"
Origin:          <two sentences>
Tension:         <what's wrong with the usual way / what we refuse to be>
Transformation:  <customer before → after>
Proof on hand:   <real items; placeholders marked [ ]>
Voice:           <three adjectives> — never <one thing it must never sound like>
Angle:           <angle> (generated | from interview | from brief)
Central metaphor: <one noun phrase> — <why it's true of this business>
Motion language:  <preset> — <one line: how things move here>
Story arc:        <arc from structure.md §3, adapted>
```

## 6. The central metaphor: one idea, every channel

The metaphor is the brand's work turned into a picture that can **change over time**, so it can
be scrolled. It is what keeps layout, motion and palette in step: each channel expresses the same
idea, so they never feel like separate decisions.

A good metaphor is:

- **true**: it describes what the business actually does, not a mood;
- **drawable**: it can be shown as a scene, a diagram or a photograph sequence;
- **staged**: it has three to six distinct states (the chapters of the scroll);
- **ownable**: a competitor could not use it without it being obviously borrowed.

Then derive every channel from it. Three worked examples (the shape to copy, not the content):

| Channel | Construction firm — "assembly" | Tea importer — "leaf to cup" | Budgeting app — "compounding" |
|---|---|---|---|
| Layout | Stacked, load-bearing blocks; thick rules as beams; heavy bottom-weighted sections | Flowing asymmetric columns that drift like a river; route lines connect sections | Grid that densifies as you go: sparse at the top, rich by the end |
| Motion | `weighty`: parts drop and settle; the building assembles in a sticky stage | `organic`: slow curves; a route draws across a map from estate to port to cup | `precise`: small increments that add up; bars grow step by step |
| Palette | Concrete greys, safety orange as the single accent, raw timber for warmth | Leaf greens through oxidised amber to the liquor's red-brown, in the order of processing | Neutral base; the accent saturates as the numbers grow |
| Type | Condensed grotesk in heavy weights, like stencilled site signage | Humanist serif with calligraphic warmth; small caps for estate names | Tabular mono numerals beside a friendly grotesk |
| Imagery | Real site photos, cranes, hands on rebar; elevation drawings | Estates, pickers' hands, the colour of each infusion | The user's own numbers; no stock people |
| Micro-interactions | Buttons press down with weight; hover lifts a slab | Links underline with a brush-like wipe | Counters tick; toggles snap precisely |
| Section transitions | Hard cuts like floors; each section stacks on the last | Soft dissolves; the route line carries across sections | Continuous; each section continues the previous chart |
| Signature scene | Building assembles floor by floor as the process steps scroll | The journey map | A savings curve that draws as the story of a year scrolls |

## 7. Motion languages

A motion language is the brand's physics: how heavy things are, how they arrive, how they
settle. Pick **one** per site; it sets the motion tokens (`assets/motion/tokens.css`), the
scene engine's easing and distances (`assets/motion/story/languages.js`), and even how hover and
menus feel. The names match the presets in `languages.js`.

| Language | Feels like | Arrival | Layout and type affinity | Typical brands |
|---|---|---|---|---|
| `weighty` | mass, gravity, craftsmanship | drops a short distance and settles with a small bump | thick rules, stacked blocks, heavy condensed type | construction, manufacturing, furniture, outdoor |
| `precise` | engineering, trust in the system | slides a small exact distance, ease-in-out, no overshoot | hairline grid, mono accents, tight spacing | dev tools, fintech, logistics software, labs |
| `organic` | growth, nature, care | grows from an origin point, slow sine curves | curves, flowing asymmetry, humanist type | agriculture, wellness, food, conservation |
| `airy` | luxury, calm, editorial | fades with barely any travel, long expo-out | wide margins, thin high-contrast type, big images | hospitality, fashion, architecture, galleries |
| `playful` | delight, friendliness | pops with a springy overshoot | rounded shapes, bright flat blocks, chunky type | consumer apps, kids, snacks, games |
| `cinematic` | drama, launch, awe | long travel, power4 in-out, scale and zoom | full-bleed media, huge type over imagery | film, launches, flagship products, events |
| `mechanical` | machines, rhythm, reliability | moves in steady beats, linear-ish, occasional stepped motion | modular grids, labels like instrument panels | industrial, transport, energy, hardware |

Tuning is allowed (a *slower* weighty, a *drier* playful); mixing two languages on one page is
not, except that UI feedback (hover, focus, menus) can be quicker than scenes. Sync rule: the
duration and easing tokens for UI come from the same preset (`cssTokens`), so a button in a
weighty site presses like a heavy thing too.

## 8. The founder's style

The site should feel like the founder made it. Read their style from how they write the brief,
their answer to question 5, their references, and any existing material. Then let it move the
dials:

| Founder reads as | Pushes toward |
|---|---|
| Understated expert ("we just do it properly") | `precise` or `airy`; low variance; proof over claims; no hype words |
| Warm host ("come in, you're welcome here") | `organic`; rounded shapes; people in photos; first-person copy |
| Showman / visionary ("this changes everything") | `cinematic`; high variance; one huge statement; bold scene |
| Craftsperson ("look at the joinery") | `weighty`; macro detail shots; zoom-into-detail scenes |
| Engineer ("here is how it works") | `precise` or `mechanical`; diagrams that build; data in mono |
| Rebel ("the industry is broken") | status-quo swap, myths flipped; sharp contrast; confident voice |
| Storyteller ("it started in my grandmother's kitchen") | letter-led arc; origin timeline; serif voice |

References the founder admires show taste, not a template. Write down the *principle* taken from
each ("long quiet pauses between dense sections", "one colour used with discipline") and don't
copy layouts, copy, or signature effects.

## 9. Checks

Run these on the Story brief before structure, and again on the first screenshots.

| Check | Question | Fails when |
|---|---|---|
| **Name swap** | Replace the brand name with a competitor's. Does the brief still fit? | Yes: the story is generic. Sharpen origin, tension or metaphor |
| **Sync** | Pick any section. Can you say how its layout, its motion *and* its color each express the metaphor? | One channel is arbitrary. Change that channel, not the metaphor |
| **Staging** | Can the metaphor be shown in three to six distinct states? | It's a mood, not a picture. Pick a more concrete metaphor |
| **Honesty** | Is every fact in the brief real or marked `[ ]`? | Invented years, clients, numbers or quotes |
| **Founder** | Would the founder recognise their own voice in the vision line? | It sounds like marketing copy. Rewrite in plain first person |
