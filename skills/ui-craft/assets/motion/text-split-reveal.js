/*
 * Split-text reveal (words rise from behind a mask), framework-free
 * ----------------------------------------------------------------------------
 * Communicates: emphasis and pace for ONE display line — a hero statement or
 *   a section title that deserves a beat. Words arrive in reading order.
 *   Never use it on body copy, buttons, or anything the user needs to read
 *   immediately; never split into characters for text longer than ~20 chars.
 * Use: `<h2 data-split>Built for the long run</h2>` + text-split-reveal.css.
 *     import { initSplitReveal } from './text-split-reveal.js';
 *     initSplitReveal();            // reveals when each heading scrolls into view
 *   Plain text only: elements with child markup (links, <em>) are skipped
 *   rather than mangled. For line-based splitting with auto re-split on
 *   resize, use GSAP SplitText (free) with `mask: 'lines'` and `autoSplit`.
 * Accessibility: the original text stays in a visually-hidden span for
 *   screen readers and find-in-page; the animated word spans are aria-hidden.
 * Reduced motion: text is not split and nothing moves.
 * Support: evergreen browsers (IntersectionObserver).
 */

const STEP_MS = 55;

function split(el) {
  const text = el.textContent.trim().replace(/\s+/g, ' ');
  const words = text.split(' ');

  const srOnly = document.createElement('span');
  srOnly.className = 'split-sr';
  srOnly.textContent = text;

  const visual = document.createElement('span');
  visual.setAttribute('aria-hidden', 'true');
  words.forEach((word, i) => {
    const mask = document.createElement('span');
    mask.className = 'split-word';
    const inner = document.createElement('span');
    inner.textContent = word;
    inner.style.setProperty('--d', `${i * STEP_MS}ms`);
    mask.append(inner);
    visual.append(mask, i < words.length - 1 ? ' ' : '');
  });

  el.replaceChildren(srOnly, visual);
  el.classList.add('is-split');
}

export function initSplitReveal({ root = document, selector = '[data-split]' } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const targets = [...root.querySelectorAll(selector)].filter((el) => el.children.length === 0);
  targets.forEach(split);

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -15% 0px' }
  );
  targets.forEach((el) => io.observe(el));

  return () => io.disconnect();
}
