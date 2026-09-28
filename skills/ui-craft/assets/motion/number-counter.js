/*
 * Number counter (count up when scrolled into view)
 * ----------------------------------------------------------------------------
 * Communicates: magnitude — "this number is big / grew". Use for 2-4 key
 *   stats in a proof section. Don't use for prices, dates, or values the user
 *   must read precisely, and don't run it on every number on the page.
 * Use: `<span data-count-to="12400" data-count-format="compact">12,400</span>`
 *     import { initCounters } from './number-counter.js'; initCounters();
 *   Write the FINAL value in the HTML: without JS, with reduced motion, and
 *   for crawlers the real number is there. Formatting uses Intl.NumberFormat
 *   with the page's <html lang>; data-count-format: "standard" | "compact" |
 *   "percent" (value 0-1). Optional data-count-decimals.
 * Layout: reserve width with `font-variant-numeric: tabular-nums` and an
 *   inline-block min-width so digits changing don't jiggle neighbours.
 * Screen readers: before counting, the element is aria-hidden and a
 *   visually-hidden sibling carries the final value, so assistive tech reads
 *   "12.4K" once instead of a stream of intermediate numbers.
 * Reduced motion: no counting; the final number is shown as written.
 * Support: evergreen browsers (IntersectionObserver, Intl, rAF).
 */

const DURATION_MS = 1200;
const easeOutExpo = (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t));

function formatterFor(el) {
  const locale = document.documentElement.lang || undefined;
  const decimals = Number(el.dataset.countDecimals ?? 0);
  const kind = el.dataset.countFormat || 'standard';
  const options = { maximumFractionDigits: decimals, minimumFractionDigits: decimals };
  if (kind === 'compact') Object.assign(options, { notation: 'compact' });
  if (kind === 'percent') Object.assign(options, { style: 'percent' });
  return new Intl.NumberFormat(locale, options);
}

function run(el) {
  const target = Number(el.dataset.countTo);
  if (!Number.isFinite(target)) return;
  const fmt = formatterFor(el);
  const finalText = fmt.format(target);
  const spoken = document.createElement('span');
  spoken.textContent = finalText;
  spoken.style.cssText =
    'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap';
  el.after(spoken);
  el.setAttribute('aria-hidden', 'true');
  const start = performance.now();

  const step = (now) => {
    const t = Math.min(1, (now - start) / DURATION_MS);
    el.textContent = fmt.format(target * easeOutExpo(t));
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = finalText;
  };
  requestAnimationFrame(step);
}

export function initCounters({ root = document } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.unobserve(entry.target);
        run(entry.target);
      }
    },
    { threshold: 0.6 }
  );
  root.querySelectorAll('[data-count-to]').forEach((el) => io.observe(el));
  return () => io.disconnect();
}
