# Structure

Different colours on the same skeleton still read as the same site. This step designs the
skeleton itself: which pages exist, what each page's chapters are, in what order, and at what
intensity. All of it comes from the Story brief ([story.md](story.md)) and the content the brand
actually has.

Output: a **Structure plan** (§8): sitemap, one chapter table per key page, a pacing curve,
and a history check. Record it in `.ui-craft/design.md` ("Structure").

## Contents

1. The default skeleton, and why it's banned
2. Sitemap from jobs and story
3. Story arcs: starting shapes for the home page
4. Choosing chapters
5. Pacing: the intensity curve
6. Interior pages get their own arcs
7. Variation across generations (history)
8. The Structure plan
9. Checklist

---

## 1. The default skeleton, and why it's banned

With no structure step, a model reaches for the same home page every time:

> hero (headline + two buttons + image) → logo strip → three feature cards → "how it works" 1-2-3
> → testimonial carousel → three pricing tiers → FAQ accordion → gradient CTA banner → footer

Each block is sometimes right. The problem is the whole sequence, used by default. **A plan that
contains four or more of these blocks in this order fails**, unless you can name, for each one,
why this brand needs it here. When a block is genuinely needed, use its story-shaped
alternative from the catalogue instead (`search.py "<need>" --domain sections`): testimonials →
`voices-montage`; features → `sticky-build`, `exploded-anatomy`, `long-comparison`; how it works →
`process-path` or `flow-diagram`; CTA banner → `invitation` or `expanding-finale`; logo strip →
`press-masthead` or `ledger`.

## 2. Sitemap from jobs and story

Build the sitemap from two lists, then merge them:

- **Visitor jobs**: what people come to do (compare prices, see past work, book, find the
  address, check credentials, read the docs).
- **Story needs**: what the brand must say that no job asks for (the origin, the method, the
  belief).

| Scope | Shape |
|---|---|
| One offer, one action, little content | One long page with chapters; nav jumps to chapters |
| A few offers or audiences | Home + 3–5 pages; each page one job |
| Portfolio, catalogue, publishing | Home + index page + detail template + about |
| Two audiences with different jobs | Two tracks from the home page (`two-doors`), shared about/contact |

Naming: page titles and headings may use the brand's language ("The Yard", "Field Notes",
"Where it grows"), but **navigation labels stay plain** ("Projects", "Journal", "Sourcing"), or
pair a plain label with the flavour name. Visitors must never guess what a link does.

Routes for the default stack (Next.js App Router) are in
[stacks/react-next.md](stacks/react-next.md) ("New site scaffold").

## 3. Story arcs: starting shapes for the home page

An arc is the order in which the story unfolds. Pick the one closest to the Story brief, then
**mutate it**: swap at least one chapter for something the brand has that the arc didn't
expect, and rename every chapter in the brand's words. Ids refer to rows in
`data/sections/archetypes.csv`.

| Arc | Chapter sequence (archetype ids) | Fits |
|---|---|---|
| **Build log** | `cold-open` → `problem-scaled` → `sticky-build` → `field-log` → `crew-portraits` → `invitation` | construction, manufacturing, trades, product development |
| **Journey** | `cold-open` → `map-journey` → `hands-at-work` → `index-catalogue` → `visit-us` | sourcing, food and drink, travel, logistics |
| **Manifesto-first** | `manifesto` → `work-index` → `interlude` → `crew-portraits` → `invitation` | agencies, studios, purpose-led brands |
| **Product film** | `product-first-hero` → `product-orbit` → `exploded-anatomy` → `ledger` → `long-comparison` → `invitation` | hardware, devices, vehicles, equipment |
| **Explainer** | `statement-hero` → `status-quo-swap` → `flow-diagram` → `playground` → `faq-dialogue` → `guided-pricing` | fintech, developer tools, insurance, public services |
| **Transformation** | `before-after` → `metamorphosis` → `voices-montage` → `inline-booking` | renovation, fitness, clinics, restoration, design studios |
| **Letter** | `founder-letter` → `first-artifact` → `hands-at-work` → `community-wall` → `closing-letter` | founder-led small businesses, makers, cafés |
| **Heritage** | `then-and-now` → `origin-timeline` → `hands-at-work` → `index-catalogue` → `next-chapter` | old firms, family businesses, heritage crafts |
| **Documentary** | `live-proof-hero` → `problem-scaled` → `data-story` → `map-journey` → `voices-montage` → `invitation` | nonprofits, sustainability, research, impact reports |
| **Day in the life** | `cold-open` → `day-in-the-life` → `mixed-proof-grid` → `visit-us` | hospitality, gyms, apps used daily, co-working |
| **Index-first** | `work-index` → `interlude` → `founder-letter` → `next-chapter` | portfolios, photographers, architects, publishers |
| **Two tracks** | `two-doors` → (track A chapters · track B chapters) → shared `faq-dialogue` → `invitation` | marketplaces, B2B2C, clinics with patients and referrers |
| **Brand world** | `brand-world` with 3–4 stops → `work-index` → `invitation` | flagship launches, entertainment, immersive studios |
| **Storybook** | `illustrated-panels` → `manifesto` → `index-catalogue` → `invitation` | character-led brands, kids, anniversaries |

Mutation examples: a Build-log site for a timber-frame builder swaps `field-log` for a
`then-and-now` of one restored barn; a Journey site for a bike-touring company swaps
`index-catalogue` for `day-in-the-life` on a single route.

## 4. Choosing chapters

For each beat of the arc, search the catalogue with words from the brief:

```
python <skill>/scripts/search.py "origin story founder" --domain sections
python <skill>/scripts/search.py "renovation results" --domain sections
```

Rows give the layout, motion, the recipes it pairs with, and when to avoid it. Then apply:

1. **Content decides.** A chapter is only possible if the content exists or can honestly be made:
   no `voices-montage` without real quotes, no `data-story` without data, no `founder-letter`
   without a founder willing to sign it. Missing content → a different archetype, not placeholder
   filler. (Demo builds may use clearly marked samples; see [copy.md](copy.md).)
2. **Vary layout families.** At least four families across a home page (full-bleed scene,
   sticky split, text-led column, index/list, grid, pinned chapters, split media).
   **No two neighbouring chapters share a family.**
3. **One showpiece.** The signature scene (the metaphor in motion) appears once at full scale,
   usually 30–60 % down the page, then **echoes** two or three times in small forms: a section
   divider drawn from the scene's line, an icon set in its shapes, a hover state that uses its
   motion.
4. **Budget pins.** At most one pinned or sticky scene per ~2.5 viewport heights of page, and
   each pinned scene no longer than ~3 viewport heights of scroll. More reads as scroll-jacking.
5. **Always an ask.** Every page ends in a way to act, in the brand's form (invitation, booking,
   next chapter), never a dead end.

## 5. Pacing: the intensity curve

Plan intensity (0–5: how much moves and how much it asks of the reader) per chapter, like the
beats of a film. A good curve opens with a hook, breathes, builds to the showpiece, settles into
proof, and closes warmly. Two flat lines (everything at 4, or everything at 1) are both failures.

```
5 |            ██
4 | ██         ██
3 | ██    ██   ██   ██
2 | ██ ██ ██   ██   ██ ██
1 | ██ ██ ██ ██ ██ ██ ██ ██
    open tension method pause SHOWPIECE proof people invitation
```

The motion dial ([direction.md](direction.md)) caps the peak: motion 4 means the showpiece is a
calm sticky build, not a pinned 3D fly-through. On phones, shorten every chapter, turn pins into
stacked or top-sticky stages, and keep the curve's shape.

## 6. Interior pages get their own arcs

Interior pages aren't the home page again. Give each one a small arc that serves its job:

| Page | Arc shape |
|---|---|
| About / story | origin → tension → people → belief → invitation (the story in full; the home page only hinted at it) |
| Services / offer | one chapter per service, each with its own proof; a comparison where choice is hard |
| Case study / project | situation → approach → result, told as `case-chapters`; ends on `next-chapter` |
| Product detail | product in hand → anatomy or orbit → specs ledger → buy |
| Journal index | `work-index`-style list, then one featured long read |
| Contact / booking | the practical facts first, the form second, what happens next third |

Shared chrome (nav, footer, transitions) carries the metaphor across pages; page transitions use
the motion language ([storytelling-motion.md](storytelling-motion.md) §6).

## 7. Variation across generations (history)

Each project knows only itself, so across projects a model repeats itself. The local history file
`~/.ui-craft/history.json` remembers recent structures:

```
python <skill>/scripts/history.py show
python <skill>/scripts/history.py check --arc build-log --language weighty \
    --signature building-assembles --sections cold-open,problem-scaled,sticky-build,field-log,crew-portraits,invitation
python <skill>/scripts/history.py add --brand "Northbeam Builders" --arc build-log --language weighty \
    --signature building-assembles --palette concrete-safety --stack next \
    --sections cold-open,problem-scaled,sticky-build,field-log,crew-portraits,invitation
```

- `show` before choosing an arc: prefer an arc, signature and motion language you haven't used
  recently when two options fit equally well.
- `check` after drafting the plan. Similarity ≥ 0.7 (exit 1) is **advice, not a veto**: keep the
  plan if the brand really calls for it and say why in one line, or change the arc, the signature
  scene or two chapters. Similar structures are fine when chosen, not when defaulted to.
- `add` once the user has accepted the structure (or the build is done). Section ids are the
  archetype ids you used, in order. Say in the hand-off that history was recorded, and skip `add`
  if the user asks for nothing to be stored outside the project.

## 8. The Structure plan

Show this with the Story brief and the direction line, then proceed:

```
STRUCTURE — <brand>          arc: <arc> (mutated: <what changed>)
Sitemap:  /  ·  /projects  ·  /projects/[slug]  ·  /the-yard (About)  ·  /contact
History:  closest 0.41 to "<brand>" (2026-09-12) — distinct

Home
| # | Chapter (brand words)      | Archetype        | Family        | Scene / motion               | Int. | Content needed            |
|---|----------------------------|------------------|---------------|------------------------------|------|---------------------------|
| 1 | "Every build starts with a hole in the ground" | cold-open | full-bleed | site photo settles, line lands | 4 | one site photo |
| 2 | 38 % of projects run late   | problem-scaled   | text-led      | number grows to fill (weighty) | 3 | sourced statistic [ ] |
| 3 | How we build               | sticky-build     | sticky split  | building assembles, 5 steps  | 5    | 5 short step texts        |
| … | …                          | …                | …             | …                            | …    | …                         |
```

## 9. Checklist

- [ ] Sitemap merges visitor jobs and story needs; nav labels are plain.
- [ ] The home page doesn't contain four or more default-skeleton blocks in order.
- [ ] Arc chosen from the Story brief and mutated; chapters renamed in the brand's words.
- [ ] Every chapter's content exists or is honestly marked; no filler chapters.
- [ ] Four or more layout families; no two neighbours share a family.
- [ ] One showpiece at full scale plus two or three echoes.
- [ ] Pins within budget; intensity curve has a clear peak and quiet stretches.
- [ ] Interior pages have their own arcs.
- [ ] `history.py check` run; result stated; `add` run after acceptance.
