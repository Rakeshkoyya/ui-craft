---
name: ui-craft
description: Use when building, redesigning, polishing, or reviewing a website or web UI - landing pages, marketing and product sites, portfolios, dashboards, components - on any stack. Especially use when the result must look professional and distinctive rather than templated, needs smooth motion (page transitions, scroll-driven animation, micro-interactions), should reuse third-party component libraries, or should be checked visually by taking screenshots and iterating until it looks right.
license: MIT
metadata:
  version: 0.1.0
---

# ui-craft

Build web interfaces that look intentional, move smoothly, and are verified with your own eyes
(screenshots), not assumed from source code.

`<skill>` below means the directory containing this file. Run scripts with that path, e.g.
`python <skill>/scripts/search.py "pricing table" --stack react`.

## The standard

A ui-craft result has all of these:

1. **A point of view.** Someone could describe the design in one sentence that wouldn't fit a
   different product. Boldness is spent in one or two places; everything else is quiet.
2. **A system.** Every color, size, space, radius, shadow, duration and easing comes from tokens.
3. **Motion that communicates.** Each animation explains a change (where something came from,
   what is now in focus, that an action worked). If you can't say what it communicates, cut it.
   Only `transform`, `opacity`, `filter`, and `clip-path` are animated. Reduced motion is honored.
4. **A floor that never breaks.** WCAG AA contrast, visible focus, keyboard reachable, real alt
   text, no horizontal scroll at 390 px, tap targets ≥ 24 px, no layout shift from late assets.
5. **Evidence.** It was captured at mobile and desktop widths, looked at, critiqued, and fixed.

## Route first

Decide which situation you're in — it changes everything after:

| Situation | Do |
|---|---|
| **Audit / review** ("what's wrong with…", "review this UI") | Follow `references/modes/audit.md`. Don't redesign unasked. |
| **Redesign / polish an existing page** | Follow `references/modes/redesign.md`: capture before, keep what works, change on purpose. |
| **New page in an existing app** | Read the app's existing UI first (step 1). Match it; extend its system, don't fork it. |
| **New site / project** | Full workflow below. |
| **Small tweak** (one button, one color) | Skip to steps 5–7 at the scale of the change. Don't run the whole process. |

## Workflow

Load references when you reach the step that needs them, not all up front. Read only the sections you
need: most files open with a short summary. For a one-page site the usual set is `direction.md`,
`tokens.md`, `motion.md`, and `visual-loop.md`, plus one stack file.

### 1. Read context before inventing anything

- If `.ui-craft/design.md` exists, read it first. Its decisions are settled; follow them and don't
  "fix" them in reviews. (Contract: `references/design-memory.md`.)
- Otherwise scan the project: framework, styling approach (Tailwind? CSS modules?), existing
  tokens/theme files, component libraries already in `package.json`, fonts in use, one or two
  representative pages. Existing choices beat new ones.

### 2. Set direction

Read the brief for audience, purpose, tone, content density, and any brand assets. Then write
one line and show it to the user:

> **Reading this as:** a precise, editorial site for an independent architecture studio —
> quiet grid, one oversized serif moment, slow confident motion. Dials: variance 6 · motion 5 · density 3.

Ask at most **one** question, only if the answer changes the direction. Details: dials, domain
exploration, and how to avoid the AI-default look → `references/direction.md`.

### 3. Tokens first, then critique them

Define color roles, type scale, spacing scale, radius, shadows, and motion tokens (durations +
easings) before writing components → `references/tokens.md`, `references/typography.md`.
Check contrast of every text/background pair:

```
python <skill>/scripts/contrast.py "#6b6b6b" "#fafaf7"
python <skill>/scripts/contrast.py --css src/styles/tokens.css
```

Then critique the plan against the brief: would it look the same for a different product? If
yes, change the signature element, not everything.

Need starting points? `search.py "warm editorial" --domain palettes` / `--domain fonts`: use one to
three mood words from the brief. Treat results as raw material, not presets.

### 4. Find components before hand-rolling

For anything interactive or complex (dialog, menu, combobox, date picker, carousel, tabs,
toast, command palette, data table, animated text/background), search the catalog:

```
python <skill>/scripts/search.py "date picker" --stack vue
python <skill>/scripts/search.py "animated hero background" --stack react
python <skill>/scripts/search.py "headless ui library" --domain libraries --stack svelte
```

Preference order: a library **already in the project** → a **native element** when it does the
job (`<dialog>`, `popover`, `<details>`, `<input type="date">`) → an accessible primitives library
for the stack → an animated-component library for showpiece moments → hand-roll. Don't add a
library that needs a build step or Tailwind to a project that has neither. Use the returned
`install` and `import` exactly. If a row says `verify`, open its `docs_url` before installing.
If the search says **no confident match**, hand-roll using the accessible pattern — never invent
a package name. Style third-party components with your tokens so they look like one system.
More: `references/components.md`.

### 5. Build

- Layout, spacing, responsive rules → `references/layout.md`.
- Motion — the heart of a polished site → `references/motion.md`. Search recipes with
  `search.py "<effect>" --domain motion`; snippets live in `assets/motion/`.
- Accessibility floor → `references/accessibility.md`. Copy (headlines, CTAs, empty states,
  errors) → `references/copy.md`.
- Stack specifics → `references/stacks/` (`html-css.md`, `react-next.md`, `vue-nuxt.md`,
  `svelte.md`, `tailwind.md`). Read only the one(s) you're using.

Write real content, not lorem ipsum. Use real images or deliberate placeholders with fixed
aspect ratios.

### 6. Verify — look, critique, fix, repeat

This step is what separates ui-craft from guessing. Follow `references/visual-loop.md`:

1. Lint the code for mechanical problems:
   `python <skill>/scripts/slop_lint.py src/` — fix every `high`.
2. Run the page and capture it:
   `node <skill>/scripts/capture.mjs http://localhost:3000 --full-page --motion`
   (or use a browser/screenshot tool your environment provides).
3. **Open and look at the screenshots.** Read `report.md` (overflow, console errors, fonts that
   actually rendered, non-composited animations, layout shift).
4. Score the page with the rubric in `references/visual-loop.md`. Fix the three biggest
   problems, not twenty small ones.
5. Re-capture and compare. Stop when every rubric line is ≥ 4 and the report is clean, or after
   5 rounds — then tell the user what's still imperfect.

If you cannot run a browser, say plainly that visual verification was not done. Never claim
something "looks good" from reading code.

### 7. Remember

Offer to write or update `.ui-craft/design.md` with the direction, tokens, patterns, and dated
decisions (template: `assets/design.template.md`), so the next session stays consistent.

## Anti-patterns to catch yourself on

The full list with IDs, reasons and fixes is `references/anti-patterns.md`. The most common:

- The default AI look: indigo→purple gradients, glassy cards on a dark blur, three identical
  feature cards with emoji icons, centered everything, Inter for all text.
- Motion everywhere at the same speed; `transition: all`; animating `width`/`top`; fade-up on
  every element; no `prefers-reduced-motion`.
- Decorative sameness: every section a rounded card with the same shadow and padding.
- Placeholder copy ("Welcome to our website", "Unlock the power of…").
- Claiming visual quality without having looked.

## Output to the user

When you finish, report briefly: the direction line, what you built or changed, which libraries
you installed (and why), the last rubric scores with the screenshots' paths, and anything you
could not verify.
