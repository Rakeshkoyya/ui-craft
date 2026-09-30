/*
 * Text highlight on scroll — a manifesto read out word by word
 * ----------------------------------------------------------------------------
 * Communicates: "read this slowly; it matters." Words brighten from dim to
 *   full as the passage crosses the viewport, pacing the reader through the
 *   brand's one big statement. Use once per page, on 20–70 words. Never on
 *   body copy people need to scan.
 * Use: load text-highlight.css, then
 *     <p class="th" data-th>We will not plant a single tree we can't look after for twenty years.</p>
 *     import { initTextHighlight } from './text-highlight.js';
 *     const cleanup = initTextHighlight(el, { gsap, ScrollTrigger, language: 'organic' });
 *   Options: dim (start opacity, default 0.22), start/end (ScrollTrigger
 *   positions, default 'top 80%' → 'bottom 55%').
 * Splitting: text nodes are wrapped word by word in <span class="th__w">;
 *   inline elements (<em>, <a>, <strong>) are kept and their words wrapped
 *   inside them. Spaces stay as text, so copy, find-in-page and screen
 *   readers read the passage exactly as written (no aria-hidden copies).
 *   Cleanup restores the original child nodes.
 * Reduced motion: not split, not dimmed — the passage is plain text.
 * Mobile: identical; the passage wraps naturally.
 * Never-invisible: words are dimmed only by GSAP after the split; no CSS
 *   hides anything. Before printing, every word is set to full.
 * Support: GSAP 3.12+ with ScrollTrigger (injected).
 */

import { resolveLanguage } from './languages.js';

const MOTION_OK = '(prefers-reduced-motion: no-preference)';
const noop = () => {};

/** Split "Plant, then  wait." → ['Plant,', ' ', 'then', '  ', 'wait.'] (words and whitespace runs). */
export function splitWords(text) {
  return String(text).match(/\s+|[^\s]+/g) || [];
}

function wrapWords(root) {
  const words = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach((node) => {
    const frag = document.createDocumentFragment();
    splitWords(node.nodeValue).forEach((piece) => {
      if (/^\s+$/.test(piece)) {
        frag.append(piece);
        return;
      }
      const span = document.createElement('span');
      span.className = 'th__w';
      span.textContent = piece;
      words.push(span);
      frag.append(span);
    });
    node.replaceWith(frag);
  });
  return words;
}

export function initTextHighlight(el, { gsap, ScrollTrigger, language = 'airy', dim = 0.22, start = 'top 80%', end = 'bottom 55%' } = {}) {
  if (!el || !gsap || !ScrollTrigger) return noop;
  gsap.registerPlugin(ScrollTrigger);
  const lang = resolveLanguage(language);
  const mm = gsap.matchMedia();
  let words = [];

  mm.add(MOTION_OK, () => {
    const original = [...el.childNodes].map((n) => n.cloneNode(true));
    words = wrapWords(el);
    el.setAttribute('data-th-js', '');
    gsap.fromTo(
      words,
      { opacity: dim },
      {
        opacity: 1,
        ease: 'none',
        stagger: 0.1,
        scrollTrigger: { trigger: el, start, end, scrub: lang.scrub },
      }
    );
    return () => {
      el.replaceChildren(...original);
      el.removeAttribute('data-th-js');
      words = [];
    };
  });

  const full = () => words.forEach((w) => (w.style.opacity = '1'));
  window.addEventListener('beforeprint', full);
  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  return () => {
    window.removeEventListener('beforeprint', full);
    mm.revert();
  };
}
