/*
 * Story scroll — sticky visual + scrolling steps (scrollytelling engine)
 * ----------------------------------------------------------------------------
 * Communicates: "watch this happen while you read." Text steps scroll past
 *   on one side; a sticky stage on the other side advances through the
 *   story (a building rises, a route is travelled, a product assembles).
 *   Each step's text reaching the reading line moves the scene to that step.
 * Use: `npm install gsap`, load story.css, then
 *     <section class="story" data-layout="stage-right" aria-label="How we build">
 *       <div class="story__stage" aria-hidden="true"> <svg>…parts with data-step…</svg> </div>
 *       <ol class="story__steps">
 *         <li class="story__step"><div class="story__card"><h3>Ground</h3><p>…</p></div></li>
 *         …
 *       </ol>
 *     </section>
 *     import { gsap } from 'gsap';
 *     import { ScrollTrigger } from 'gsap/ScrollTrigger';
 *     import { initStoryScroll } from './story-scroll.js';
 *     const cleanup = initStoryScroll(section, { gsap, ScrollTrigger, language: 'weighty' });
 *   Options:
 *     language  preset name or object (languages.js)          default 'precise'
 *     mode      'scrub' — the scene tracks scroll position     default 'scrub'
 *               'play'  — each step plays its part in full when reached
 *                         (no half-built states; better for complex art)
 *     timeline  a GSAP timeline, or (stage, { gsap, language, steps }) => timeline,
 *               for scenes buildScene can't express (path-journey, custom).
 *               Labels `step-i` / `end` are used when present, otherwise the
 *               timeline is split evenly.
 *     onStep(i) / onProgress(p 0..1)  hooks; use adapters.js to drive a
 *               Lottie, Rive, video or three.js stage from onProgress.
 *     anchor    reading line as a fraction of viewport height  default 0.6
 *   Sets on the section: `data-story-js`, `data-story-step="i"`,
 *   `--story-progress`; on the active step: `data-active`, `aria-current="step"`.
 * Reduced motion: no scrubbing or tweening. The stage starts on step one's
 *   finished picture, and when a step becomes active the scene jumps to that
 *   step's finished state — the story is still told, as a sequence of stills.
 * Mobile / portrait tablet (< 60rem): story.css puts the stage at the top (sticky, ~45svh) with the
 *   steps scrolling beneath it; this script behaves the same at every width.
 * Never-invisible: the stage markup is the finished picture and every step
 *   is fully opaque without JS; hiding happens only after `data-story-js`
 *   is set. Before printing, the scene jumps to its end.
 * Accessibility: the steps carry the meaning; mark a purely illustrative
 *   stage `aria-hidden="true"`. Nothing is announced on step change.
 * Support: GSAP 3.12+ with ScrollTrigger (injected). Returns a cleanup function.
 */

import { resolveLanguage } from './languages.js';
import { buildScene, restoreCounts } from './scene.js';

const MOTION_OK = '(prefers-reduced-motion: no-preference)';
const REDUCED = '(prefers-reduced-motion: reduce)';
const noop = () => {};

/** Time (in timeline seconds) at fractional step position `s` (0 … steps). */
export function timeAtStep(tl, s, steps) {
  const labelTime = (i) => {
    if (i >= steps) return tl.labels.end ?? tl.duration();
    const t = tl.labels[`step-${i}`];
    return t ?? (tl.duration() * i) / steps;
  };
  const i = Math.max(0, Math.min(steps, Math.floor(s)));
  if (i >= steps) return labelTime(steps);
  return labelTime(i) + (labelTime(i + 1) - labelTime(i)) * (s - i);
}

/** Map a distance `y` scrolled through the steps list to a fractional step, given step top offsets + total height. */
export function stepAtOffset(offsets, y) {
  const n = offsets.length - 1;
  if (n <= 0) return 0;
  if (y <= offsets[0]) return 0;
  for (let i = 0; i < n; i += 1) {
    if (y < offsets[i + 1]) {
      const span = offsets[i + 1] - offsets[i] || 1;
      return i + (y - offsets[i]) / span;
    }
  }
  return n;
}

export function initStoryScroll(section, options = {}) {
  const { gsap, ScrollTrigger, language = 'precise', mode = 'scrub', timeline, onStep, onProgress, anchor = 0.6 } = options;
  if (!section || !gsap || !ScrollTrigger) return noop;
  const stage = section.querySelector('.story__stage');
  const list = section.querySelector('.story__steps');
  const steps = [...section.querySelectorAll('.story__step')];
  if (!list || !steps.length) return noop;

  gsap.registerPlugin(ScrollTrigger);
  const lang = resolveLanguage(language);
  const line = `${Math.round(anchor * 100)}%`;
  const count = steps.length;
  let tl = null;
  let active = -1;

  const makeTimeline = () => {
    if (typeof timeline === 'function') return timeline(stage, { gsap, language: lang, steps: count });
    if (timeline) return timeline;
    return buildScene(stage, { gsap, language: lang, steps: count });
  };

  const emit = () => {
    if (!tl) return;
    const p = tl.duration() ? tl.time() / tl.duration() : 0;
    section.style.setProperty('--story-progress', p.toFixed(4));
    if (onProgress) onProgress(p);
  };

  const setActive = (i) => {
    if (i === active) return;
    active = i;
    steps.forEach((step, k) => {
      step.toggleAttribute('data-active', k === i);
      if (k === i) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
    section.setAttribute('data-story-step', String(i));
    if (onStep) onStep(i);
  };

  // One trigger per step, used by play mode and reduced motion.
  const stepTriggers = (onEnterStep, onBeforeFirst) =>
    steps.map((step, i) =>
      ScrollTrigger.create({
        trigger: step,
        start: `top ${line}`,
        end: `bottom ${line}`,
        onToggle: (self) => self.isActive && onEnterStep(i),
        onLeaveBack: i === 0 ? onBeforeFirst : undefined,
      })
    );

  const mm = gsap.matchMedia();

  mm.add(MOTION_OK, () => {
    tl = makeTimeline();
    section.setAttribute('data-story-js', ''); // only once a timeline exists: a throwing factory leaves steps undimmed
    tl.eventCallback('onUpdate', emit);

    if (mode === 'play') {
      let tween = null;
      const playTo = (label, i) => {
        if (i !== undefined) setActive(i);
        if (tween) tween.kill();
        const target = timeAtStep(tl, label, count);
        const distance = Math.abs(target - tl.time()) / (timeAtStep(tl, 1, count) || 1);
        tween = gsap.to(tl, { time: target, duration: lang.duration * Math.min(2, Math.max(0.6, distance)), ease: 'none', onUpdate: emit });
      };
      stepTriggers((i) => playTo(i + 1, i), () => playTo(0));
      return () => tween && tween.kill();
    }

    let offsets = [];
    const measure = () => {
      const base = list.getBoundingClientRect().top;
      offsets = steps.map((s) => s.getBoundingClientRect().top - base);
      offsets.push(list.getBoundingClientRect().height);
    };
    measure();
    let scrubTween = null;
    ScrollTrigger.create({
      trigger: list,
      start: `top ${line}`,
      end: `bottom ${line}`,
      onRefresh: measure,
      onUpdate(self) {
        const s = stepAtOffset(offsets, self.progress * offsets[offsets.length - 1]);
        setActive(Math.min(count - 1, Math.floor(s)));
        scrubTween = gsap.to(tl, { time: timeAtStep(tl, s, count), duration: lang.scrub, ease: 'power2.out', overwrite: true });
      },
    });
    return () => scrubTween && scrubTween.kill();
  });

  mm.add(REDUCED, () => {
    tl = makeTimeline();
    section.setAttribute('data-story-js', ''); // only once a timeline exists: a throwing factory leaves steps undimmed
    const jump = (s, i) => {
      if (i !== undefined) setActive(i);
      tl.seek(timeAtStep(tl, s, count), true);
      emit();
    };
    // Still pictures: before the first step is reached the stage already shows step one finished,
    // so reduced-motion readers never face an empty stage.
    jump(1);
    stepTriggers((i) => jump(i + 1, i), () => jump(1));
  });

  const toEnd = () => {
    if (!tl) return;
    tl.progress(1);
    emit();
  };
  window.addEventListener('beforeprint', toEnd);
  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  return () => {
    window.removeEventListener('beforeprint', toEnd);
    mm.revert(); // kills triggers and restores the authored (finished) markup
    restoreCounts(section);
    tl = null;
    section.removeAttribute('data-story-js');
    section.removeAttribute('data-story-step');
    section.style.removeProperty('--story-progress');
    steps.forEach((step) => {
      step.removeAttribute('data-active');
      step.removeAttribute('aria-current');
    });
  };
}
