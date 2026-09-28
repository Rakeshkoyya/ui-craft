# ui-craft — evaluation from building Kiln & Cloud

Built with the full workflow: SKILL.md → direction → tokens + contrast.py → search.py (palettes, fonts,
motion, components) → build → slop_lint.py → 4 rounds of `capture.mjs --full-page --motion` plus
2 `--reduced-motion` runs → design.md. Environment: Windows 11, Git Bash, Python 3, Node, Playwright
installed at the repo root. Static site opened as a file path, no server.

Result: the stop rule was met in round 4 (every rubric line ≥ 4, report clean). The page does look
designed rather than templated, and the motion reads as calm and ordered. But two of the four rounds
were spent on problems the skill itself caused or couldn't see (items 1 and 2 below).

---

## Friction points, worst first

### 1. Full-page screenshots are blank below the fold on any page with scroll reveals, and the report still says "clean" — `scripts/capture.mjs`, `references/visual-loop.md`
- `captureViewport()` takes `fullPage: true` right after load, before any scrolling. Everything using the
  skill's own `reveal-on-scroll` pattern (IO or `animation-timeline: view()`) is still at `opacity: 0`.
  Round 2: `1440x900-full.png` was empty from the collection to the footer, and the report said
  **"Report clean."**
- I switched to the skill's recommended `view()` path, expecting Playwright's full-page mode to grow the
  viewport. It doesn't. Still blank (round 3).
- Workaround I used: the `--reduced-motion` full-page shot for layout, the filmstrip for motion.
- **Fix:** in `capture.mjs`, before the full-page shot, scroll through the page in viewport steps (the
  filmstrip loop already exists), wait `SCROLL_SETTLE_MS`, scroll back to the top, then shoot. Also add a
  probe that flags large visible-area elements with computed `opacity < 0.05` after the scroll ("content
  stuck invisible: section#collection …") so the report can't call a blank page clean. In
  `visual-loop.md` §4, warn that `-full.png` needs the scroll pass, or use the `--reduced-motion`
  full-page shot as the layout evidence.

### 2. "Static HTML: pass the file path directly — no server needed" is wrong for ES modules — `references/visual-loop.md` §2, `references/stacks/html-css.md`
- `<script type="module">` is blocked by CORS on `file://`, so all JS silently didn't run in round 1: menu,
  dialog, reveals. The report did catch it as a console error, which is good.
- The skill steers you into modules: `reveal-on-scroll.js` and the other snippets are written as
  `export function …`, and `html-css.md` only says fonts and View Transitions need a server.
- **Fix:** in `visual-loop.md` §2, say "file path works for classic scripts only; with `type=module` or
  `import`, run `npx serve .`". Or have `capture.mjs` start a tiny static server itself when it's given a
  path (Node `http` plus `fs`, about 20 lines). That's the better fix: it also makes fonts and View
  Transitions work.

### 3. Scroll-driven reveal snippet contradicts "Reveal once" — `assets/motion/reveal-on-scroll.css`, `references/motion.md` §3/§4/§5
- motion.md §3 says "Scroll entrances play the first time only".
- But the default path in §4 and in `reveal-on-scroll.css` is `animation-timeline: view()`. That reverses
  when you scroll up and replays on every pass. It also can't be seen in full-page captures (item 1).
- **Fix:** either make IO-once the default for entrances and keep `view()` for scrubbed effects
  (parallax, progress, chart drawing), or state the trade-off in both files.

### 4. search.py returns "No confident match" for natural brief language — `scripts/search.py` (`_majority`), `data/*`
Queries built from the brief's own words failed completely:

| Query | Result | Note |
|---|---|---|
| `"warm crafted ceramics clay calm" --domain palettes` | no match | `crafted` and `calm` exist in tags |
| `"calm modern crafted" --domain palettes` | no match | same query minus two words; `calm` alone → 4 rows, `crafted` alone → kraft-navy |
| `"calm crafted" --domain fonts` | no match | |
| `"handmade" --domain fonts` | no match | |
| `"serif humanist" --domain fonts` | no match | |
| `"scroll progress line draw" --domain motion` | no match | |
| `"svg path draw on scroll" --domain motion` | no match | |
| `"testimonial quotes" --stack html` | no match | |

- Cause: `_majority` demands that more than half of the query's specific words match. Any vocabulary the
  CSV lacks ("ceramics", "modern", "handmade") sinks the whole query.
- **Fix:**
  - Fall back to the best partial matches, labelled "partial match (2/5 words)", instead of printing
    nothing.
  - Add a small synonym map (handmade ↔ crafted/artisan, ceramics/pottery ↔ crafted/earthy,
    modern ↔ contemporary/minimal).
  - Add `mood_tags` to fonts (`data/fonts/pairings.csv`).
  - SKILL.md should advise "search with 1–2 mood words" until this is fixed.

### 5. Missing motion recipe: drawing an SVG line or chart on scroll — `data/motion/recipes.csv`, `assets/motion/`
- A "line draws as you scroll" effect is one of the most common requests for "motion graphics" sites.
  There's no recipe for it.
- The classic technique (`stroke-dashoffset`) is non-composited, so under the skill's own rules the agent
  has to invent a `clip-path: inset()` version. I did that for the kiln curve.
- **Fix:** add `svg-draw-on-scroll.css`, a clip-path wipe driven by `view()` with an IO fallback, plus a
  row tagged `line draw|path|chart|stroke|svg`.

### 6. Report formatting and noise — `scripts/capture.mjs`
- Scroll-timeline animations show durations like `0.838135%ms` and `33.2461%ms`. These are percentages
  printed with an `ms` suffix. Print "scroll-linked (range …)" instead.
- The CLI printed "Findings: 6" for what the report shows as 3 distinct problems ×2 lines. The count isn't
  explained anywhere.
- `report.md` lists every PNG path twice: in the summary and again under each viewport (about 55 absolute
  paths per run, ~5k tokens to read). Keep one list, or just give the directory.
- The run-id is UTC (`2026-09-27_18-36…`) while local time was already the 28th. Say it's UTC or use
  local time.
- The animation table lists `figure.hero-art` as `kc-rise` when I meant `kc-media`. That's correct: it
  revealed my specificity bug. It would be easier to spot if the report marked "animation name differs
  from data-hero role".

### 7. Full-page PNGs are too tall to see — `references/visual-loop.md` §4, `scripts/capture.mjs`
- Shown in my image viewer, `390x844-full.png` (390×10468) comes out 75 px wide and the 1440 one 359 px
  wide. Neither is readable.
- visual-loop.md tells you to look at `-full.png` "section by section", but gives no means to do it.
- I sliced the images myself with PIL.
- **Fix:** add a `--slices` option (or do it by default) that writes `…-full-0.png`, `-1.png`, … at
  ~1.5–2× viewport height, and point to those in the report.

### 8. Contrast checker pairing is noisy and has no non-text mode — `scripts/contrast.py`
- `--css` auto-pairing produced 4 nonsense FAILs (`--color-inverse-text on --color-bg`,
  `--color-text on --color-inverse-bg`, …). It paired roles meant for opposite themes.
- It did not auto-pair `--color-muted`, `--color-accent` or border roles, even though tokens.md names them
  as required pairs. I had to pass 16 pairs by hand.
- `--color-border-strong` (3.29:1, input outline) shows as **FAIL** because the pass threshold is text
  4.5:1. `--large` applies to the whole run, not per pair.
- **Fix:**
  - Pair by name family: `inverse-*` only with `inverse-*`.
  - Always check the tokens.md table pairs (muted/bg, muted/surface, accent/bg, border/bg at 3:1).
  - Allow a per-pair threshold, e.g. `--pairs "color-border-strong:color-bg@3"`.

### 9. slop_lint false positives on scroll-linked `linear` — `scripts/slop_lint.py` UC011
- `animation: x linear both; animation-timeline: view()/scroll()` gets flagged UC011 ("ease-in/linear on a
  UI transition"). `linear` is the correct easing for scroll-linked progress.
- The skill's own `parallax.css` carries `ui-craft-ignore UC011` to hide this.
- **Fix:** skip UC011 when the same rule block sets `animation-timeline`.
- Also missing: a rule for `type="module"` script tags combined with file-path capture (item 2), and one
  for per-part `animation-delay` that gets reset by a higher-specificity `animation` shorthand.
  Adapting `hero-load-sequence.css` made that very easy to do wrong; I did it.

### 10. The brief conflicts with honesty rules, and the skill doesn't say how to resolve it — `references/copy.md` §1, `references/anti-patterns.md` UC-J08
- The client asked for press quotes. copy.md says "Don't invent facts… write clearly marked placeholders
  (`[Customer quote — needs approval]`)". The task said "write real copy, no lorem ipsum".
- A visibly bracketed placeholder on a showcase page looks broken, but invented quotes are "fake social
  proof".
- I chose realistic sample quotes, marked with an HTML comment plus `data-placeholder`, and listed them in
  design.md and here.
- **Fix:** copy.md should give this exact middle path for demos and mockups: realistic sample copy, marked
  in the source and listed in the hand-off, never presented as verified.

### 11. The skill's examples are about pottery, so it leaks into pottery briefs — `references/direction.md` §2, `references/copy.md` §1, `references/design-memory.md` example
- The direction example is "a booking site for a small ceramics school… clay-texture band that carries
  the class calendar".
- copy.md uses "Book a 2-hour wheel class, Saturdays in Leeds". The design-memory example is "Kiln & Co.
  pottery school".
- For this brief it handed me a near-ready direction. I had to work to avoid copying it. For an eval it
  also inflates results.
- **Fix:** keep examples away from the most likely test briefs, or rotate them across unrelated domains.

### 12. Warm/crafted guidance points straight at a listed AI-default — `references/direction.md` §6/§7
- The "Warm / crafted" archetype recommends "a friendly serif… earthy or produce-derived colors".
- §6 lists "Cream + serif + terracotta" as the AI default. For a ceramics studio that combination is the
  literal subject (terracotta is clay).
- The skill gives no guidance on what to do when the default is also the domain's honest color world.
- **Fix:** add a sentence to §6, e.g. "if the domain's color world is the default, keep one element of it
  and move the other two (here: keep clay as texture, move the page off cream and the accent off
  terracotta)". That's what I did (porcelain neutrals + cobalt).

### 13. Component preference order doesn't mention native HTML — `SKILL.md` step 4, `references/components.md`
- `search.py "dialog" --stack html` returned Web Awesome, Pico CSS and **daisyUI**. daisyUI is a Tailwind
  plugin that needs a build step, which is wrong for a no-build HTML site.
- The preference order ("library already in the project → accessible primitives library → animated
  library → hand-roll") never says "native `<dialog>` / `popover` / `<details>` first".
- For plain HTML, the native element beats every row returned.
- **Fix:** add "platform element (dialog, popover, details, input type=date)" as step 0 for all stacks.
  Filter out Tailwind-only rows when `--stack html` has no Tailwind.

### 14. Output location is ambiguous — `references/visual-loop.md` §3/§8, `SKILL.md` step 7
- `capture.mjs` defaults `--out` to `.ui-craft/shots` relative to **cwd**, which is the repo root.
- You must run it from the root for Playwright to resolve, so shots land outside the project unless you
  pass `--out`.
- **Fix:** default `--out` to `<dir of the file>/.ui-craft/shots` when a file path is given. Say so in
  visual-loop.md.

### 15. No interactive-state capture — `scripts/capture.mjs`
- visual-loop.md admits "Hover, focus and click states are not in these captures". The booking dialog and
  mobile menu, the two interactive pieces of this site, would have gone unverified.
- I wrote a 20-line Playwright script in my scratchpad to open the menu and submit the empty dialog.
- **Fix:** add `--click "<selector>"` (repeatable) and `--focus-walk N` (press Tab N times and screenshot)
  to `capture.mjs`.

### 16. Token and context cost

| Loaded | Size (chars) |
|---|---|
| SKILL.md | 7k |
| direction.md | 13k |
| tokens.md | 14.7k |
| typography.md | 9.7k |
| motion.md | 23k |
| layout.md | 9.8k |
| visual-loop.md | 12k |
| stacks/html-css.md | 4.4k |
| accessibility.md + copy.md (partial) | ~5k |
| 5 motion assets | ~13k |
| **Total** | **~112k chars (~28k tokens)** before any screenshot |

- Each capture round prints ~55 paths and a ~5k-token report (item 6).
- Each full-resolution screenshot I opened cost roughly 1–1.5k tokens. I opened about 25.
- motion.md is the largest file and mostly worth it. The framework table (§6) and library facts could move
  to `stacks/*`.
- tokens.md §10 (a full 60-line example tokens.css) repeats §2–§9.
- **Suggestion:** a 1-page "fast path" for static one-pagers: the 10 rules that mattered here and the file
  pointers.

### Smaller notes
- `hero-load-sequence.css` hard-codes delays (380/520 ms) that don't scale when you tune `--dur-*` tokens.
  Express them as `calc(var(--dur-slow) * 0.9)` or similar.
- The rubric has no line for "evidence completeness" (did the full page actually render content?). A
  clean report plus a blank full-page image could still score 4s if the agent looked only at the
  viewport shots.
- The rubric descriptors are only given for 2/3/5. Round-to-round scores cluster at 4 because "4 = one
  small flaw" is easy to claim. Add one concrete 4 descriptor per line.
- `contrast.py --palettes` works nicely (93/93 pass). Worth mentioning in tokens.md as a data sanity
  check.

---

## What worked well

- **Direction step.** The one-line "Reading this as" plus the three dials plus "defaults rejected" forced a
  concrete point of view (cobalt test tiles, kiln curve) before any CSS. The AI-default table (§6) is the
  most useful single page in the skill.
- **Tokens-first with motion tokens.** Having duration and easing names shared with the snippets meant
  "calm" was one edit (durations ×1.3). The reduced-motion zeroing of `--dist-*` is elegant.
- **motion.md.** The "every animation needs a job" table, "one lead per viewport", asymmetric exits,
  the budget-by-dial table and the compositor-only rule steered every motion decision. The page ended up
  with orchestrated motion that isn't fade-up-everywhere.
- **capture.mjs report.** It caught the real bugs I would have missed from code:
  - the module CORS failure;
  - the animation table showing all hero parts starting at 0 ms (my specificity bug);
  - fonts actually rendered;
  - CLS;
  - reduced-motion "respected? yes".
- **Motion frames (t0…t1000) and the filmstrip.** Genuinely useful for judging choreography from stills.
  t600 showed the glaze mid-pour; t1000 showed everything settled.
- **Honesty rules and the stop rule.** Clear, and they kept the loop bounded (4 rounds).
- **slop_lint.py.** Fast, zero false negatives on my deliberate bad file (UC002/003/011/012 all fired).
- **design.template.md.** A good shape; filling it made the decisions log explicit.

## Top 8 improvements (priority order)

1. `capture.mjs`: scroll through the page before `fullPage`, and flag stuck-invisible content, so blank
   full-page shots can't pass as "clean" (item 1).
2. `capture.mjs`: serve file paths over a built-in static server, or warn about `type=module` on file://
   (item 2).
3. `search.py`: partial-match fallback, synonyms, and mood tags on fonts, so brief-language queries return
   something (item 4).
4. Resolve the `view()` vs "reveal once" contradiction and add an SVG line-draw-on-scroll recipe
   (items 3, 5).
5. `capture.mjs`: `--slices` for readable full-page segments, plus `--click` / `--focus-walk` for
   interactive states (items 7, 15).
6. `contrast.py`: role-family pairing, the required pairs always checked, per-pair 3:1 for non-text
   (item 8).
7. Components: native platform elements first; filter out build-step libraries for `--stack html`
   (item 13).
8. Trim context: dedupe the report's path lists, add a static-one-pager fast path, move framework tables
   out of motion.md (items 6, 16). Also de-pottery the examples (item 11).
