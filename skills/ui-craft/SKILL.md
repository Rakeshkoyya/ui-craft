---
name: ui-craft
description: Use when building, redesigning, polishing, or reviewing a website or web UI - landing pages, brand and marketing sites, portfolios, product sites, dashboards, components - on any stack (Next.js by default for new sites). Especially use when the site should tell a brand's or founder's story, needs a structure and look unique to that brand rather than a template, needs motion graphics or scroll storytelling (sticky scenes that build as you scroll, pinned chapters, page transitions, micro-interactions), should reuse third-party component libraries, or should be checked visually by taking screenshots and iterating until it looks right.
license: MIT
metadata:
  version: 0.2.0
---

# ui-craft

Build web interfaces that tell the brand's story in motion, look like nobody else's, and are
verified with your own eyes (screenshots), not assumed from source code.

`<skill>` below means the directory containing this file. Run scripts with that path, e.g.
`python <skill>/scripts/search.py "pricing table" --stack react`.

## The standard

A ui-craft result has all of these:

1. **A story.** The site tells this brand's story: its origin, what it refuses to be, what it
   changes for people. One central metaphor drives layout, palette, type *and* motion, so they
   feel like one decision, not four.
2. **A structure of its own.** The sitemap and the order of sections come from the story and the
   content the brand actually has, never from the default hero → features → testimonials → CTA
   template. Two brands never get the same skeleton in different colours.
3. **Motion that tells.** Each chapter's motion performs what the chapter says (a builder's site
   builds; an importer's route draws). One motion language (the brand's physics) everywhere.
   Only `transform`, `opacity`, `filter`, and `clip-path` are animated. Reduced motion is honored.
4. **A system.** Every color, size, space, radius, shadow, duration and easing comes from tokens.
5. **A floor that never breaks.** WCAG AA contrast, visible focus, keyboard reachable, real alt
   text, no horizontal scroll at 390 px, tap targets ≥ 24 px, no layout shift, no content left
   invisible if a script fails.
6. **Evidence.** It was captured at mobile and desktop widths, looked at, critiqued, and fixed.

## Route first

Decide which situation you're in — it changes everything after:

| Situation | Do |
|---|---|
| **Audit / review** ("what's wrong with…", "review this UI") | Follow `references/modes/audit.md`. Don't redesign unasked. |
| **Redesign / polish an existing page** | Follow `references/modes/redesign.md`: capture before, keep what works, change on purpose. |
| **New page in an existing site** | Read the app's UI and `.ui-craft/design.md` (story, structure, motion language) first. Extend them; don't fork them. |
| **New site / project** | Full workflow below. No stack named → **Next.js** (App Router, TypeScript) with GSAP or Motion: `references/stacks/react-next.md` "New site scaffold". A named stack always wins. |
| **App screens / dashboards** | Skip steps 2–3 (apps have jobs, not stories); keep the rest. |
| **Small tweak** (one button, one color) | Skip to steps 7–9 at the scale of the change. Don't run the whole process. |

## Workflow

Load references when you reach the step that needs them, not all up front. Read only the sections
you need: most files open with a short summary. For a new brand site the usual set is
`story.md`, `structure.md`, `direction.md`, `tokens.md`, `storytelling-motion.md`, `motion.md` and
`visual-loop.md`, plus one stack file.

### 1. Read context before inventing anything

- If `.ui-craft/design.md` exists, read it first. Its decisions are settled; follow them and don't
  "fix" them in reviews. (Contract: `references/design-memory.md`.)
- Otherwise scan the project: framework, styling approach (Tailwind? CSS modules?), existing
  tokens/theme files, component libraries already in `package.json`, fonts in use, one or two
  representative pages. Existing choices beat new ones.

### 2. Story — the brand, the founder, the metaphor

Follow `references/story.md`. Count the story signals the brief already gives (origin, tension,
transformation, proof, voice, audience). Rich brief → infer. Gaps → ask only for what's missing,
in one message. Nothing to go on → a short interview. **Every question offers "No story yet —
generate one for me"**, and a generated story never invents facts (placeholders instead). Output:
the Story brief with a **central metaphor** and a **motion language** (`weighty`, `precise`,
`organic`, `airy`, `playful`, `cinematic`, `mechanical`).

### 3. Structure — sitemap, chapters, pacing

Follow `references/structure.md`. Derive the sitemap from visitor jobs plus story needs; pick a
story arc and mutate it; choose each chapter from the section catalogue by what the brand
actually has:

```
python <skill>/scripts/search.py "renovation before and after" --domain sections
python <skill>/scripts/history.py show
python <skill>/scripts/history.py check --arc journey --language organic --sections cold-open,map-journey,hands-at-work
```

Plan one showpiece, an intensity curve with quiet stretches, and at least four layout families.
History is advice for variation, not a veto: a similar structure is fine when chosen on purpose.

### 4. Direction

Turn the story into one line and show it to the user together with the Story brief and the
Structure plan, then continue:

> **Reading this as:** a build-log site for a timber-frame builder, grounded and exact — a frame
> that raises itself as the process scrolls, `weighty` motion. Dials: variance 6 · motion 7 · density 4.

Dials, domain exploration and the AI-default looks → `references/direction.md`.

### 5. Tokens first, then critique them

Define color roles, type scale, spacing scale, radius, shadows, and motion tokens (durations +
easings from the motion language's `cssTokens`) before writing components →
`references/tokens.md`, `references/typography.md`. The palette comes from the metaphor's world
(story.md §6), not a trending palette. Check contrast of every text/background pair:

```
python <skill>/scripts/contrast.py "#6b6b6b" "#fafaf7"
python <skill>/scripts/contrast.py --css src/styles/tokens.css
```

Then critique the plan: would it look the same for a different brand? If yes, change the
signature element, not everything. Starting points: `search.py "warm editorial" --domain palettes`
/ `--domain fonts` with one to three mood words; treat results as raw material.

### 6. Find components before hand-rolling

For anything interactive or complex (dialog, menu, combobox, date picker, carousel, tabs,
toast, command palette, data table, animated text/background), search the catalog:

```
python <skill>/scripts/search.py "date picker" --stack vue
python <skill>/scripts/search.py "animated hero background" --stack react
```

Preference order: a library **already in the project** → a **native element** when it does the
job (`<dialog>`, `popover`, `<details>`, `<input type="date">`) → an accessible primitives library
for the stack → an animated-component library for showpiece moments → hand-roll. Don't add a
library that needs a build step or Tailwind to a project that has neither. Use the returned
`install` and `import` exactly. If a row says `verify`, open its `docs_url` before installing.
If the search says **no confident match**, hand-roll using the accessible pattern — never invent
a package name. Style third-party components with your tokens. More: `references/components.md`.

### 7. Build — every chapter tells its part in motion

- **Storytelling motion** → `references/storytelling-motion.md`: name each chapter's verb, pick
  the scene and the medium (code-drawn SVG by default; photography, image sequences, Lottie,
  Rive or 3D when the brand has the assets), and build it with the scene engine in
  `assets/motion/story/` (sticky scenes that assemble as you scroll, pinned chapters,
  before/after, route journeys, text highlight, zoom-through). Search recipes:
  `search.py "build assemble scene" --domain motion`.
- Motion foundations, techniques, performance and accessibility → `references/motion.md`;
  snippets in `assets/motion/`.
- Layout, spacing, responsive rules → `references/layout.md`.
- Accessibility floor → `references/accessibility.md`. Copy in the brand's voice →
  `references/copy.md`.
- Stack specifics → `references/stacks/` (`react-next.md`, `html-css.md`, `vue-nuxt.md`,
  `svelte.md`, `tailwind.md`). Read only the one(s) you're using.

Write real content in the founder's voice, not lorem ipsum. Use real images or deliberate
placeholders with fixed aspect ratios.

### 8. Verify — look, critique, fix, repeat

This step is what separates ui-craft from guessing. Follow `references/visual-loop.md`:

1. Lint the code for mechanical problems:
   `python <skill>/scripts/slop_lint.py src/` — fix every `high`.
2. Run the page and capture it:
   `node <skill>/scripts/capture.mjs http://localhost:3000 --full-page --motion`
   (or use a browser/screenshot tool your environment provides).
3. **Open and look at the screenshots.** In the scroll filmstrip, every step of every scene must
   show as a distinct state. Read `report.md` (overflow, console errors, fonts, non-composited
   animations, layout shift, stuck-invisible content).
4. Score the page with the rubric in `references/visual-loop.md` (it includes story, structure
   and motion-sync lines). Fix the three biggest problems, not twenty small ones.
5. Re-capture and compare. Stop when every rubric line is ≥ 4 and the report is clean, or after
   5 rounds — then tell the user what's still imperfect.

If you cannot run a browser, say plainly that visual verification was not done. Never claim
something "looks good" from reading code.

### 9. Remember

Write or update `.ui-craft/design.md` with the story brief, structure, direction, tokens, motion
language, patterns and dated decisions (template: `assets/design.template.md`). Once the user has
accepted the structure, record it for variation across projects:
`python <skill>/scripts/history.py add --brand "<name>" --arc <arc> --sections <ids> …`.

## Anti-patterns to catch yourself on

The full list with IDs, reasons and fixes is `references/anti-patterns.md`. The most common:

- **The default skeleton:** hero → logo strip → three feature cards → how-it-works 1-2-3 →
  testimonial carousel → pricing → FAQ → CTA banner, reskinned per brand.
- **Decoration instead of story:** motion that could sit on any site (fade-up on everything,
  floating blobs) while the brand's actual work is never shown.
- **Channels out of sync:** a weighty construction scene next to springy playful buttons; a
  palette unrelated to the metaphor.
- The default AI look: indigo→purple gradients, glassy cards on a dark blur, emoji icons,
  centered everything, Inter for all text.
- `transition: all`; animating `width`/`top`; no `prefers-reduced-motion`; content hidden until a
  script runs.
- Invented facts in a generated story; placeholder copy ("Welcome to our website").
- Claiming visual quality without having looked.

## Output to the user

When you finish, report briefly: the Story brief (and whether it was inferred, asked or
generated, with any placeholders to fill), the structure (arc, chapters, history result), the
direction line and motion language, what you built, which libraries you installed (and why), the
last rubric scores with the screenshots' paths, and anything you could not verify.
