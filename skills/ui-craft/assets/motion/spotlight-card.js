/*
 * Spotlight card pointer tracking (companion to spotlight-card.css)
 * ----------------------------------------------------------------------------
 * Communicates: see spotlight-card.css — pointer position feedback on a card.
 * Use: `import { initSpotlight } from './spotlight-card.js'; initSpotlight();`
 *   One delegated listener per container handles every [data-spotlight]
 *   inside it, so grids of cards don't add a listener each.
 * Reduced motion: position still tracks (no travel animation involved).
 * Touch: skipped when the device can't hover.
 * Support: evergreen browsers; pointer events + rAF.
 */

export function initSpotlight({ root = document } = {}) {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return () => {};

  let frame = 0;
  const onMove = (event) => {
    const card = event.target.closest?.('[data-spotlight]');
    if (!card) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      card.style.setProperty('--my', `${event.clientY - rect.top}px`);
    });
  };

  root.addEventListener('pointermove', onMove, { passive: true });
  return () => root.removeEventListener('pointermove', onMove);
}
