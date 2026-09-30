# The visual loop: capture → look → critique → fix → recapture

Code that compiles is not a finished interface. Spacing that reads fine in a stylesheet can
collapse on a phone; an entrance animation can leave a heading stuck at `opacity: 0`; a web
font can silently fall back to Times. The only way to know is to render the page, look at the
pixels, and judge them against a fixed standard. This file is that procedure.

## 1. Pick the capture tool

| Situation | Use |
|---|---|
| The environment already gives you a browser tool (Playwright MCP, Chrome DevTools MCP, a built-in screenshot/preview tool) | Use it for interactive checks: hover, open menus, fill forms, click through flows. Still run `capture.mjs` once per round if you can, for the report. |
| Node is available and you can install dev dependencies | `node <skill>/scripts/capture.mjs URL …` — repeatable screenshots at fixed viewports plus `report.md`. |
| Neither works | Say plainly that visual verification was not done, and why. Do not score the rubric. |

`capture.mjs` needs Playwright in the user's project (it also looks next to the script):

```
npm i -D playwright && npx playwright install chromium
```

If it exits 2 with that message, ask before installing — it adds a dev dependency and downloads
a browser build (well over 100 MB).

## 2. Get a URL

- **Static HTML**: pass the file path (`capture.mjs index.html`). For the run, `capture.mjs`
  serves the project at `http://127.0.0.1:<random port>` (root = nearest folder above the file
  with `package.json` or `.git`, else the cwd if it contains the file, else the file's folder),
  so `type="module"` scripts, `fetch()`, `../` assets, fonts and View Transitions work — they
  break on `file://`. Dot-folders are never served. `--no-serve` forces raw `file://`.
- **Dev server**: read `package.json` scripts. Usual commands and ports:
  Vite `npm run dev` → 5173; Next.js `npm run dev` → 3000; Nuxt → 3000; Astro → 4321;
  SvelteKit (Vite) → 5173; Angular `ng serve` → 4200. Trust the URL the server prints over
  these defaults — ports shift when one is taken.
- Start the server **in the background** (your shell tool's background mode, or `&` in a POSIX
  shell) so it does not block you, then wait until it prints its "ready/Local:" line before
  capturing. If capture says "Could not load", the server is not up yet or the port is wrong.
- Capture a production build (`npm run build && npm run preview`) before final sign-off if
  time allows: dev servers inject overlays and skip optimisations.
- Stop the server when the loop is finished.

## 3. Capture

First round, capture everything:

```
node <skill>/scripts/capture.mjs http://localhost:5173 --full-page --motion
```

Add `--dark` if the design has a dark theme and `--reduced-motion` once to prove motion is
opt-out. Default viewports are 390×844 (phone), 768×1024 (tablet), 1440×900 (laptop); narrow
them with `--viewports` in later rounds when you are fixing one breakpoint. Use `--wait 1500`
for pages whose content arrives late (data fetching, heavy hydration).

Output goes to `.ui-craft/shots/<run-id>/` (run-id is UTC): next to the HTML file when you pass
a local file, in the current directory when you pass a URL; `--out DIR` overrides both. Suggest
adding `.ui-craft/shots/` to `.gitignore`. The script prints the viewport shots and full-page
slices to open, and the `report.md` path; exit 0 means the automated report is clean, exit 1
means it found issues (or the page could not be loaded — read the message).

Every run scrolls through the whole page (viewport steps, ~350 ms each) before probing, so
IntersectionObserver and scroll-driven reveals fire, then returns to the top. Content that never
became visible while in view is reported as **hidden content** (opacity < 0.05, visibility
hidden, or transformed off-canvas), with the selector of the element doing the hiding. Treat it
like a console error: a reveal that never fires is a blank section for real visitors.

Interactive states, on the first viewport only (list the viewport you care about first):

- `--focus-walk N` presses Tab N times and writes `focus-<n>.png` around each focused element.
  An element whose outline, box-shadow, border, background, colour or pseudo-elements do not
  change on focus is reported as "no visible focus".
- `--click SELECTOR` (repeatable, clicked in order) opens menus, dialogs or tabs before
  `after-click.png`. A selector that cannot be clicked is reported as "click failed".

## 4. Look at the images — actually

Open each PNG with your image-viewing ability (the file-read tool on the PNG path renders it for
you). Reading `report.md` alone is not looking. Order that works:

1. `390x844.png` — most visitors are on phones, and most layout bugs appear here first.
2. `1440x900.png` — the first impression on desktop.
3. The full-page slices `<vp>-full-01.png`, `-02`, … in order (about 1.5 screens each, at most
   12). Do not judge from `<vp>-full.png`: it is too tall to read once scaled down. Every slice
   should show rendered content; a blank band means something is stuck invisible.
4. Motion frames and the scroll filmstrip (section 5).

For each screenshot, ask:

- **Hierarchy** — squint. What do you see first, second, third? Is that the order the page
  wants? Exactly one dominant element above the fold.
- **Rhythm** — are gaps between sections consistent and intentional, or random? Do related
  things sit closer together than unrelated things?
- **Alignment** — pick the left edges: how many distinct ones are there? Fewer is calmer.
  Look for text that is almost-but-not-quite aligned with an image or card.
- **Contrast** — any grey-on-grey body text, low-contrast buttons, text over busy images?
  Confirm doubtful pairs with `scripts/contrast.py`.
- **Density** — cramped blocks, or a desert of empty space with a tiny island of content?
  Line length for body text should be roughly 45–75 characters.
- **The signature element** — the one distinctive idea chosen in the direction step. Is it
  visible and doing work, or did it get lost among defaults?
- **Mobile** — does the headline wrap badly (one orphan word)? Are buttons thumb-sized? Does
  the nav collapse cleanly? Any sideways scroll?
- **Details** — broken images, default focus rings on everything, mismatched border radii,
  icons of different stroke weights, placeholder copy.

Then read `report.md` and cross-check: a font listed under "Loaded faces" should be the one you
see; an overflowing selector should correspond to something visibly cut off or pushing the
page wide.

## 5. Evaluate motion from stills

You cannot watch video, but frames tell you most of what matters.

**Load frames** (`motion-<vp>-t0/150/300/600/1000.png`):
- At t0 the page may be mid-entrance; by t600 the primary content (headline, main CTA) should
  be readable; by t1000 everything above the fold should be settled. Anything still invisible
  at t1000 is too slow or broken.
- Compare adjacent frames: elements should arrive in a sensible order (headline before
  supporting text before decoration), not all at once and not in a random scatter.
- A frame that differs wildly from its neighbour, or a layout that jumps between frames, points
  to layout shift — check CLS in the report.

**Scroll filmstrip** (`scroll-<vp>-<n>.png`, one per viewport height, 400 ms settle each):
- Every section that scrolls into view should be visible in its frame. Content stuck at
  `opacity: 0` (a blank band where text should be) means a scroll-reveal never fired — often
  an IntersectionObserver threshold that is too high, or a class that is never added.
- Reveals should be subtle: shifted a few pixels, not flying in from off-screen.

**Animation table in the report**:
- Any row flagged `non-composited` (animating `width`, `height`, `top`, `margin`, colours,
  box-shadow…) is a jank risk. Rewrite with `transform`/`opacity`/`clip-path`, or accept it
  deliberately for tiny, rare interactions.
- Durations: UI feedback 100–200 ms, entrances 300–600 ms, anything over 1000 ms that is not an
  ambient loop needs a reason. Easing: entrances should decelerate (ease-out family); `linear`
  only for continuous loops.
- Many `infinite` animations competing for attention is noise; keep at most one ambient loop
  in view.
- With `--reduced-motion`, "respected? no" means motion is not opt-out. Fix it: remove or
  shorten movement under `prefers-reduced-motion: reduce` (fades are fine). See
  `references/motion.md`.

**Interactive states**: open `focus-<n>.png` (is the ring visible against its background, and
on-brand?) and `after-click.png` (does the menu or dialog look designed, not default?). Hover is
still not captured; check it with an interactive browser tool, or say it was not verified.

## 6. Score with the rubric

Score each dimension 1–5 from what you saw. Use the descriptors; do not average feelings. A 4
must match its descriptor exactly; if you cannot name the one flaw, it is not a 4 yet.

| Dimension | 2 — weak | 3 — acceptable | 4 — good | 5 — excellent |
|---|---|---|---|---|
| Hierarchy | Several elements compete; unclear where to look first | Clear primary element, but secondary levels blur together | Clear 1st/2nd/3rd levels; one section below the fold has a competing focal point | Squint test reads instantly: one focal point, then a clear 2nd and 3rd level |
| Typography | Default or mismatched fonts, fallback visible, cramped or huge line lengths | Deliberate pairing and scale, a few awkward wraps or weights | Pairing and scale hold everywhere; one heading wraps awkwardly at one viewport | Type carries the personality; consistent scale, comfortable measure, no orphans in headings |
| Color & contrast | Muddy or clashing palette; text fails contrast somewhere | Coherent palette, contrast passes, accent used a bit too freely | Restrained palette, all pairs pass; accent overused in one place or dark mode has one flat area | Restrained palette with a purposeful accent; every text pair passes AA; dark mode (if any) designed, not inverted |
| Spacing & rhythm | Random gaps; related items not grouped | Mostly on a scale; a couple of sections feel tight or loose | On the scale everywhere; exactly one section feels tight or loose | Consistent spacing scale; grouping obvious; generous where it matters |
| Layout & responsiveness | Overflow, overlaps, or broken mobile layout | Works at all viewports but mobile feels like a squeezed desktop | Each viewport designed; one component (table, nav, card row) is just squeezed | Each breakpoint feels designed for its size; no overflow; content reorders sensibly |
| Motion quality | Content stuck invisible, jank-prone properties, motion everywhere | Smooth and composited but generic (same fade-up on everything) | Ordered, composited, reduced-motion works; one reveal is generic or a beat too slow | Motion clarifies order and state, timings and easing consistent, reduced-motion respected |
| Distinctiveness / point of view | Looks like a template or the default AI look | Some personality, still leans on stock patterns | Clear point of view; one section falls back to a stock pattern | A clear point of view; the signature element is memorable and fits the brand |
| Story | Nothing on the page is specific to this brand's story | The story is told in the copy but the visuals don't show it | The metaphor shows in layout, palette and the showpiece; one chapter is generic | Every chapter tells its part; the metaphor shows in layout, palette, type and motion |
| Structure | The default skeleton (hero → features → testimonials → CTA) reskinned | Some story chapters, but order and layout families follow the template | Chapters come from the story, ≥ 4 layout families; one pair of neighbours shares a family | A skeleton only this brand would have; clear showpiece and pacing; interior pages have their own arcs |
| Motion sync | Scenes, UI motion and palette follow different physics | One motion language in the scenes, UI motion still default | One language across scenes and UI; one element (a hover or page transition) off | Scenes, hovers, menus and page transitions share one physics; every scene step is visible in the filmstrip |
| Component consistency | Buttons, cards, radii, icons vary without reason | Mostly consistent, a few one-offs | One system throughout; a single one-off (radius, shadow, icon) | Every component clearly from one system: shared radii, shadows, icon style, states |
| Accessibility signals | Missing alt, tiny targets, low contrast, no focus styles | Report clean on alt/targets; focus visible but plain | Report clean; focus walk all "yes"; focus ring plain or low-contrast on one surface | Report clean; focus states designed; semantic structure; motion opt-out works |
| Polish & details | Placeholder copy, broken images, misaligned edges | Real content, minor misalignments or rough edges | Real copy, crisp edges; one unhandled edge state or near-miss alignment | Crisp alignment, real copy, empty/edge states handled, nothing looks unfinished |
| Evidence completeness | Only the first-viewport shots were opened | Slices opened for one viewport; interactive states not checked | Every slice of phone and desktop opened, all showing content; menus/dialogs checked with `--click`, focus not walked | Every slice at every viewport opened and showing rendered content; no hidden-content finding; `--click` and `--focus-walk` shots opened |

Write the scores down (section 8). A score without a screenshot you looked at behind it does
not count.

## 7. Fix the three biggest problems, then recapture

- Rank what you found by impact on a first-time visitor, not by ease. Fix the **three** biggest
  issues this round. Fixing twenty small ones at once hides regressions and stalls the loop.
- Report findings (overflow, console errors, hidden content, missing alt, no visible focus,
  non-composited animation, failed requests) count as issues; a console error, hidden content
  or horizontal overflow on mobile is almost always in the top three. The CLI counts finding
  lines per viewport, so one problem seen at three widths counts three times.
- Recapture with the same flags and viewports so the images are comparable. Open the new and
  old image for the same viewport one after the other and state what changed. If a fix made
  something else worse, revert or adjust before moving on.

**Stop rule** — end the loop when every rubric dimension is ≥ 4 **and** the report is clean
(exit 0), or after **5 rounds**, whichever comes first. When you stop short of that, tell the
user exactly which dimensions are below 4 and what you would do next.

## 8. Keep a short iteration log

Append to `.ui-craft/shots/<run-id>/notes.md` for each round (the run-id of that round's
capture). Keep it terse:

```
## Round 2 — 2026-09-27_14-02-10-512
Scores: Hier 4 · Type 3 · Color 4 · Space 3 · Layout 4 · Motion 3 · POV 4 · Comp 4 · A11y 4 · Polish 3 · Evidence 4
Report: clean except 1 non-composited animation (.card:hover box-shadow)
Top 3 fixes:
1. Hero headline wraps to an orphan on 390px → tightened letter-spacing, adjusted clamp()
2. Section gaps inconsistent (48/96/64) → spacing scale 64/96
3. Feature cards fade in all at once → 60 ms stagger, transform + opacity only
Compared with round 1: mobile hero fixed; desktop unchanged.
```

The log lets you (or the next session) see progress and avoid undoing earlier decisions. Record
lasting decisions in `.ui-craft/design.md`, not here.

## 9. Honesty rules

- Never say a page "looks good", "is pixel-perfect", or "is visually verified" unless you
  opened the screenshots in this session. Reading code or `report.md` is not looking.
- Report what you checked and what you did not: e.g. "Checked 390/768/1440 light mode and the
  scroll filmstrip; did not check hover states or dark mode."
- If capture failed or no browser was available, say so and skip the rubric.
- Report scores as they are. A 3 honestly reported is more useful than an inflated 5.
- A clean `report.md` is necessary, not sufficient: it cannot see ugly, only broken.
