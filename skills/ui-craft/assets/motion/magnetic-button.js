/*
 * Magnetic button (pointer-follow hover)
 * ----------------------------------------------------------------------------
 * Communicates: "this is the thing to press" — the primary CTA leans toward
 *   the cursor. Delight effect: ONE per page, on the primary action only.
 *   On anything else it reads as gimmick.
 * Use: `<a class="btn" data-magnetic href="/start">Start a project</a>`
 *     import { initMagnetic } from './magnetic-button.js'; initMagnetic();
 *   Optional `data-magnetic="0.25"` sets strength (fraction of the pointer
 *   offset, default 0.3). The label moves a bit further than the button
 *   if it is wrapped in <span data-magnetic-label>.
 *   Transform-only; the hit area does not move, so the button never slides
 *   out from under the pointer.
 * Reduced motion / touch: disabled when the user prefers reduced motion or
 *   the primary input can't hover (phones, tablets).
 * Support: evergreen browsers; uses Element.animate() (WAAPI) for the
 *   settle-back, pointer events, and rAF batching.
 */

const MAX_SHIFT_PX = 12;

export function initMagnetic({ root = document } = {}) {
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!canHover || reduce) return () => {};

  const cleanups = [...root.querySelectorAll('[data-magnetic]')].map((el) => {
    const strength = Number(el.dataset.magnetic) || 0.3;
    const label = el.querySelector('[data-magnetic-label]');
    let frame = 0;

    const apply = (x, y) => {
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (label) label.style.transform = `translate3d(${x * 0.4}px, ${y * 0.4}px, 0)`;
    };

    const onMove = (event) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        const clamp = (v) => Math.max(-MAX_SHIFT_PX, Math.min(MAX_SHIFT_PX, v * strength));
        apply(clamp(dx), clamp(dy));
      });
    };

    const onLeave = () => {
      cancelAnimationFrame(frame);
      const settle = { duration: 450, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' };
      const rest = { transform: 'translate3d(0, 0, 0)' };
      const fromEl = el.style.transform || 'none';
      const fromLabel = label?.style.transform || 'none';
      apply(0, 0);
      // Ease back to rest with WAAPI (transform-only, runs on the compositor).
      el.animate([{ transform: fromEl }, rest], settle);
      label?.animate([{ transform: fromLabel }, rest], settle);
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.style.transform = '';
      if (label) label.style.transform = '';
    };
  });

  return () => cleanups.forEach((fn) => fn());
}
