# Accessibility floor

The floor is WCAG 2.2 level AA plus a few habits that cost nothing. It isn't a design style or a
later phase; a beautiful page that a keyboard user can't operate is broken. Build it in from the
first component so nobody has to "add accessibility" at the end.

Each item says how to verify it. Criterion numbers refer to WCAG 2.2.

## Contents

1. The checklist
2. Focus
3. Keyboard
4. Structure: landmarks and headings
5. Forms and errors
6. Color and contrast
7. Motion
8. Images and alt text
9. Quick manual test

---

## 1. The checklist

| # | Requirement | Verify |
|---|---|---|
| 1 | Text contrast ≥ 4.5:1; large text (≥ 24 px, or ≥ 18.66 px bold) ≥ 3:1 (1.4.3) | `contrast.py` on token pairs; check text over images in screenshots |
| 2 | UI component and focus indicator contrast ≥ 3:1 against adjacent colors: input borders, icons, toggles (1.4.11) | `contrast.py` on border/background and focus/background pairs |
| 3 | Visible focus on every interactive element (2.4.7), not hidden behind sticky headers (2.4.11) | Tab through the page; watch every stop |
| 4 | Everything works with a keyboard, no traps (2.1.1, 2.1.2) | Unplug the mouse: tab, shift+tab, enter, space, escape, arrows |
| 5 | Logical focus order that matches reading order (2.4.3) | Tab through at mobile and desktop widths |
| 6 | Skip link to main content; landmarks present (2.4.1, 1.3.1) | First tab stop is "Skip to content"; landmarks listed in the a11y tree |
| 7 | One `h1`, headings in order, no levels skipped for styling (1.3.1, 2.4.6) | Heading outline from the a11y tree or a browser extension |
| 8 | Every input has a visible label; errors are identified in text and say how to fix (3.3.1, 3.3.2, 3.3.3) | Submit an empty and an invalid form |
| 9 | Name, role, state exposed for custom controls (4.1.2) | Accessibility tree shows e.g. "Menu, button, collapsed" |
| 10 | Status messages announced without moving focus (4.1.3) | Screen reader hears "Saved" / "3 results" |
| 11 | Target size ≥ 24×24 CSS px or enough spacing (2.5.8) | `capture.mjs` report lists small targets |
| 12 | Color is never the only cue (1.4.1) | View the page in grayscale; links, errors, states still distinguishable |
| 13 | Content reflows at 320 px width / 400% zoom without two-way scrolling (1.4.10); text resizes to 200% (1.4.4) | 390 px capture has no overflow; zoom the browser to 200% |
| 14 | Pinch zoom allowed: no `user-scalable=no` or `maximum-scale=1` (UC018) | Read the viewport meta |
| 15 | Moving content > 5 s can be paused (2.2.2); nothing flashes > 3 times/s (2.3.1) | Carousels and marquees have a pause control |
| 16 | `prefers-reduced-motion` honored (SKILL.md floor; 2.3.3 is AAA but we require it) | `capture.mjs --reduced-motion` frames show no travel |
| 17 | Meaningful images have alt text; decorative ones `alt=""` (1.1.1) | `slop_lint.py` UC008; capture report |
| 18 | Page `lang` set; `<title>` unique and descriptive (3.1.1, 2.4.2) | Read `<html lang>` and the title |
| 19 | Dragging has a single-pointer alternative (2.5.7) | Sliders and sortable lists also work with buttons/keys |
| 20 | No layout shift from late assets (not WCAG, but disorienting) | Capture report CLS < 0.1 |

## 2. Focus

- Never remove the focus outline without a replacement (UC004). Style it instead:

```css
:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
  border-radius: inherit;
}
/* Only suppress the ring for mouse clicks, never for keyboard focus */
:focus:not(:focus-visible) { outline: none; }
```

- `:focus-visible` shows the ring for keyboard users and hides it after mouse clicks in most
  browsers, so there's no excuse to drop it.
- The ring must contrast ≥ 3:1 with the background. On mixed backgrounds (images, accent
  fills), use a two-tone ring: `outline: 2px solid var(--color-focus); box-shadow: 0 0 0 4px var(--color-bg);`.
- Sticky headers can cover focused elements when tabbing upward. Add
  `scroll-padding-top: <header height>` on `html`.
- After opening a dialog, move focus into it; after closing, return focus to the button that
  opened it. After a route change in a single-page app, move focus to the new page's `h1` or
  main region (and announce the new title).

## 3. Keyboard

- Use native elements: `<button>` for actions, `<a href>` for navigation, `<details>` for simple
  disclosure, `<dialog>` for modals, `<select>` or a proven library for comboboxes. Native
  elements are focusable and keyboard-operable for free.
- A clickable `<div>` or `<span>` (UC015) is a bug. If you truly can't use a button, it needs
  `role="button"`, `tabindex="0"`, and Enter and Space handlers, which is why you should use a button.
- Composite widgets (tabs, menus, listboxes, radio groups) use one tab stop and arrow keys
  inside ("roving tabindex"). Follow the WAI-ARIA Authoring Practices patterns listed in
  [components.md](components.md).
- Escape closes the topmost overlay. Focus is trapped inside modal dialogs only (native
  `<dialog>` opened with `showModal()` does this), never inside non-modal popovers.
- Don't use positive `tabindex` values; fix the DOM order instead.
- Hover-only interactions need a keyboard and touch equivalent. Content that appears on hover
  or focus must be dismissible (Escape) and hoverable without disappearing (1.4.13).

## 4. Structure: landmarks and headings

```html
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header>…<nav aria-label="Main">…</nav></header>
  <main id="main" tabindex="-1">
    <h1>…</h1>
    <section aria-labelledby="pricing-h"><h2 id="pricing-h">Pricing</h2>…</section>
  </main>
  <footer>…</footer>
</body>
```

- One `<main>`, one `h1` per page. Label repeated landmarks (`aria-label="Main"` vs `"Footer"`).
- Headings form an outline. Choose the level by structure and the size by the type scale; a
  small-looking heading can still be an `h2`.
- The skip link can be visually hidden until focused, but it must appear on focus.
- Use lists for lists (nav items, feature lists), `<table>` with `<th scope>` for tabular data,
  `<button>` inside `<form>` with the right `type`.

## 5. Forms and errors

- Every input has a visible `<label for>`. Placeholder text isn't a label: it disappears when
  typing and usually fails contrast.
- Group related controls with `<fieldset>` and `<legend>` (radio groups, address blocks).
- Use the right `type` and `autocomplete` (`email`, `tel`, `name`, `street-address`,
  `one-time-code`) so mobile keyboards and autofill help (1.3.5). Never block paste.
- Mark required fields in text ("required" or an asterisk explained at the top), not only by color.
- Validate on submit or on blur, not on every keystroke. On error:
  - Put the message next to the field, linked with `aria-describedby`, and set `aria-invalid="true"`.
  - Say what's wrong and how to fix it: "Enter a date after today", not "Invalid input".
  - For forms with several errors, show a summary at the top that links to each field, and move
    focus to it.
- Don't disable the submit button to signal errors; people can't tell why it's disabled. Let
  them submit and show what to fix.
- Announce async results (saved, failed, N results) with a polite live region:
  `<p role="status">Saved</p>`. The region must exist in the DOM before its text changes.

Copy for errors and states: [copy.md](copy.md).

## 6. Color and contrast

- Check every text/background pair in both themes, including muted text on surfaces, text on
  accent buttons, placeholder text, disabled-looking text that still conveys information, and
  text over images or gradients (add a scrim or solid backing).
- Links inside paragraphs need an underline (or another non-color cue); color alone doesn't work
  for colorblind users. Navigation links in an obvious nav bar can go without.
- Status needs an icon or text, not just red/green. Charts need labels, patterns or direct
  annotations in addition to color.
- Contrast math: `python <skill>/scripts/contrast.py FG BG`. Visual checks catch what tokens miss.

## 7. Motion

- Wrap non-essential motion in `prefers-reduced-motion` handling (UC003). Reduce means *less*
  motion, not *no feedback*: replace travel, zoom, parallax and spinning with short opacity
  fades or instant changes. The shared motion tokens already collapse distances under reduced
  motion; see [motion.md](motion.md).
- Auto-playing carousels, marquees and background video need a visible pause control and must
  not restart themselves after the user pauses.
- Avoid large-area motion tied to scroll (parallax, zooming backgrounds) unless it has a reduced
  path; it's the most common trigger for vestibular discomfort.
- Never flash content more than three times per second.

## 8. Images and alt text

Alt text describes what the image contributes in context, not what's in it pixel by pixel.

| Image | alt |
|---|---|
| Informative photo | What matters for this page: `alt="Instructor shaping a bowl on the wheel"` |
| Decorative (texture, divider, ornament) | `alt=""` — screen readers skip it |
| Image that is a link or button | The destination or action: `alt="Home"`, not "logo" |
| Logo in the header | The organization name: `alt="Kiln & Co."` |
| Chart or diagram | Short summary in alt plus the data or conclusion in nearby text or a table |
| Image containing text | The text itself |
| Icon-only button | No `<img>` alt needed if the button has `aria-label="Close"`; hide the SVG with `aria-hidden="true"` |

Don't start with "Image of…". Keep it under ~150 characters; longer descriptions go in the page.
Every `<img>` needs an `alt` attribute (UC008), even if empty. CSS background images are
invisible to assistive tech, so never put meaningful content only there.

## 9. Quick manual test

After each build round (5 minutes):

1. Tab from the address bar through the whole page. Every stop visible, order sensible, skip
   link first, nothing unreachable, no trap. Open and close every overlay with the keyboard.
2. Zoom to 200%. Nothing overlaps or gets cut off.
3. Turn on reduced motion (or `capture.mjs --reduced-motion`). Nothing travels; everything
   still appears.
4. Look at the grayscale version of a screenshot. States and links still distinguishable.
5. If a screen reader is available (VoiceOver: Cmd+F5; NVDA on Windows), listen to the page
   headings list and one form submission.

If you couldn't do a check, say which one in your report.
