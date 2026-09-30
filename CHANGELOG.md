# Changelog

## 0.2.0 — 2026-09-30

Storytelling and motion graphics become the centre of the skill.

- **Story step** (`references/story.md`): adaptive intake (infer, ask for gaps, or interview) with a
  "No story yet — generate one for me" option on every question; generated stories never invent
  facts. Output: a Story brief with a central metaphor and a motion language that drive layout,
  palette, type and motion together.
- **Structure step** (`references/structure.md`): sitemap from visitor jobs plus story needs; 14
  story arcs; the default hero → features → testimonials → CTA skeleton is banned; pacing curve;
  interior pages get their own arcs.
- **Section catalogue**: new `sections` search domain (`data/sections/archetypes.csv`, 55
  archetypes by story beat, each paired with motion recipes).
- **History** (`scripts/history.py`): local structure fingerprints in `~/.ui-craft/history.json`
  so new sites vary from recent ones; advisory, never a veto.
- **Storytelling motion** (`references/storytelling-motion.md`): content verb → scene → medium
  (SVG, photo, image sequence, video, Lottie, Rive, 3D), sync rules, budgets.
- **Scene engine** (`assets/motion/story/`): seven motion-language presets, declarative SVG scene
  verbs, sticky scrollytelling (scrub or play), pinned chapters, before/after, text highlight,
  zoom-through, image sequence, path journey, Lottie/Rive/video adapters, React/Next wrappers
  (GSAP and Motion). Demo: `examples/story-scenes/`.
- **Next.js by default** for new sites (`references/stacks/react-next.md` "New site scaffold").
- Rubric gains Story, Structure and Motion sync lines; anti-patterns UC-J21–J24; design memory
  gains Story and Structure sections.

## 0.1.0 — 2026-09-29

- `SKILL.md` workflow: route → context → direction → tokens → components → build → visual loop → memory.
- References: direction, tokens, typography, layout, motion, accessibility, copy, anti-patterns,
  components, design memory, visual loop, audit/redesign modes, and stack notes (HTML/CSS,
  React/Next, Vue/Nuxt, Svelte, Tailwind).
- Scripts: `search.py` (BM25 with honest no-match), `contrast.py` (WCAG, `var()` chains,
  `light-dark()`), `slop_lint.py` (UC001–UC018), `capture.mjs` (Playwright screenshots, motion
  frames, UI health report).
- Catalog: 67 libraries (incl. native HTML), 432 components, 30 motion recipes, 31 palettes,
  33 font pairings, all checked against official docs on 2026-09-27/28.
- Visual loop: scroll-through before full-page shots, hidden-content detection, readable slices,
  local files auto-served over HTTP, `--focus-walk` and `--click`, 11-line rubric with evidence check.
- Search: synonyms, partial matching for palettes/fonts, majority rule for components, honest no-match.
- Dogfooded on `examples/kiln-and-cloud` (built by an agent using only this skill).
