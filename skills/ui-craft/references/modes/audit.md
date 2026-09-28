# Mode: audit / review

Use when the user asks what's wrong with a UI, wants a review, or asks to "check" a page. The
deliverable is a prioritized list of findings with fixes. **Don't redesign or edit code unless
asked**; offer to fix afterwards.

## 1. Scope and context

- Establish what's in scope: one page, one component, a flow, or the whole site; which files;
  which URL. If unclear, audit the page the user named, at mobile and desktop.
- Read `.ui-craft/design.md` if it exists. Recorded decisions are ratified and aren't findings
  ([design-memory.md](../design-memory.md)); drift from them is.
- Note the stack and styling approach so fixes are written in the project's idiom
  (see [stacks/](../stacks/)).

## 2. Capture first

Look before reading code; code review misses what users actually see.

```
node <skill>/scripts/capture.mjs <url> --full-page --motion
node <skill>/scripts/capture.mjs <url> --reduced-motion --viewports 390x844
node <skill>/scripts/capture.mjs <url> --dark            # if the site has a dark theme
```

Open the screenshots and read `report.md` (console errors, overflow, missing alt, small targets,
fonts rendered, CLS, animation summary). Procedure and tool options: [visual-loop.md](../visual-loop.md).
If no browser is available, say so at the top of the report and audit from code only.

## 3. Run the mechanical checks

```
python <skill>/scripts/slop_lint.py <src paths>
python <skill>/scripts/contrast.py --css <tokens or global css file>
python <skill>/scripts/contrast.py "<text color>" "<background>"   # spot-check pairs from screenshots
```

Lint IDs (UC001–UC018) and their fixes: [anti-patterns.md](../anti-patterns.md) section A.

## 4. Look with judgement

- Score the page with the rubric in [visual-loop.md](../visual-loop.md) (section 6), one score
  per dimension with a sentence of evidence each.
- Run the Swap, Squint, Signature and Token tests from [direction.md](../direction.md).
- Check for the judgement anti-patterns UC-J01… in [anti-patterns.md](../anti-patterns.md).
- Do the five-minute manual pass in [accessibility.md](../accessibility.md) section 9 (keyboard,
  zoom, reduced motion, grayscale).
- Read the copy against [copy.md](../copy.md): specific headline, clear CTA, real states.

Filter your findings: "I'd have chosen differently" is taste, not a defect. Report a taste
concern only when it undermines the brief (a luxury brand with a bargain-bin look), and label it
as opinion.

## 5. Severity

| Severity | Means | Examples |
|---|---|---|
| **high** | Broken for some users, or clearly unprofessional at first glance | Contrast failure, no focus style, keyboard trap, horizontal scroll on mobile, content stuck invisible, console errors, placeholder copy, layout shift, UC `high` lint findings |
| **med** | Noticeably weaker quality or consistency | Generic AI-default look, inconsistent radii/spacing, motion on layout properties, missing empty/error states, weak hierarchy, `100vh` heroes |
| **low** | Polish | Orphans in headings, tracking on caps, tabular numerals, minor alignment |

## 6. Output format

No preamble. Group by severity, then by file. One line per finding:

```
file:line — issue — fix
```

Use `url @ viewport` in place of `file:line` for findings seen only in screenshots, and cite the
screenshot path. Example report:

```markdown
# Audit — /pricing (2026-09-27)
Captured: .ui-craft/shots/2026-09-27_10-12-03/ (390, 768, 1440; motion; reduced)
Rubric: hierarchy 3 · typography 2 · color 4 · spacing 3 · layout 2 · motion 2 · distinctiveness 2 · consistency 3 · a11y 2 · polish 3

## high
- src/components/Nav.tsx:41 — `outline-none` with no focus-visible replacement (UC004) — add `focus-visible:outline-2 focus-visible:outline-offset-2`
- /pricing @ 390 — plan table overflows by 212px (390-full.png) — wrap table in `overflow-x: auto` container; stack plans below 640px
- src/styles/global.css:88 — muted text #9ca3af on #ffffff is 2.54:1 — use --color-muted (oklch 0.47 …, 6.3:1)

## med
- src/app/pricing/page.tsx:12 — three identical plan cards, no recommended plan emphasis (UC-J01) — enlarge the recommended plan and give it the only accent fill
- src/styles/global.css:140 — `transition: all 0.3s` on .card (UC001) — transition transform and box-shadow opacity only

## low
- src/app/pricing/page.tsx:30 — prices jitter when toggling monthly/yearly — `font-variant-numeric: tabular-nums`

## Works well (keep)
- Clear single CTA per plan; honest copy about limits.

## Not verified
- Screen reader pass (no reader available).
```

Close with the three changes that would most improve the page, and offer to make them.

## 7. Don't

- Don't redesign, restyle or refactor unasked. An audit that rewrites the page isn't an audit.
- Don't list twenty low-severity nits before the high ones; order by impact.
- Don't report ratified design-memory decisions as issues.
- Don't claim something looks right or wrong without a screenshot you actually opened; mark
  code-only findings as such.
