/*
 * Reveal on scroll — reveal once (companion to reveal-on-scroll.css and
 * image-reveal-clip.css)
 * ----------------------------------------------------------------------------
 * Communicates: "content arrives as you reach it". Each element is revealed
 *   the first time it enters the viewport, then unobserved: no replay on
 *   scroll-up (replaying entrances feels busy and hides content from anyone
 *   scrolling back to re-read).
 * Use: `import { initReveal } from './reveal-on-scroll.js'; initReveal();`
 *   Targets: `[data-reveal]` and `[data-reveal-clip]` by default. Items inside
 *   `[data-reveal-group]` get `--reveal-index` so they stagger (capped at 8).
 *   Pair with the inline <head> gate from reveal-on-scroll.css; if it is
 *   missing, this script opens the gate itself (content can then flash
 *   visible -> hidden for a frame above the fold, so prefer the inline gate).
 * Never-invisible: the script marks <html> `.reveal-live` so the inline
 *   timeout knows the observer is running; without IntersectionObserver or
 *   under reduced motion it removes `.reveal-ready`, showing everything. Before
 *   printing, everything is revealed.
 * Reduced motion: removes the gate and returns; content is static and visible.
 * Returns a cleanup function (SPA route changes).
 * Support: IntersectionObserver is Baseline since 2019. No dependencies.
 */

const STAGGER_CAP = 8;
const GATE = 'reveal-ready';
const LIVE = 'reveal-live';

export function initReveal({
  root = document,
  selector = '[data-reveal], [data-reveal-clip]',
  rootMargin = '0px 0px -10% 0px',
  threshold = 0.1,
} = {}) {
  const html = document.documentElement;
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || !('IntersectionObserver' in window)) {
    html.classList.remove(GATE);
    return () => {};
  }

  root.querySelectorAll('[data-reveal-group]').forEach((group) => {
    group.querySelectorAll(selector).forEach((el, i) => {
      el.style.setProperty('--reveal-index', String(Math.min(i, STAGGER_CAP)));
    });
  });

  const targets = [...root.querySelectorAll(selector)];
  const reveal = (el) => el.classList.add('is-revealed');

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        reveal(entry.target);
        observer.unobserve(entry.target);
      }
    },
    { rootMargin, threshold }
  );

  const revealAll = () => targets.forEach(reveal);
  window.addEventListener('beforeprint', revealAll);

  html.classList.add(GATE, LIVE);
  targets.forEach((el) => observer.observe(el));

  return () => {
    observer.disconnect();
    window.removeEventListener('beforeprint', revealAll);
    html.classList.remove(GATE, LIVE);
  };
}
