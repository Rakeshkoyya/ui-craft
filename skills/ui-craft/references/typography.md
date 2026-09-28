# Typography

Type carries most of a site's personality and nearly all of its readability. Decide it with the
tokens, before components.

## Contents

1. Choosing fonts that aren't the default
2. Pairing
3. Scale and fluid sizes
4. Line height, measure, tracking
5. Details: numerals, wrapping, case
6. Loading fonts without layout shift
7. Checklist

---

## 1. Choosing fonts that aren't the default

Inter, Roboto, Arial and bare `system-ui` for headings are what an agent reaches for with no
direction (UC013 flags them as the first display family). They're fine UI fonts; they just say
nothing. Choose from the brief instead:

1. **Start from the domain exploration** ([direction.md](direction.md)). What does type look
   like in the subject's world? Railway signage → condensed grotesk. Old cookbooks → warm
   old-style serif. Lab equipment → technical mono labels. Fashion magazines → high-contrast
   Didone.
2. **Search the pairing data** for candidates, then judge them:
   `python <skill>/scripts/search.py "warm crafted serif" --domain fonts`.
   Each row has display/body/mono families, a Google Fonts `css_import`, a `fallback_stack`
   (display ; body ; mono stacks separated by ` ; `), notes and license.
3. **Judge at real sizes.** Set your actual headline and a real paragraph in the candidate, at
   the sizes you'll use, on the actual background. Letterforms that look distinctive at 96 px
   can be clumsy at 16 px.
4. **Check coverage.** Languages the site needs (Latin Extended, Cyrillic, Vietnamese…),
   weights you need (a single-weight display face can't do bold subheads), italics, and
   tabular figures if you show data.
5. **Check the license.** Google Fonts are OFL or Apache and fine to self-host. Commercial
   fonts need a web license; never copy font files from another site.
6. **Respect existing brand fonts.** If the project already has fonts, use them.

Keep to two families (display + body), plus a mono only if you show code or data. Each extra
family is another download and another voice.

A neutral body face is fine and often right. The distinctiveness can live in the display face,
the scale contrast, or the way headings are set, while body text stays quiet and legible.

## 2. Pairing

Pairings work when the two faces contrast in one clear way and agree in the others.

| Pairing | Why it works | Watch for |
|---|---|---|
| Serif display + sans body | Classic contrast: voice on top, clarity below | Serif too delicate at small sizes; keep it ≥ 28px |
| Characterful grotesk display + neutral sans body | Modern, product-friendly; personality without ornament | Two sans that are too similar look like a mistake, so pick clearly different widths or shapes |
| One family, weight contrast (e.g. 800 vs 400) | Strongly systematic, Swiss feel | Needs a big scale ratio or the hierarchy flattens |
| Condensed display + humanist body | Signage, sports, editorial energy | Condensed faces need short headlines |
| Serif for both (display + text cuts) | Literary, long-form reading | UI chrome (buttons, forms) may feel stiff; a sans for UI is fine |

Match x-heights roughly so mixed lines don't wobble, and match the mood (a playful rounded
display over a severe grotesk reads as two brands).

## 3. Scale and fluid sizes

Pick one ratio and generate the steps from a base, rather than inventing sizes per component.

| Ratio | Name | Feel | Good for |
|---|---|---|---|
| 1.125–1.2 | Major second / minor third | Compact, calm | Product UI, dashboards, docs (density 6+) |
| 1.25 | Major third | Balanced | Most marketing and content sites |
| 1.333 | Perfect fourth | Clear, confident | Editorial, landing pages |
| 1.5–1.618 | Perfect fifth / golden | Dramatic | Posters, portfolios, one-message pages (variance 7+) |

Use a smaller ratio on mobile and a larger one on desktop. Fluid type does this with `clamp()`:
the size moves between a minimum and a maximum as the viewport grows.

```css
/* clamp(min, preferred, max): preferred = rem part + vw part so zoom still works */
--text-base: clamp(1rem, 0.96rem + 0.2vw, 1.125rem);   /* 16 → 18px */
--text-xl:   clamp(1.5rem, 1.3rem + 1vw, 2rem);        /* 24 → 32px */
--text-3xl:  clamp(2.6rem, 1.8rem + 4vw, 4.75rem);     /* ~42 → 76px */
```

Always include a `rem` term in the preferred value. A pure `vw` size doesn't grow when the user
zooms, which fails WCAG 1.4.4 (resize text). Body text never goes below 16 px on mobile. Keep
the number of distinct sizes small (about 6–8 steps); more steps blur hierarchy.

Hierarchy has three levers: size, weight and color. Weight and color do more than people
expect; a muted 14 px caption next to 16 px body is already a clear level. Don't solve every
hierarchy problem by making the heading bigger.

## 4. Line height, measure, tracking

**Measure** (line length): 60–75 characters for body text, about 45–60 on mobile. Set it with
`max-inline-size: 68ch` on text blocks, not on the whole section, so images and grids can still
go wide. Very long lines tire the eye; very short ones break reading rhythm.

**Line height** falls as size grows:

| Text | line-height |
|---|---|
| Body 16–20 px | 1.5–1.7 (longer measure → more) |
| Small text, captions | 1.4–1.5 |
| Subheads 24–40 px | 1.2–1.3 |
| Display 48 px+ | 1.0–1.15 (tight, but check descenders and accents don't collide) |

Use unitless values so they scale with font size.

**Tracking** (letter-spacing):

- Large display text usually wants slightly negative tracking (`-0.01em` to `-0.03em`); fonts
  are spaced for text sizes and look loose when huge.
- All-caps and small caps need positive tracking (`0.04em`–`0.1em`), because capitals set tight
  look cramped. Keep caps for short labels only.
- Leave body text at the font's default. Use `em` so tracking scales with size.

## 5. Details: numerals, wrapping, case

- **Numerals.** Use `font-variant-numeric: tabular-nums` wherever numbers line up or change
  (tables, prices, timers, counters) so digits don't jitter. Old-style figures
  (`oldstyle-nums`) suit running text in editorial serifs. Check the font supports them.
- **Wrapping.** `text-wrap: balance` on headings stops one-word last lines; `text-wrap: pretty`
  on paragraphs reduces orphans. Both degrade gracefully where unsupported.
- **Hyphenation and long words.** `overflow-wrap: anywhere` on user-generated content and URLs
  prevents overflow; `hyphens: auto` needs a correct `lang` attribute.
- **Case.** Use sentence case for headings, buttons and labels. It reads faster and fits a
  conversational voice (see [copy.md](copy.md)). Title Case is a valid house style; pick one and
  apply it everywhere.
- **Punctuation.** Real quotes (“ ” ‘ ’), a real ellipsis (…), and non-breaking spaces between
  numbers and units (`10&nbsp;kg`).
- **Font smoothing.** `-webkit-font-smoothing: antialiased` makes light text on dark backgrounds
  look less heavy on macOS; it doesn't matter elsewhere.
- **Emphasis.** Use the family's real italic or a weight change. Switching to a different
  family for one emphasized word looks like a mistake.

## 6. Loading fonts without layout shift

Late-loading fonts cause two problems: invisible text (FOIT) and text that reflows when the web
font swaps in (a layout shift that hurts CLS).

1. **Self-host when you can** (framework font tools do this; see the stack notes). It removes a
   third-party connection and lets you preload. If you use the Google Fonts CSS API, add
   `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` and include
   `&display=swap` in the URL.
2. **`font-display`**: `swap` for body text (show fallback immediately, swap when ready);
   `optional` for fonts that are nice-to-have (no swap after first ~100 ms, zero shift).
3. **Preload only the critical file** (usually the display face used above the fold):
   `<link rel="preload" href="/fonts/display.woff2" as="font" type="font/woff2" crossorigin>`.
   Preloading everything competes with images and CSS.
4. **Subset and use WOFF2.** Use variable fonts when you need three or more weights.
5. **Match the fallback metrics** so the swap barely moves anything. Declare a fallback face
   that wraps a local system font and adjusts its metrics to the web font:

```css
@font-face {
  font-family: "Display Fallback";
  src: local("Arial");
  size-adjust: 104%;        /* scale fallback glyphs to the web font's width */
  ascent-override: 92%;     /* match vertical metrics so line boxes don't change */
  descent-override: 24%;
  line-gap-override: 0%;
}
:root { --font-display: "Familjen Grotesk", "Display Fallback", ui-sans-serif, sans-serif; }
```

Values differ per font. Tools such as Fontaine or Capsize compute them, and Next.js
(`next/font`) and Nuxt (`@nuxt/fonts`) generate them automatically.

6. **Verify.** `capture.mjs` lists the font families that actually rendered and the CLS. If the
   report shows the fallback, the font failed to load (wrong path, wrong family name, CORS, or a
   CSP blocking the font host).

## 7. Checklist

- [ ] Display and body fonts chosen from the brief, not by default; at most two families plus mono.
- [ ] One scale ratio; 6–8 sizes; fluid sizes include a `rem` term.
- [ ] Body ≥ 16 px on mobile; measure 60–75ch; unitless line heights by size.
- [ ] Negative tracking on large display, positive on caps, default on body.
- [ ] `tabular-nums` where numbers align; `text-wrap: balance` on headings.
- [ ] Fonts self-hosted or preconnected, `font-display` set, critical file preloaded, fallback
      metrics matched; the capture report shows the intended families rendered.
