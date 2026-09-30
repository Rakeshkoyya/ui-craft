/*
 * Before / after — a transformation revealed by scroll, then handed to the reader
 * ----------------------------------------------------------------------------
 * Communicates: "this is what we changed." As the figure crosses the viewport
 *   the "after" picture wipes across the "before"; a range control then lets
 *   the reader compare at their own pace (and takes over from scroll).
 * Use: load before-after.css, then
 *     <figure class="ba" data-ba-label="Compare the kitchen before and after">
 *       <div class="ba__before"><img src="before.jpg" alt="Kitchen before: …" width="1600" height="1000"></div>
 *       <div class="ba__after"><img src="after.jpg" alt="Kitchen after: …" width="1600" height="1000"></div>
 *       <figcaption>…</figcaption>
 *     </figure>
 *     import { initBeforeAfter } from './before-after.js';
 *     const cleanup = initBeforeAfter(figure, { gsap, ScrollTrigger, language: 'airy' });
 *   The script adds a divider and a labelled <input type="range">. Position
 *   lives in `--ba-pos` (0%–100%, the share of the width showing "after").
 * Reduced motion: no scroll scrub; the figure starts at 50% and the range
 *   control is the only way to move it.
 * Mobile: identical; the range input doubles as a touch drag target.
 * Never-invisible: without JS the figure shows a 50/50 split (both images
 *   visible, alt text on both).
 * Keyboard: the range is focusable (arrow keys, Home/End); focus shows on the
 *   divider handle.
 * Support: clip-path inset (Baseline); GSAP 3.12+ with ScrollTrigger (injected).
 */

import { resolveLanguage } from './languages.js';

const MOTION_OK = '(prefers-reduced-motion: no-preference)';
const REDUCED = '(prefers-reduced-motion: reduce)';
const noop = () => {};

export function initBeforeAfter(figure, { gsap, ScrollTrigger, language = 'precise', from = 4, to = 96 } = {}) {
  if (!figure || !gsap || !ScrollTrigger) return noop;
  gsap.registerPlugin(ScrollTrigger);
  const lang = resolveLanguage(language);

  const divider = document.createElement('div');
  divider.className = 'ba__divider';
  divider.setAttribute('aria-hidden', 'true');
  divider.innerHTML = '<span class="ba__handle"></span>';

  const range = document.createElement('input');
  range.type = 'range';
  range.min = '0';
  range.max = '100';
  range.step = '1';
  range.value = '50';
  range.className = 'ba__range';
  range.setAttribute('aria-label', figure.dataset.baLabel || 'Compare before and after');

  figure.append(divider, range);
  figure.setAttribute('data-ba-js', '');

  const state = { pos: 50 };
  let manual = false;
  const render = () => {
    figure.style.setProperty('--ba-pos', `${state.pos.toFixed(2)}%`);
    range.value = String(Math.round(state.pos));
    range.setAttribute('aria-valuetext', `${Math.round(state.pos)}% after`);
  };
  const onInput = () => {
    manual = true; // the reader is comparing; scroll no longer drives the split
    gsap.killTweensOf(state);
    state.pos = Number(range.value);
    render();
  };
  range.addEventListener('input', onInput);
  render();

  const mm = gsap.matchMedia();
  mm.add(MOTION_OK, () => {
    state.pos = from;
    render();
    ScrollTrigger.create({
      trigger: figure,
      start: 'top 70%',
      end: 'bottom 35%',
      onUpdate(self) {
        if (manual) return;
        gsap.to(state, { pos: from + (to - from) * self.progress, duration: lang.scrub, ease: 'power2.out', overwrite: true, onUpdate: render });
      },
    });
    return () => {
      state.pos = 50;
      render();
    };
  });
  mm.add(REDUCED, () => {
    state.pos = 50;
    render();
  });

  return () => {
    gsap.killTweensOf(state); // an in-flight scroll tween would re-render the detached figure
    mm.revert();
    range.removeEventListener('input', onInput);
    divider.remove();
    range.remove();
    figure.removeAttribute('data-ba-js');
    figure.style.removeProperty('--ba-pos');
  };
}
