/*
 * GSAP ScrollTrigger — pinned section with horizontal scroll
 * ----------------------------------------------------------------------------
 * Communicates: "this is a sequence." A row of panels (process steps, a case
 *   study timeline, a product tour) is pinned while vertical scrolling moves
 *   it sideways, so the reader moves through chapters without losing place.
 *   Use at most once or twice per page — pinning hijacks the reader's sense
 *   of how far the page goes.
 * Use: `npm install gsap` (all plugins incl. ScrollTrigger ship in the free
 *   `gsap` package since v3.13).
 *     <section class="h-scroll" aria-label="How it works">
 *       <div class="h-scroll__track"> <article class="h-scroll__panel">…</article> … </div>
 *     </section>
 *     import { initHorizontalScroll } from './gsap-pinned-horizontal.js';
 *     const cleanup = initHorizontalScroll(document.querySelector('.h-scroll'));
 *   CSS: .h-scroll { overflow: clip; } .h-scroll__track { display: flex; width: max-content; }
 *        .h-scroll__panel { width: min(80vw, 56rem); flex: none; }
 * Reduced motion / small screens: gsap.matchMedia() only builds the pinned
 *   version for (prefers-reduced-motion: no-preference) and >= 48rem wide.
 *   Otherwise the track becomes a normal native horizontal scroller
 *   (scroll-snap, keyboard- and touch-friendly) — no pinning, no scrubbing.
 * Keyboard: panels stay in DOM order; focusable content inside a panel is
 *   reachable by Tab, and the page scrolls to it natively.
 * Support: all evergreen browsers. With Lenis, also load lenis-gsap.js.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const WIDE_AND_MOTION_OK = '(min-width: 48rem) and (prefers-reduced-motion: no-preference)';
const FALLBACK = '(max-width: 47.99rem), (prefers-reduced-motion: reduce)';

export function initHorizontalScroll(section) {
  const track = section.querySelector('.h-scroll__track');
  if (!track) return () => {};

  const mm = gsap.matchMedia();

  mm.add(WIDE_AND_MOTION_OK, () => {
    const distance = () => track.scrollWidth - section.clientWidth;

    gsap.to(track, {
      x: () => -distance(),
      ease: 'none', // scrubbed: position maps 1:1 to scroll, easing would feel like lag
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 0.6, // small smoothing so trackpad jitter doesn't show
        invalidateOnRefresh: true, // recompute on resize / font load
        anticipatePin: 1,
      },
    });
  });

  mm.add(FALLBACK, () => {
    section.style.overflowX = 'auto';
    section.style.scrollSnapType = 'x mandatory';
    track.querySelectorAll('.h-scroll__panel').forEach((p) => (p.style.scrollSnapAlign = 'start'));
    return () => {
      section.style.overflowX = '';
      section.style.scrollSnapType = '';
      track.querySelectorAll('.h-scroll__panel').forEach((p) => (p.style.scrollSnapAlign = ''));
    };
  });

  // Recalculate once web fonts have changed text widths.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  return () => mm.revert();
}
