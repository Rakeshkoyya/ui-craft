# Mode: redesign / polish an existing page

Use when the user wants an existing page or site improved ("make this look better", "polish
the landing page", "modernize the site"). The risk in a redesign isn't that it looks worse; it's
that it throws away what was working — content, URLs, brand recognition, SEO, muscle memory —
for changes nobody asked for.

## 1. Capture the before

Before touching anything:

```
node <skill>/scripts/capture.mjs <url> --full-page --motion --out .ui-craft/shots/before
```

Open the images and keep the run folder; you'll compare against it at the end. Run
`slop_lint.py` and `contrast.py` too, so you know which problems are mechanical. If no browser
is available, say so and work from code, and tell the user the before/after comparison wasn't
possible.

Read `.ui-craft/design.md` if it exists; its decisions stand unless the user asks to change them.

## 2. Decide the depth

Ask (or infer from the request) which of these the user wants:

| Depth | Changes | Keeps |
|---|---|---|
| **Polish** | Spacing, type scale, contrast, states, motion quality, alignment, copy tightening | Layout, palette, fonts, structure |
| **Refresh** | Plus new tokens (palette tune, new type pairing), component restyle, section layouts | Content, information architecture, brand marks, URLs |
| **Overhaul** | Plus new direction and structure | Content meaning, URLs, brand equity items the user names |

Default to **polish** when the request is vague ("make it look better"). State the chosen depth
in your "Reading this as:" line.

## 3. Inventory what works

Write a short list before planning changes (it goes in your report):

- **Brand equity**: logo, brand colors people recognize, a distinctive illustration style,
  photography, a known tagline. Keep these unless told otherwise.
- **Content and IA**: page sections, their order when it reflects a real journey, navigation
  labels, headings people search for.
- **Things that never change silently**: URLs and routes, nav labels, form field names and
  order, analytics IDs and event names, legal and compliance copy, SEO titles and meta,
  structured data, `alt` text that's already good.
- **What's already good**: note specific strengths (clear pricing, good photography, fast
  load). A redesign that removes strengths is a regression.

## 4. Diagnose, then change on purpose

- Score the before screenshots with the rubric in [visual-loop.md](../visual-loop.md) and list
  findings as in [modes/audit.md](audit.md). The low-scoring dimensions are the plan.
- For each change, be able to say which finding it fixes. "Modernized the look" isn't a reason.
- Fix order that gives the most improvement per change (stop when the page reaches the goal):
  1. Floor failures: contrast, focus, overflow, broken states, layout shift.
  2. Typography: font choice, scale, measure, line height. Usually the biggest visual lift.
  3. Color: tokenize, one accent, tinted neutrals, a designed dark mode.
  4. Spacing and rhythm: one scale, grouping, section variety.
  5. Component consistency: radii, shadows, buttons, icons, all states.
  6. Motion: remove motion that doesn't communicate, add feedback and one orchestrated moment
     ([motion.md](../motion.md)).
  7. Layout and signature: only at refresh/overhaul depth.
- Extend the existing system instead of forking it: if there's a tokens file or Tailwind theme,
  change values there. Don't add a parallel set of variables.
- Keep diffs reviewable: tokens first, then components, then pages.

## 5. Compare before and after

```
node <skill>/scripts/capture.mjs <url> --full-page --motion --out .ui-craft/shots/after
```

- Open the before and after image for each viewport one after the other and describe what
  changed. Check that nothing from the "keep" inventory went missing (sections, links, form
  fields, images).
- Re-score with the rubric. Every dimension should be equal or better; explain any that dropped.
- Continue the visual loop until the stop rule in [visual-loop.md](../visual-loop.md) is met.

## 6. Report

- Depth chosen and the direction line.
- What was kept and why (the inventory).
- Changes grouped by the finding they fix, with before → after rubric scores.
- Screenshot paths for before and after.
- Anything the user must confirm (a changed tagline, a new font license, a nav label you think
  should change but didn't).
- Offer to record the new decisions in `.ui-craft/design.md` ([design-memory.md](../design-memory.md)).
