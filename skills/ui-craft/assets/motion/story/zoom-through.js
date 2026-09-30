/*
 * Zoom through — step inside the picture
 * ----------------------------------------------------------------------------
 * Communicates: "go deeper." A framed window (a film frame, a doorway, a
 *   product screen, a lens) grows until it fills the screen, and the next
 *   chapter appears inside it. Good as the bridge from a hero into the
 *   brand's world. Once per page.
 * Use: load zoom-through.css, then
 *     <section class="zt" aria-label="Inside the festival">
 *       <div class="zt__scene">
 *         <p class="zt__intro" data-zt-out>Ten days. Forty films.</p>
 *         <div class="zt__window"><img src="still.jpg" alt="…" width="1600" height="900"></div>
 *         <div class="zt__reveal"><h2>…</h2><p>…</p></div>
 *       </div>
 *     </section>
 *     import { initZoomThrough } from './zoom-through.js';
 *     const cleanup = initZoomThrough(section, { gsap, ScrollTrigger, language: 'cinematic' });
 *   `[data-zt-out]` elements fade away as the zoom starts. Options: length
 *   (scroll distance as a viewport multiple, default 1.5), language.
 * Reduced motion / narrow screens (< 48rem): not pinned, nothing scales —
 *   the intro, window and reveal are shown one after another.
 * Never-invisible: the authored layout (no `.zt--pinned`) shows everything;
 *   the script adds `.zt--pinned` and animates the reveal *from* hidden.
 * Performance: scales one element with transform. Use a large enough image
 *   (it ends at full-viewport size) and avoid animating filters on it.
 * Support: GSAP 3.12+ with ScrollTrigger (injected). Returns a cleanup function.
 */

import { resolveLanguage } from './languages.js';

const PINNED_OK = '(min-width: 48rem) and (prefers-reduced-motion: no-preference)';
const noop = () => {};

/** Scale factor that makes a w×h box cover a vw×vh viewport (with a small overshoot). */
export function coverScale(w, h, vw, vh, overshoot = 1.04) {
  if (!w || !h) return 1;
  return Math.max(vw / w, vh / h) * overshoot;
}

export function initZoomThrough(section, { gsap, ScrollTrigger, language = 'cinematic', length = 1.5 } = {}) {
  if (!section || !gsap || !ScrollTrigger) return noop;
  const scene = section.querySelector('.zt__scene');
  const win = section.querySelector('.zt__window');
  const reveal = section.querySelector('.zt__reveal');
  if (!scene || !win) return noop;
  gsap.registerPlugin(ScrollTrigger);
  const lang = resolveLanguage(language);
  const mm = gsap.matchMedia();

  mm.add(PINNED_OK, () => {
    section.classList.add('zt--pinned');
    const outs = section.querySelectorAll('[data-zt-out]');
    const tl = gsap.timeline({
      defaults: { ease: lang.ease },
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => `+=${window.innerHeight * length}`,
        pin: true,
        scrub: lang.scrub,
        invalidateOnRefresh: true,
      },
    });
    if (outs.length) tl.to(outs, { opacity: 0, y: -lang.distance * 0.5, duration: 0.25 }, 0);
    tl.to(win, { scale: () => coverScale(win.offsetWidth, win.offsetHeight, window.innerWidth, window.innerHeight), duration: 0.8 }, 0);
    // The reveal lands before the zoom ends, then holds for the last third of the pin, so fast
    // scrolling (and scrub lag) can't carry the reader past it while it is still invisible.
    if (reveal) tl.from(reveal, { opacity: 0, y: lang.distance * 0.5, duration: 0.3, immediateRender: true }, 0.45);
    tl.set({}, {}, 1.2);
    return () => section.classList.remove('zt--pinned');
  });

  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  return () => mm.revert();
}
