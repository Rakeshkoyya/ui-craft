/*
 * Path journey — a route drawn by scroll, with a traveller and stops
 * ----------------------------------------------------------------------------
 * Communicates: "this is how it got here." A line draws across a map or
 *   diagram while a marker travels it; stops light up as it passes. For
 *   origin stories, supply chains, delivery routes, a founder's journey, a
 *   customer's path through a service.
 * Use: `npm install gsap` (MotionPathPlugin ships in the free package), then
 *     <svg class="journey" viewBox="0 0 800 500" aria-hidden="true">
 *       <path class="journey__route" d="M40 420 C 200 300 …" />
 *       <g class="journey__stop" data-stop="0.35"><circle …/><text …>Kandy</text></g>
 *       <g class="journey__marker" transform="translate(760 80)"><circle r="9"/></g>  ← authored at the END
 *     </svg>
 *   As a stage inside story-scroll.js (steps and stops line up):
 *     import { buildJourney } from './path-journey.js';
 *     initStoryScroll(section, { gsap, ScrollTrigger, language: 'organic',
 *       timeline: (stage, o) => buildJourney(stage, { gsap, MotionPathPlugin, ...o }) });
 *   Standalone, with its own ScrollTrigger:
 *     initPathJourney(svg, { gsap, ScrollTrigger, MotionPathPlugin, language: 'organic' });
 *   data-stop="f": fraction (0..1) of the route at which the stop activates.
 *   Timeline labels: `step-i` / `end` (one unit per step; default steps = stops).
 * Reduced motion: standalone mode doesn't animate — route, stops and marker
 *   stay as authored (fully drawn, marker at the end). Inside story-scroll,
 *   the engine jumps step to step instead.
 * Mobile: scales with its viewBox; keep labels ≥ 14 px at 390 px wide.
 * Never-invisible: markup is the finished journey (route drawn, marker at the
 *   destination, stops visible); GSAP sets start states only once JS runs.
 * Performance: the route draw animates stroke-dashoffset (repaints) — fine
 *   for one path; the marker and stops use transform/opacity.
 * Support: GSAP 3.12+ with ScrollTrigger + MotionPathPlugin (injected).
 */

import { resolveLanguage } from './languages.js';

const MOTION_OK = '(prefers-reduced-motion: no-preference)';
const noop = () => {};

export function buildJourney(svg, { gsap, MotionPathPlugin, language = 'organic', steps = 0 } = {}) {
  if (!gsap) throw new Error('buildJourney: pass { gsap, MotionPathPlugin }');
  const tl = gsap.timeline({ paused: true });
  const route = svg && svg.querySelector('.journey__route');
  if (!route) return tl;
  if (MotionPathPlugin) gsap.registerPlugin(MotionPathPlugin);
  const lang = resolveLanguage(language);
  const stops = [...svg.querySelectorAll('[data-stop]')];
  const total = Math.max(1, steps || stops.length || 1);

  for (let i = 0; i < total; i += 1) tl.addLabel(`step-${i}`, i);
  tl.addLabel('end', total);

  // stroke-dashoffset repaints; acceptable for a single route path.
  if (!route.hasAttribute('pathLength')) route.setAttribute('pathLength', '1');
  gsap.set(route, { strokeDasharray: '1 1' });
  // autoRound: false — GSAP rounds px values by default, which would snap the 0..1 offset.
  tl.fromTo(route, { strokeDashoffset: 1 }, { strokeDashoffset: 0, autoRound: false, duration: total, ease: 'none', immediateRender: true }, 0);

  const marker = svg.querySelector('.journey__marker');
  if (marker && MotionPathPlugin) {
    tl.to(marker, { motionPath: { path: route, align: route, alignOrigin: [0.5, 0.5] }, duration: total, ease: 'none', immediateRender: true }, 0);
  }

  stops.forEach((stop) => {
    const at = Math.min(0.999, Math.max(0, Number(stop.dataset.stop) || 0)) * total;
    tl.from(stop, { opacity: 0.25, scale: 0.6, transformOrigin: '50% 50%', duration: Math.min(0.5, lang.duration * 0.4), ease: lang.settle, immediateRender: true }, at);
  });

  tl.set({}, {}, total);
  return tl;
}

export function initPathJourney(svg, { gsap, ScrollTrigger, MotionPathPlugin, language = 'organic', trigger, start = 'top 75%', end = 'bottom 35%' } = {}) {
  if (!svg || !gsap || !ScrollTrigger) return noop;
  gsap.registerPlugin(ScrollTrigger);
  const lang = resolveLanguage(language);
  const mm = gsap.matchMedia();
  let tl = null;
  mm.add(MOTION_OK, () => {
    tl = buildJourney(svg, { gsap, MotionPathPlugin, language: lang });
    ScrollTrigger.create({ trigger: trigger || svg, start, end, scrub: lang.scrub, animation: tl });
  });
  const toEnd = () => tl && tl.progress(1);
  window.addEventListener('beforeprint', toEnd);
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  return () => {
    window.removeEventListener('beforeprint', toEnd);
    mm.revert();
    tl = null;
  };
}
