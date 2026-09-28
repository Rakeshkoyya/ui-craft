/*
 * Lenis smooth scroll (+ optional GSAP ScrollTrigger sync)
 * ----------------------------------------------------------------------------
 * Communicates: weight and continuity on scroll-storytelling pages — wheel
 *   input is eased so scrubbed animations and parallax move without steps.
 *   It does NOT belong on docs, dashboards, apps, or long reading pages:
 *   there it just makes scrolling feel slower than the user's OS setting.
 * Use: `npm install lenis`, and import 'lenis/dist/lenis.css' (the stylesheet
 *   handles html.lenis states and iframes).
 *     import { initSmoothScroll } from './lenis-gsap.js';
 *     const stop = initSmoothScroll({ gsap, ScrollTrigger }); // or initSmoothScroll()
 *   Nested scrollers (modals, code blocks, maps) need `data-lenis-prevent`.
 *   Native scroll is kept: the page still scrolls the document, so
 *   scrollbar dragging, keyboard (Space/PageDown), find-in-page, anchor links
 *   and position:sticky all keep working.
 * Reduced motion: not started at all when the user prefers reduced motion
 *   (Lenis also checks this itself); native scrolling is used.
 * Touch: Lenis leaves touch scrolling native by default (syncTouch: false) —
 *   keep it that way; phones already have good momentum scrolling.
 * Support: evergreen browsers. Known limits (Lenis docs): no CSS scroll-snap
 *   without lenis/snap, capped at 60fps in Safari, no smoothing over iframes.
 */
import Lenis from 'lenis';

export function initSmoothScroll({ gsap, ScrollTrigger } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  // With GSAP present, GSAP's ticker drives Lenis so both update in the same frame.
  const useGsapTicker = Boolean(gsap && ScrollTrigger);
  const lenis = new Lenis({
    autoRaf: !useGsapTicker,
    lerp: 0.12,   // lower = floatier. 0.1-0.15 feels smooth without "drift"
    anchors: true, // in-page anchor links scroll through Lenis instead of jumping
  });

  let tick;
  if (useGsapTicker) {
    lenis.on('scroll', ScrollTrigger.update);
    tick = (time) => lenis.raf(time * 1000); // GSAP ticker time is seconds, Lenis wants ms
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0); // avoid a jump after a long frame
  }

  return () => {
    if (tick) gsap.ticker.remove(tick);
    lenis.destroy();
  };
}
