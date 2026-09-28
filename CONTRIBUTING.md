# Contributing to ui-craft

Thanks for helping make agent-built websites better.

## Ground rules

- **Portable first.** `skills/ui-craft/` must work when copied into any agent's skills folder.
  Scripts are stdlib-only Python 3.9+, except `capture.mjs` (Node 18+ with Playwright).
- **Contracts are binding.** Data schemas, script CLIs, and lint rule IDs are defined in
  [`docs/CONTRACTS.md`](docs/CONTRACTS.md). Change the contract and every consumer together.
- **Keep SKILL.md lean** (< 300 lines). Depth goes in `references/`, loaded on demand.
- **Write in your own words.** Don't paste text or code from other skills or docs.

## Adding catalog data (components, libraries, motion, palettes, fonts)

1. Add rows to an existing `skills/ui-craft/data/<domain>/*.csv`, or create a new CSV in that
   folder with the same header. New files are picked up automatically.
2. Copy `install` and `import` **exactly** from the library's current official docs, and set
   `verified_at` to the date you checked. Don't add a row you couldn't verify.
3. Use the stack vocabulary: `react next vue nuxt svelte solid angular astro html`.
4. Run the tests (below). Palettes must pass WCAG AA for text, muted and accent pairs.

## Adding a lint rule

Add the rule to the table in `docs/CONTRACTS.md` with the next `UCxxx` id, implement it in
`scripts/slop_lint.py` with one positive and one negative test, and document it (why + ✗/✓)
in `references/anti-patterns.md`.

## Running tests

```bash
python -m pytest tests/python tests/integrity -q    # scripts + data integrity
npm ci && npx playwright install chromium && npm test  # screenshot tool
```

## Commit style

Conventional commits: `feat:`, `fix:`, `docs:`, `data:`, `test:`, `chore:`.
