/*
 * Scroll progress bar — fallback driver (companion to scroll-progress-bar.css)
 * ----------------------------------------------------------------------------
 * Communicates: reading position, same as the CSS file.
 * Use: `import { initScrollProgress } from './scroll-progress-bar.js';
 *   initScrollProgress();` It does nothing where the CSS scroll() timeline is
 *   running. Otherwise (no scroll-timeline support, or reduced motion, where
 *   the CSS animation is switched off) it writes `--scroll-progress` (0..1)
 *   from one passive, rAF-throttled scroll listener.
 * Reduced motion: the bar still tracks scroll position via this script (it
 *   moves only with the user's own scrolling); no animation is created.
 * Support: evergreen browsers. Returns a cleanup function.
 */

export function initScrollProgress({ selector = '.scroll-progress' } = {}) {
  const bar = document.querySelector(selector);
  if (!bar) return () => {};

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced && CSS.supports('animation-timeline: scroll()')) return () => {};

  const scroller = document.scrollingElement || document.documentElement;
  let frame = 0;
  const update = () => {
    frame = 0;
    const max = scroller.scrollHeight - scroller.clientHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, scroller.scrollTop / max)) : 0;
    bar.style.setProperty('--scroll-progress', progress.toFixed(4));
  };
  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    if (frame) cancelAnimationFrame(frame);
  };
}
