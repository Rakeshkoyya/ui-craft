# ui-craft — Build Plan

> Status: v0.1 implemented · 2026-09-28 · binding interfaces live in [CONTRACTS.md](CONTRACTS.md)

## Goal

An open-source, agent-agnostic skill (`SKILL.md` standard, per agentskills.io) that makes any coding
agent build website UI that is **distinctive, correct, and consistent** — on any stack — and lets the
agent **find and correctly install real third-party components** instead of hand-rolling them.

Decisions made: name `ui-craft` · MIT · stack-agnostic core + per-stack notes · markdown + small
zero-dependency Python scripts + searchable data (design + components).

## What we learned from the references (see `_research/notes/`)

| Source | Take | Leave |
|---|---|---|
| Anthropic `frontend-design` | Named "AI-default" looks; plan tokens → critique plan → code; "spend boldness in one place" | No checks, no stack notes |
| Vercel `web-design-guidelines` + React rules | Audit mode with `file:line` output; rule IDs ranked by impact with ✗/✓ examples | Runtime fetch of remote rules; React-only |
| Anthropic `skill-creator` / superpowers `writing-skills` | "Use when…" descriptions, near-miss trigger evals, baseline-without-skill testing, explain *why* not ALL-CAPS, regex-checkable → script | — |
| UI/UX Pro Max | Offline CSV knowledge + stdlib BM25 search with **score floors (honest "no match")**, relevance test set, 3 dials, one-source multi-agent packaging | 23 MB bloat, industry→style presets that produce generic output, counts in description |
| taste-skill | Brief inference ("Reading this as: …", ≤1 question), VARIANCE/MOTION/DENSITY dials, prefer real design systems & accessible primitives | 13k-word single file, React lock-in, personal taste stated as law, contradictory presets |
| interface-design | Persisted design memory (`system.md`: direction, tokens, patterns, dated decisions); domain exploration; Swap/Squint/Signature/Token tests; review respects recorded decisions | Product-UI only |
| SuperDesign | Route by situation (existing page / new page in app / new project); cached codebase UI summary; design-system file as hard constraint; never claim visual verification from source | Paid-service dependency, 20k-token instructions |
| ECC | 10-dimension scored audit, polish checklist, motion tokens + single `shouldAnimate()` gate | Stubs, invented CLI flags |

**The gap nobody fills:** taste *and* mechanical checks *and* stack neutrality *and* existing-codebase
awareness *and* a trustworthy component finder, in a token-lean package.

## Architecture

```
website_ui_skill/                 (repo)
├── README.md  LICENSE  CONTRIBUTING.md  CHANGELOG.md
├── .claude-plugin/marketplace.json          # Claude Code plugin install
├── skills/ui-craft/                         # ← the portable skill (copy this folder anywhere)
│   ├── SKILL.md                             # < 300 lines: router + core loop + hard floor
│   ├── references/                          # loaded on demand, one level deep
│   │   ├── modes/{audit,redesign}.md      # build = SKILL.md main workflow
│   │   ├── direction.md        # brief inference, dials, domain exploration, 4 tests
│   │   ├── tokens.md           # OKLCH roles, type/space scales, radius, dark mode
│   │   ├── typography.md  layout.md  motion.md  accessibility.md  copy.md
│   │   ├── anti-patterns.md    # AI-default tells with IDs (UC-xxx), ✗/✓
│   │   ├── components.md       # when to use a library vs hand-roll; how to use search
│   │   ├── design-memory.md    # the .ui-craft/design.md contract
│   │   └── stacks/{html-css,react-next,vue-nuxt,svelte,tailwind}.md
│   ├── data/<domain>/*.csv                 # one folder per search domain; see CONTRACTS.md §1
│   │   ├── libraries/  components/  motion/  palettes/  fonts/
│   ├── scripts/                            # Python 3.9+, stdlib only
│   │   ├── search.py           # BM25 + domain/stack filters + score floor, md/json output
│   │   ├── contrast.py         # WCAG 2.2 contrast for token pairs / whole palettes
│   │   ├── slop_lint.py        # regex pass for mechanical anti-patterns → file:line
│   │   └── capture.mjs         # Playwright screenshots + motion frames + UI report (Node)
│   └── assets/{design.template.md, motion/*}
├── tests/                          # pytest for scripts + search relevance set
└── evals/                          # trigger queries (incl. near-misses) + brief scenarios
```

### Core loop (what SKILL.md tells the agent)

1. **Route** — audit? redesign existing? new page in existing app? new project?
2. **Read context** — `.ui-craft/design.md` if present (treat as law); else scan codebase UI
   (tokens, components, libraries already installed) before inventing anything.
3. **Direction** — infer from brief → one line "Reading this as: …" + dials; ask ≤1 question.
4. **Tokens first** — define roles (color/type/space/radius/motion), run `contrast.py`.
5. **Components** — `search.py "<need>" --stack <x>`; prefer a library already in the project,
   then an accessible primitive library, then hand-roll. Use the returned install/import verbatim,
   and confirm against the linked docs when the row's `verified_at` is old.
6. **Build** — per-stack notes; one bold move; accessibility floor is non-negotiable.
7. **Verify** — `slop_lint.py`, contrast, responsive/keyboard checklist; screenshot if a browser
   tool exists, otherwise say visual QA was not done.
8. **Remember** — offer to write/update `.ui-craft/design.md`.

### Component search (your requested feature)

```
python scripts/search.py "pricing table" --stack react
python scripts/search.py "date picker" --stack vue --json
python scripts/search.py "animated hero background" --domain components
python scripts/search.py "editorial serif" --domain fonts
```

Returns ranked rows: library, component, why it matched, **install command**, **import line**,
docs URL, license, verified date. Below the score floor → "no confident match" (the agent then
hand-rolls on the accessible pattern instead of hallucinating a package).

Seed catalog (to be verified against live docs, not memory):
- React: shadcn/ui, Radix Primitives, Base UI, React Aria, Headless UI, Mantine, HeroUI, Chakra,
  Ark UI, Magic UI, Aceternity UI, Motion Primitives, Tremor (charts), Sonner, Vaul, cmdk
- Vue/Nuxt: shadcn-vue, Reka UI, Nuxt UI, PrimeVue, Ark UI Vue
- Svelte: shadcn-svelte, Bits UI, Melt UI, Skeleton
- Framework-free: Web Awesome/Shoelace, daisyUI, Pico CSS, Open Props, Floating UI

## Phases

| # | Deliverable | Done when |
|---|---|---|
| 1 | Repo scaffold, `SKILL.md`, core references | Validates against spec; < 300 lines; baseline vs with-skill comparison on 3 briefs |
| 2 | `search.py`, `contrast.py`, `slop_lint.py` (TDD) | pytest green, ≥ 80% coverage, relevance set passes |
| 3 | Data: libraries + components catalog (research-verified), palettes, fonts, styles | Every row has source URL + date; spot-check 20 install commands |
| 4 | Evals: 20 trigger queries (10 should / 10 near-miss) + 5 brief scenarios | Trigger precision/recall acceptable; scenario outputs reviewed |
| 5 | Packaging: README, install for Claude Code / Codex / Cursor / `npx skills add`, marketplace.json, CI | Fresh install works in 2+ agents |

## Open questions

- Data-refresh script (checks docs URLs, flags stale rows): **later** (post v1).
- Separate "blocks" domain for whole sections: **no**.

## Added after review (2026-09-27)

- Headline goals: smooth transitions / motion graphics with a professional look, and a
  screenshot → observe → fix loop (`capture.mjs`, `references/visual-loop.md`, `references/motion.md`).

## Status

| # | State |
|---|---|
| 1 | Done: SKILL.md + 18 references + design template |
| 2 | Done: search/contrast/slop_lint (TDD, ~96% cov) + capture.mjs (12 Playwright tests) |
| 3 | Done: 66 libraries, 421 components, 23 motion recipes, 31 palettes, 33 font pairings (verified 2026-09-27) |
| 4 | Partial: search relevance suite; dogfood build (`examples/kiln-and-cloud`). Trigger evals TODO |
| 5 | Partial: README, plugin manifests, CI. Needs GitHub repo + fresh-install test |

## v0.2 — storytelling and motion graphics (2026-09-30)

Driven by user feedback: three generations had different themes but near-identical home page
layouts, and the founder's vision didn't show. Added a Story step (adaptive intake with a
"generate one for me" option), a Structure step (sitemap, 14 story arcs, 55 section archetypes,
banned default skeleton, pacing), a local structure history (`history.py`, advisory), the
storytelling-motion reference, and the `assets/motion/story/` scene engine with a demo gallery.
Next.js became the default stack for new sites.
