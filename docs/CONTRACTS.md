# ui-craft — Internal Contracts

Shared interfaces between SKILL.md, references, data, and scripts. Change these deliberately:
every consumer listed below must be updated in the same change.

Skill root: `skills/ui-craft/` (called `<skill>` below). All paths are relative to it.

---

## 1. Data layout

`search.py` treats each **directory under `data/` as a domain** and loads every `*.csv` in it
(UTF-8, comma-separated, RFC 4180 quoting, header row). Contributors add rows or new files;
no code change is needed for a new file within an existing domain.

Common rules:
- Multi-value fields use `|` as separator (`react|vue`).
- `verified_at` is ISO `YYYY-MM-DD` — the date a human/agent checked the row against `docs_url`.
- `id` is kebab-case, unique within the domain.
- Stack vocabulary: `react`, `next`, `vue`, `nuxt`, `svelte`, `solid`, `angular`, `astro`, `html`
  (`html` = framework-free / vanilla JS / web components). A row usable anywhere lists `html`.

### data/libraries/*.csv
| column | meaning |
|---|---|
| id | `shadcn-ui` |
| name | `shadcn/ui` |
| stacks | `react\|next` |
| kind | one of `primitives`, `styled-kit`, `animated-components`, `motion-engine`, `smooth-scroll`, `charts`, `icons`, `css-framework`, `utility` |
| tags | free-text search tags, `\|`-separated |
| description | one sentence: what it is and when to pick it |
| install | exact install/init command(s); multiple joined with ` && ` |
| setup_notes | peer deps / config steps / Tailwind requirement, short |
| license | SPDX id (`MIT`) or `proprietary` / `mixed`; `none` for platform features (`native-html`) |
| docs_url | canonical docs URL |
| verified_at | `2026-09-27` |

### data/components/*.csv
| column | meaning |
|---|---|
| id | `shadcn-ui--dialog` (`<library_id>--<component-slug>`) |
| library_id | FK → libraries.id |
| component | display name, `Dialog` |
| category | one of `navigation`, `hero`, `overlay`, `form`, `data-display`, `feedback`, `layout`, `text-effect`, `background`, `media`, `motion`, `chart`, `commerce`, `marketing` |
| tags | synonyms users search for: `modal\|popup\|lightbox` |
| stacks | usually same as library |
| description | one sentence |
| install | exact command to add THIS component (e.g. `npx shadcn@latest add dialog`) or the library install if not per-component |
| import | exact import line(s) as written in docs |
| usage | minimal one-line usage (JSX/template), may be empty |
| a11y_notes | keyboard/ARIA facts or caveats, may be empty |
| docs_url | component doc page |
| verified_at | ISO date |

### data/motion/*.csv  (motion recipes)
| column | meaning |
|---|---|
| id | `scroll-reveal-stagger` |
| name | `Staggered scroll reveal` |
| technique | one of `css`, `css-scroll-driven`, `view-transitions`, `motion`, `gsap`, `lenis`, `waapi`, `js` (plain requestAnimationFrame / DOM) |
| trigger | `load`, `scroll`, `hover`, `click`, `route`, `state` |
| stacks | where the snippet works as written |
| tags | `reveal\|fade\|entrance` |
| description | one sentence: what it communicates and when to use it |
| duration_ms | typical, e.g. `450` or `300-600` |
| easing | e.g. `cubic-bezier(0.22,1,0.36,1)` / `var(--ease-out)` |
| reduced_motion | what happens under `prefers-reduced-motion: reduce` |
| file | path of the snippet under `assets/motion/` |
| docs_url | API reference used |
| verified_at | ISO date |

### data/palettes/*.csv
`id, name, mood_tags, mode(light|dark), bg, surface, text, muted, border, accent, accent_text, notes`
Colors are hex or `oklch(L C H)`. Every `text`/`bg`, `muted`/`bg`, `accent_text`/`accent` pair must
pass WCAG AA (enforced by a test using `contrast.py`). `accent` on `bg` is not required: an
accent meant only as a fill (buttons, badges) must say so in `notes` so agents don't use it for text/links.

### data/fonts/*.csv
`id, display, body, mono, mood_tags, source(google|fontsource|system|other), css_import, fallback_stack, notes, license`

`fallback_stack` holds one stack per role separated by ` ; ` in the order display ; body [; mono],
e.g. `Georgia, serif ; system-ui, sans-serif`.

### data/sections/*.csv  (section archetypes for story-driven structure)
`id, name, beat, tags, description, layout, motion, pairs_with, avoid_when`
- `beat` is one of `opening`, `origin`, `tension`, `voice`, `method`, `product`, `catalogue`,
  `proof`, `place`, `people`, `transformation`, `invitation`, `utility`.
- `pairs_with` lists motion recipe ids (`data/motion`), `|`-separated, may be empty; a test checks
  every id exists. The story arcs table in `references/structure.md` may only use section ids.

---

## 2. Scripts (Python 3.9+, stdlib only, unless stated)

All scripts: `--help` works, exit 0 on success, 1 on findings/failure, 2 on usage error.
Human-readable Markdown on stdout by default; `--json` for machine output.

### scripts/search.py
```
python scripts/search.py QUERY [--domain auto|components|libraries|motion|palettes|fonts|sections]
                               [--stack STACK] [--limit N=5] [--json] [--min-score F]
```
- BM25 over each row's text fields (weights: component/name ×3, tags ×2, category/kind ×2,
  description ×1). Tokenizer: lowercase, split on non-alphanumerics, light plural stripping.
- Synonyms: each query word also matches the words listed for it in
  `scripts/_search_vocab.py` `SYNONYMS` (one-way, e.g. handmade → crafted|artisan|handcrafted,
  modal → dialog, dropdown → menu|select); a synonym hit scores ×0.7 of a literal hit.
- Matching mode: components, libraries and motion are **strict** (a row must match more than
  half of the query's specific words). Palettes, fonts and sections are **partial** (taste and
  brief vocabulary: any matching word qualifies). Both multiply the score by coverage (matched words / query words),
  and the `--min-score` floor applies to both. Auto-mode fallback to other domains is strict.
- `--stack` keeps rows whose `stacks` contains STACK, or `html` (framework-free works anywhere);
  `next` also matches `react`, `nuxt` also matches `vue`.
- `auto` domain: keyword routing (e.g. font/typeface/serif → fonts; palette/color → palettes;
  library/kit → libraries; section/chapter/homepage/sitemap/archetype/beat → sections;
  animation/scroll/transition/parallax/reveal/scrollytelling → motion; else components),
  and components results also append the top library matches.
- Score floor: results below `--min-score` (default tuned by relevance tests) are dropped. With no
  result, print `No confident match for "<query>"` and exit 1 — never pad with weak results.
- Output per row: every column, plus `score`, `matched` (`k/n` query words), plus for components
  the parent library's `install` and `license`. Markdown marks rows with k < n as
  `partial match (k/n words)`. Results are ranked by score only; `native-html` rows are not
  boosted (the preference order lives in `references/components.md` §3). Rows with `verified_at` older than 180 days get a `(verify: last checked …)` note.

### scripts/contrast.py
```
python scripts/contrast.py FG BG [--large | --non-text]         # one pair
python scripts/contrast.py --css FILE [--pairs a:b,c:d:3] [--non-text]
python scripts/contrast.py --palettes                            # every row in data/palettes
```
Accepts `#rgb`, `#rrggbb`, `#rrggbbaa` (composited on BG), `rgb()/rgba()`, `hsl()`, `oklch()`.
Prints ratio (2 decimals), the threshold the row was held to (`needs`, JSON `threshold`), and
AA / AA-large / AAA pass/fail. A row passes when ratio ≥ threshold:
- default 4.5 (text AA); `--large` → 3; `--non-text` → 3 (WCAG 1.4.11 UI components/graphics);
- `--pairs fg:bg:N` sets N for that pair (1 < N ≤ 21) and overrides the flags.

`--css` auto-pairing (role heuristics in `scripts/_contrast_roles.py`):
- `X-foreground` / `X-text` / `X-fg` on `X`;
- text-like roles (`text`, `fg`, `foreground`, `muted`, `subtle`, `secondary`, `accent`, `link`;
  not `soft|tint|fill|wash`) on background-like roles (`bg`, `background`, `surface`);
- UI roles (`focus`, `ring`, `border-strong`, `input-border`, `control-border`) on
  background-like roles at 3:1;
- a name containing `inverse`, `inverted` or `dark` pairs only with another such name (no
  light-theme text on dark-theme backgrounds). Anything else: pass `--pairs`.

### scripts/slop_lint.py
```
python scripts/slop_lint.py PATH... [--json] [--ignore UC001,UC002] [--severity high]
```
Scans `.html .htm .css .scss .js .jsx .ts .tsx .vue .svelte .astro` (skips node_modules, dist,
build, .next, .git). Output `path:line: UCxxx [severity] message`. Rule IDs below are shared with
`references/anti-patterns.md`, which explains each one with ✗/✓ examples.
Inline suppression: a comment containing `ui-craft-ignore UCxxx` on the same or previous line.

| ID | sev | detects |
|---|---|---|
| UC001 | high | `transition: all` / `transition-all` |
| UC002 | high | animations/transitions of layout props (`width`, `height`, `top`, `left`, `margin`, `padding`) |
| UC003 | high | file animates (keyframes/transition/animate) but project has no `prefers-reduced-motion` handling (reported once per run) |
| UC004 | high | `outline: none`/`outline-none` without a `:focus-visible` / `focus-visible:` style in same file |
| UC005 | med | default AI gradient: indigo/violet/purple pairs (`#6366f1`, `#8b5cf6`, `#a855f7`, `from-indigo-500`, `to-purple-500`, …) |
| UC006 | med | `100vh` / `h-screen` for full-height sections (prefer `100dvh`/`svh`) |
| UC007 | med | `z-index` ≥ 999 |
| UC008 | high | `<img` without `alt` |
| UC009 | med | placeholder copy: lorem ipsum, "Welcome to our website", "Your Company", "John Doe" |
| UC010 | low | emoji used as icons in headings/buttons/list markers |
| UC011 | med | `ease-in` / `linear` on UI entrance transitions (use ease-out family) |
| UC012 | med | durations > 1000 ms on UI transitions (not loops/marquees) |
| UC013 | med | `font-family` stack whose first family is Inter/Roboto/Arial/system-ui for display/headings (report once) |
| UC014 | low | pure `#000` text on `#fff` background or vice-versa |
| UC015 | med | clickable `<div`/`<span` with onClick/@click and no role/tabindex |
| UC016 | low | `!important` more than 5 times in a file |
| UC017 | med | scroll event listeners without `passive: true` |
| UC018 | high | `user-scalable=no` or `maximum-scale=1` in viewport meta |

### scripts/history.py
```
python scripts/history.py show [--limit 10] [--json]
python scripts/history.py add --sections a,b,c [--brand B] [--arc A] [--signature S]
                              [--palette P] [--language L] [--stack X]
python scripts/history.py check --sections a,b,c [--arc A] [--signature S] [--palette P]
                                [--language L] [--limit 10] [--json]
```
- File: `$UI_CRAFT_HISTORY` or `~/.ui-craft/history.json` →
  `{"version": 1, "entries": [{"date": "YYYY-MM-DD", "brand", "arc", "sections": [...],
  "signature", "palette", "language", "stack"}]}`; capped at the newest 50. Values other than
  `brand` are slugged; `sections` are archetype ids in page order.
- Similarity 0..1: sections 0.5 (half `SequenceMatcher` ratio, half set overlap), arc 0.15,
  signature 0.15, palette 0.1, language 0.1; fields missing on either side are dropped and the
  weights renormalised. `check` flags ≥ 0.7 and lists sections used by ≥ half of recent entries.
- Exit: 0 ok/distinct, 1 `check` found a similar entry (advice, not a veto), 2 usage error
  (including an unreadable history file).

### scripts/capture.mjs  (Node 18+, requires `playwright`)
```
node scripts/capture.mjs URL [--out DIR] [--viewports 390x844,768x1024,1440x900]
                             [--full-page] [--motion] [--reduced-motion] [--dark] [--wait MS]
                             [--focus-walk N] [--click SELECTOR]... [--no-serve]
```
- Helpers live in `scripts/capture/*.mjs` (probes, steps, report, serve); no deps beyond Playwright.
- Resolves `playwright` from the project; if missing, prints the exact install commands and exits 2.
- Local input (file path or `file://` URL) is served by a built-in static server on
  `127.0.0.1:<random port>` and opened at its path relative to the serve root: the nearest
  ancestor with `package.json` or `.git`, else the cwd if it contains the file, else the file's
  folder (so `../` assets resolve). MIME types for html/css/js/mjs/json/svg/png/jpg/webp/avif/
  woff2/ico and a few more; `..` traversal and dot-files refused (403); 404 otherwise; closed at
  the end. `--no-serve` keeps raw `file://`. `report.json` has `url` (what was opened) and
  `source` (what was given).
- `--out` default: `<folder of the local file>/.ui-craft/shots` for local input, else
  `./.ui-craft/shots`. Writes `<out>/<run-id>/` (run-id is UTC).
- Every run: `<viewport>.png` at load, then a scroll-through (top→bottom in ~0.9-viewport steps,
  350 ms each, max 30 steps, back to top + settle) before the hidden-content probe.
- `--full-page`: scroll-linked animations are moved to their end state, then `<vp>-full.png` plus
  slices `<vp>-full-01.png`… (~1.5 viewport heights each, clip screenshots, max 12).
- `--motion`: `motion-<vp>-t<ms>.png` frames at 0/150/300/600/1000 ms after load plus a scroll
  filmstrip `scroll-<vp>-<n>.png` at each viewport-height step.
- First viewport only: `--focus-walk N` presses Tab N times → `focus-<n>.png` (focused element
  + 12 px) and compares outline/box-shadow/border/background/colour/text-decoration/transform/
  filter and `::before`/`::after` styles focused vs. blurred; `--click SELECTOR` (repeatable)
  clicks in order (5 s timeout each) → `after-click.png`.
- Writes `report.json` + `report.md`. report.md order: summary table (findings per viewport),
  details (errors, layout, hidden content, fonts, CLS, grouped animation table, focus walk,
  clicks), then files grouped by viewport — each image path once, relative to the run dir.
- Prints the viewport shots and slices to open, and the report path.
- Exit codes: 0 = captured, report clean · 1 = captured with findings (screenshots still exist)
  or capture failed (e.g. server unreachable) · 2 = usage error or Playwright missing.
- Findings: CLS > 0.1, console/page errors, failed requests (4xx/5xx or network), horizontal
  overflow, missing `alt` (empty `alt=""` is valid), targets < 24×24 (inline text links exempt),
  any non-composited animation, running animations under `--reduced-motion`, **hidden content**
  (text/media never visible while in view during the scroll-through: effective opacity < 0.05,
  `visibility: hidden`, or transformed off-canvas; excludes `display:none`, `aria-hidden`,
  `inert`, `[hidden]`, closed `<dialog>`/`<details>`, fixed/absolute overlays, collapsed
  panels and clipped carousels; grouped by the element doing the hiding), **no visible focus**
  (per element, `--focus-walk`), **click failed** (`--click`).

---

## 3. Project files the skill writes into the user's repo

- `.ui-craft/design.md` — design memory (template: `assets/design.template.md`).
- `.ui-craft/shots/` — capture output (recommend adding to `.gitignore`).
- `~/.ui-craft/history.json` — outside the project: structure fingerprints across projects
  (`history.py`), written only with `add`.

---

## 4. Story scene engine (`assets/motion/story/`)

Framework-agnostic ES modules; GSAP (and plugins) are injected through options, never imported at
module top level. Every init returns a cleanup function; authored markup is the finished state.
Motion language names (`weighty precise organic airy playful cinematic mechanical`) are shared by
`languages.js`, `references/story.md` §7 and `references/storytelling-motion.md`. Scene verbs
(`data-enter`) are listed in `references/storytelling-motion.md` §5 and implemented in `scene.js`;
change both together.
