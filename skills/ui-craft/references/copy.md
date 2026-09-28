# Copy

Words are part of the interface. Generic copy makes a well-designed page look like a template,
and specific copy makes a plain page feel considered. Write real copy from the brief; never ship
lorem ipsum or "Welcome to our website" (UC009).

## Contents

1. Principles
2. Headlines
3. Subheads
4. Calls to action
5. Banned filler
6. States: empty, loading, error, success
7. Microcopy
8. Social proof and numbers

---

## 1. Principles

- **Specific beats impressive.** Name the thing, the audience, the outcome, the number. "Book a
  2-hour wheel class, Saturdays in Leeds" beats "Discover your creative journey".
- **The user's words, not the company's.** Write "Your invoices", not "Invoice management
  module". Use the terms users search for.
- **One idea per sentence**, short paragraphs, front-loaded meaning. People scan the first two
  words of lines.
- **Sentence case** for headings, buttons, labels and menus. It reads as calm and conversational
  and avoids arbitrary capitalization debates. (If a house style uses Title Case, follow it
  everywhere.)
- **Same action, same word.** If the button says "Publish", the toast says "Published", and the
  menu item says "Publish", not "Post" or "Go live".
- **Don't invent facts.** If you don't have real numbers, testimonials, client names or prices,
  write clearly marked placeholders (`[Customer quote — needs approval]`) and list them for the
  user. Invented social proof is dishonest and easy to spot.

## 2. Headlines

A headline says what this is and why it matters to this reader. Patterns that work:

| Pattern | Example |
|---|---|
| Outcome for a specific person | "Payroll for restaurants that close at 2 a.m." |
| What it is, plainly | "A calendar that schedules your deep work for you" |
| The problem, named | "Stop losing Friday afternoons to expense reports" |
| A concrete claim with a number | "Ship a docs site in 10 minutes from your README" |
| The subject's own voice (editorial, culture, food) | "Slow bread, baked at 4 a.m. in Walthamstow" |

Keep hero headlines to about two lines at desktop width (roughly 4–10 words). If it needs a
comma and a second clause, the second half probably belongs in the subhead.

Test: cover the logo. Could the headline appear on a competitor's site unchanged? If yes, it's
not specific enough.

## 3. Subheads

The subhead explains how, for whom, or with what proof, in one or two sentences (about 15–25
words). It answers the question the headline raises.

- ✗ "Our innovative platform empowers teams to achieve more."
- ✓ "Connect your POS, and we'll calculate tips, overtime and tax for every shift, automatically."

Section headings follow the same rule: say what the section tells the reader ("Every plan
includes unlimited guests"), not a label ("Features").

## 4. Calls to action

- Say what happens when clicked: "Start free trial", "Book a class", "Download the report (PDF,
  2 MB)". Avoid "Submit", "Click here", "Learn more" (when unavoidable, add context with
  visually hidden text: "Learn more <span class="visually-hidden">about pricing</span>").
- Two to four words, verb first.
- One primary CTA per view, one secondary at most. Two primary buttons side by side split
  attention.
- Reduce the risk the reader is worried about, next to the button: "No card required",
  "Cancel anytime", "Takes 2 minutes".
- Don't repeat the same CTA with different wording across the page ("Get started", "Try it
  now", "Start today" all meaning the same thing). Keep the label consistent.
- Arrows on every button (`→`) are template chrome. Use an icon only when it clarifies
  direction or an external link.

## 5. Banned filler

These phrases fit any product, so they tell the reader nothing. Replace each with the specific
thing it's standing in for.

| Filler | Replace with |
|---|---|
| Welcome to our website / Welcome to [Brand] | What the site offers, in one line |
| Unlock the power of… / Harness the power of… | What the user can now do |
| Elevate / supercharge / revolutionize / transform your… | The actual improvement, measured if possible |
| Seamless / seamlessly | What happens with no extra step ("Imports your Figma file in one click") |
| Cutting-edge / next-generation / state-of-the-art / innovative | The specific capability |
| Solutions / leverage / synergy / empower | Plain verbs: build, send, fix, save |
| Best-in-class / world-class / industry-leading | A comparison or number you can back up |
| Your all-in-one platform | The two or three things it actually combines |
| Take your X to the next level | Where exactly? Say the outcome |
| Built for the modern… / for teams of all sizes | Who specifically |
| We're passionate about… | Evidence of the care: process, materials, guarantees |
| Lorem ipsum, "Your Company", "John Doe", "Acme" | Real content, or a labeled placeholder listed for the user |

Also avoid: exclamation marks in UI text, "Oops!" in errors, "simply" and "just" (it's never
simple for the person stuck), and poetic labels that hide meaning ("Field notes" for a blog is
fine only if the brand voice is that).

## 6. States: empty, loading, error, success

Every data-driven view has these states. Design and write them; they're what users see on the
worst days.

**Empty** — explain what goes here and how to fill it, with one action:

- ✗ "No data."
- ✓ "No invoices yet. Invoices you send appear here. [Create invoice]"
- For search: "No results for “ceramic mug”. Try fewer words, or [browse all products]."

**Loading** — show the shape of what's coming (a skeleton matching the layout) for waits over
~300 ms; for longer tasks, say what's happening ("Importing 1,240 contacts…") and show progress
if known. Don't show a spinner for instant actions; a flash of spinner looks like a glitch.

**Error** — say what happened, why if you know, and what to do next. Don't blame the user,
don't apologize at length, don't show raw error codes as the main message.

- ✗ "Error 500. Something went wrong."
- ✓ "We couldn't save your changes because the connection dropped. Your edits are kept here.
  [Try again]"
- Form field: "Enter a phone number with the country code, like +44 20 7946 0000."

**Success** — confirm briefly, with the object named: "Invoice #1042 sent to Dana". Offer the
next step if there is an obvious one ("View invoice"). Use a toast or inline status; don't
block with a modal.

**Destructive confirmation** — name the thing and the consequence: "Delete “Spring menu”? This
removes 24 dishes and can't be undone." Buttons: "Delete menu" / "Cancel", not "Yes" / "No".

## 7. Microcopy

- **Labels** are nouns ("Email"), buttons are verbs ("Send link").
- **Helper text** under a field answers the question before it's asked: "We'll only use this
  for delivery updates."
- **Placeholders** show format examples, never the label.
- **Links** describe the destination: "Read the pricing FAQ", not "here".
- **Numbers and dates**: format for the reader's locale (`Intl.NumberFormat`,
  `Intl.DateTimeFormat`); relative time for recent events ("2 min ago") with the full date on
  hover or in a `title`/`<time datetime>`.
- **Tone** follows the direction: warm brands can be conversational, civic sites plain,
  technical tools precise. Be consistent across the whole site.
- **Accessibility names**: icon-only buttons need `aria-label` written like button copy
  ("Close menu", "Next photo").

## 8. Social proof and numbers

- Use real logos, quotes and numbers only, with permission. A quote needs a real name, role and
  company, and should say something specific ("Cut our month-end close from 6 days to 2"),
  not "Great product!".
- Round numbers honestly. "10,000+ teams" is fine when true; "99.99% of customers love us" isn't.
- Fake-precise figures (4.97/5 from "2,341 reviews") without a source read as invented.
- When you don't have proof yet, leave the section out rather than filling it with placeholders
  that might ship.
