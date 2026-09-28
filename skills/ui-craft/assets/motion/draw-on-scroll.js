/*
 * Draw on scroll — JS driver (companion to draw-on-scroll.css)
 * ----------------------------------------------------------------------------
 * Communicates: same as the CSS file — a line that draws as the story moves.
 * Use: `import { initDraw } from './draw-on-scroll.js'; initDraw();`
 *   - `[data-draw="once"]`: IntersectionObserver sets --draw-progress to 1 the
 *     first time the figure is in view; CSS transitions the stroke. Unobserved
 *     afterwards (no replay).
 *   - `[data-draw]` / `[data-draw="wipe"]` in engines WITHOUT
 *     `animation-timeline: view()`: an IntersectionObserver switches a single
 *     passive, rAF-throttled scroll handler on only while a figure is on
 *     screen, and writes --draw-progress (0..1) with the same range as the CSS
 *     (entry 30% -> cover 60%). Where CSS handles it, this does nothing.
 * Never-invisible: lines are only hidden after this script adds `.draw-js`
 *   to <html> and `data-draw-js` to a figure; before printing, every figure
 *   is set to fully drawn.
 * Reduced motion: returns immediately — lines are shown fully drawn.
 * Support: IntersectionObserver + rAF (evergreen). Returns a cleanup function.
 */

const clamp01 = (n) => Math.min(1, Math.max(0, n));

// Mirrors `animation-range: entry 30% cover 60%` for a figure of height h.
function scrubProgress(el) {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const start = vh - 0.3 * rect.height;
  const span = 0.6 * vh + 0.3 * rect.height;
  return clamp01((start - rect.top) / span);
}

const setProgress = (el, p) => el.style.setProperty('--draw-progress', p.toFixed(4));

function initOnce(figures, cleanups) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        setProgress(entry.target, 1);
        io.unobserve(entry.target);
      }
    },
    { threshold: 0.35 }
  );
  figures.forEach((el) => io.observe(el));
  cleanups.push(() => io.disconnect());
}

function initScrub(figures, cleanups) {
  const visible = new Set();
  let frame = 0;
  const update = () => {
    frame = 0;
    visible.forEach((el) => setProgress(el, scrubProgress(el)));
  };
  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target);
      else {
        setProgress(entry.target, scrubProgress(entry.target));
        visible.delete(entry.target);
      }
    }
    onScroll();
  });
  figures.forEach((el) => {
    setProgress(el, scrubProgress(el));
    io.observe(el);
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  cleanups.push(() => {
    io.disconnect();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    if (frame) cancelAnimationFrame(frame);
  });
}

export function initDraw({ root = document } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  if (!('IntersectionObserver' in window)) return () => {};

  const all = [...root.querySelectorAll('[data-draw]')];
  const once = all.filter((el) => el.dataset.draw === 'once');
  const cssScrubs = CSS.supports('animation-timeline: view()');
  const scrubs = cssScrubs ? [] : all.filter((el) => el.dataset.draw !== 'once');
  const managed = [...once, ...scrubs];
  if (!managed.length) return () => {};

  const cleanups = [];
  managed.forEach((el) => el.setAttribute('data-draw-js', ''));
  document.documentElement.classList.add('draw-js');
  if (once.length) initOnce(once, cleanups);
  if (scrubs.length) initScrub(scrubs, cleanups);

  const drawAll = () => managed.forEach((el) => setProgress(el, 1));
  window.addEventListener('beforeprint', drawAll);

  return () => {
    cleanups.forEach((fn) => fn());
    window.removeEventListener('beforeprint', drawAll);
    managed.forEach((el) => el.removeAttribute('data-draw-js'));
    document.documentElement.classList.remove('draw-js');
  };
}
