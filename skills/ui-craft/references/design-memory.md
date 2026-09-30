# Design memory: `.ui-craft/design.md`

A plain Markdown file in the user's repo that records the design decisions for the project, so
the next session (or a different agent) builds consistently instead of re-inventing the
direction. Template: `assets/design.template.md`.

## Why it exists

Agents forget between sessions. Without memory, each new page drifts: a slightly different
blue, a new radius, another font. The file makes decisions durable and makes reviews fair:
something recorded there is a decision, not a defect.

## The contract

Path: `.ui-craft/design.md` at the project root (next to `package.json` or the site root).
Sections, in this order, all required (write "n/a" rather than deleting a section):

| Section | Contents |
|---|---|
| **Story** | The Story brief ([story.md](story.md) §5): vision, origin, tension, transformation, proof, voice, angle, central metaphor, motion language, arc; whether it was inferred, asked or generated; open placeholders |
| **Structure** | Sitemap; the home page chapter table (chapter, archetype id, layout family, scene, intensity); interior page arcs; the showpiece and its echoes; history check result |
| **Direction** | The "Reading this as:" line; audience; tone; the signature element; the defaults rejected (default → replacement) |
| **Dials** | `variance N · motion N · density N`, with one line on why |
| **Tokens** | Where tokens live (file path); color roles with values for each theme; spacing base and scale; radius personality and values; depth strategy (borders / subtle shadows / layered shadows); z-index scale |
| **Typography** | Families and roles (display, body, mono) with source and loading method; scale ratio and the size tokens; line heights; tracking rules; numeral settings |
| **Motion** | Motion language preset; motion tokens file; scenes per chapter (module, medium, scrub or play); what moves and what doesn't (by component); page/route transition approach; the reduced-motion behavior |
| **Components & libraries** | Installed UI libraries with version and why; which components come from where; theming method (variables mapped); components that are hand-rolled |
| **Patterns** | Reusable patterns with measured values, e.g. "Primary button — 44px h · 12px 20px padding · radius-md · text-sm/600 · hover accent-hover · press scale 0.98". Only patterns used twice or more, or deliberately unusual |
| **Decisions log** | Table of `Date (YYYY-MM-DD) · Decision · Rationale`, newest last. Includes rejected options when the reason matters |

Keep it short, roughly 60–200 lines. It's a set of decisions, not documentation of every
component. Values must match the code; the tokens file is the source of truth for exact values,
and the memory file records the choices and reasons.

## When to read it

- **Always first** (SKILL.md workflow step 1), before scanning the codebase or proposing a
  direction. If it exists, the direction, dials, tokens, fonts and libraries are settled: build
  with them.
- Before a review or audit, so recorded decisions aren't reported as problems.

If the file contradicts the code (the file says `radius-md: 8px`, the CSS says 12px), trust the
code for what currently ships, mention the drift to the user, and ask which one is intended
before "fixing" either.

## When to write or update it

- **New project**: after the first build round passes the visual loop, offer to create it from
  the template (SKILL.md step 7). Don't write it silently; it's a file in the user's repo.
- **Existing project without the file**: offer to create it by extracting what's already there:
  tokens from the theme/CSS files, fonts in use, libraries in `package.json`, and repeated
  measured values (the most common button height, card padding, radius).
- **Update** when a decision changes or a new pattern appears twice: edit the relevant section
  and append a dated line to the decisions log. Never rewrite history; mark superseded
  decisions ("Superseded 2026-10-02: accent changed to …").
- **Never overwrite** an existing file wholesale. Edit sections in place, and show the user the
  change.

## How changes to settled decisions happen

The user can change anything. When a request conflicts with the memory ("make the buttons
rounder" when the memory says sharp radius):

1. Do what the user asked.
2. Update the memory (Tokens/Patterns) and add a decisions-log entry with the date and the reason.
3. Apply the change consistently (all buttons, not just the one in view), or ask whether it's a
   one-off exception and record that instead.

Agents shouldn't change recorded decisions on their own initiative. If you think a decision is
hurting the design, say so and propose the change; don't make it quietly.

## How reviews treat it

In audit and redesign modes ([modes/audit.md](modes/audit.md), [modes/redesign.md](modes/redesign.md)):

- A choice recorded in the memory is **ratified**. Don't report it as an issue, even if you'd
  choose differently (a serif display face, a high-variance layout, a dark-only theme).
- **Do** report: drift from the memory (values in code that don't match), accessibility floor
  failures (the floor overrides the memory; a recorded palette that fails contrast is still a
  failure — report it and propose the smallest change that passes), and mechanical lint
  findings.
- When the memory itself seems to be causing a problem, put it in a separate "Decisions to
  revisit" note, clearly labeled as opinion.

## Minimal example

```markdown
# Design memory — Kiln & Co. pottery school

## Direction
Reading this as: a booking site for a small ceramics school, warm and hands-on — a clay-texture
band that carries the class calendar, gentle settle-in motion.
Signature: the calendar band with glaze-colored class chips.
Rejected: stock hero photo → full-bleed wheel close-up; three feature cards → one class table;
Inter → Young Serif + Work Sans.

## Dials
variance 5 · motion 4 · density 4 — friendly and legible for all ages; motion only on the calendar.

## Tokens
File: src/styles/tokens.css. Hue 45 (clay). bg oklch(0.975 0.008 45) … (see file)
Space: 4px base, sections space-9. Radius: soft (4/8/12). Depth: subtle shadows.

## Typography
Young Serif (display, 400 only) + Work Sans (body 400/600), self-hosted via Fontsource.
Scale 1.25; body 17px→18px; measure 66ch.

## Motion
assets tokens. Calendar chips stagger in once (60ms); menus dur-base; no scroll reveals.
Reduced: chips appear without travel.

## Components & libraries
@radix-ui/react-dialog (booking modal) — accessible, unstyled; themed via tokens.

## Patterns
Primary button — 44px h · 12px 20px · radius-md · Work Sans 600 16px · press scale 0.98.

## Decisions log
| Date | Decision | Rationale |
|---|---|---|
| 2026-09-27 | Clay hue 45, no second accent | Matches kiln photos; one accent keeps booking CTA obvious |
```
