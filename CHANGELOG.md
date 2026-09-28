# Changelog

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
