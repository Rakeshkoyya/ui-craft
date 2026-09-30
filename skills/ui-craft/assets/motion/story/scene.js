/*
 * Declarative scene timeline — annotate an SVG/HTML stage, get a story
 * ----------------------------------------------------------------------------
 * Communicates: whatever the scene shows — a building rising floor by floor,
 *   a product assembling, a chart filling in, a plant growing. The author
 *   draws the FINISHED picture and tags each part with the step it arrives
 *   on and how it arrives; this module builds the GSAP timeline.
 * Use:
 *     <svg class="story__stage-art" viewBox="0 0 600 700" aria-hidden="true">
 *       <rect data-step="0" data-enter="grow" …/>            foundation
 *       <g    data-step="1" data-enter="drop" data-order="0">  floor 1
 *       <g    data-step="1" data-enter="drop" data-order="1">  floor 2
 *       <rect data-step="2" data-enter="light" …/>           windows
 *       <g    data-step="1" data-enter="slide" data-dir="right"
 *             data-exit-step="3" data-exit="lift">            crane (leaves at the end)
 *     </svg>
 *     import { buildScene } from './scene.js';
 *     const tl = buildScene(stage, { gsap, language: 'weighty', steps: 4 });
 *     tl.tweenTo('step-2');  // or let story-scroll.js drive it
 *
 *   Attributes on any descendant of the stage:
 *     data-step="n"        step (0-based) on which the part enters. Required.
 *     data-enter="verb"    rise | drop | slide | grow | grow-x | pop | fade |
 *                          light | wipe | draw | count | move   (default: fade)
 *     data-dir="side"      side the part comes FROM for slide/wipe:
 *                          left | right | top | bottom (up/down accepted)
 *     data-origin="…"      transform-origin for grow/grow-x/pop, e.g. "50% 100%"
 *     data-from="…"        for move (or to override any verb):
 *                          "x:0 y:-120 rotate:-8 scale:.6 opacity:0"
 *     data-order="k"       parts on one step with a higher order arrive later
 *     data-exit-step="n"   step on which the part leaves (scaffolding, crane)
 *     data-exit="verb"     fade | drop | slide | lift  (default: fade)
 *
 *   Timeline: one unit of time per step. Labels `step-0` … `step-(N-1)` sit
 *   at 0 … N-1 and `end` at N, so `tl.tweenTo('step-2')` shows steps 0–1
 *   complete and `tl.tweenTo('end')` shows the whole story.
 * Reduced motion: this module only builds the timeline; callers decide how
 *   to move through it (story-scroll.js seeks label to label instantly).
 * Never-invisible: markup is the final picture. Hidden start states are set
 *   by GSAP `from` tweens only once JS runs; `tl.revert()` (or the caller's
 *   gsap.matchMedia revert) restores the authored state.
 * Performance: transform, opacity and clip-path only. `draw` animates
 *   stroke-dashoffset, which repaints — fine for a few modest paths; use
 *   `wipe` for large or many-path artwork.
 * Support: GSAP 3.12+ (injected). SVG transform-origin handled by GSAP.
 */

import { resolveLanguage } from './languages.js';

export const VERBS = ['rise', 'drop', 'slide', 'grow', 'grow-x', 'pop', 'fade', 'light', 'wipe', 'draw', 'count', 'move'];
const HIDDEN_INSET = {
  left: 'inset(0% 100% 0% 0%)',
  right: 'inset(0% 0% 0% 100%)',
  top: 'inset(0% 0% 100% 0%)',
  bottom: 'inset(100% 0% 0% 0%)',
};
const SHOWN_INSET = 'inset(0% 0% 0% 0%)';

/** Normalise a direction word to the side something comes from. */
export function normalizeDir(dir, fallback = 'left') {
  const d = String(dir || '').trim().toLowerCase();
  if (d === 'up') return 'bottom'; // moving up = coming from below
  if (d === 'down') return 'top';
  return ['left', 'right', 'top', 'bottom'].includes(d) ? d : fallback;
}

/** Parse "x:0 y:-120 rotate:-8 scale:.6 opacity:0" → { x: 0, y: -120, rotate: -8, scale: 0.6, opacity: 0 }. */
export function parseFrom(value) {
  const out = {};
  String(value || '')
    .split(/[\s,;]+/)
    .filter(Boolean)
    .forEach((pair) => {
      const [key, raw] = pair.split(':');
      if (!key || raw === undefined) return;
      const num = Number(raw);
      out[key.trim()] = Number.isFinite(num) ? num : raw.trim();
    });
  return out;
}

/** Hidden start state for an entrance verb (GSAP vars, no timing). */
export function enterFromVars(verb, { dir, origin, distance = 32 } = {}) {
  const side = normalizeDir(dir);
  switch (verb) {
    case 'rise':
      return { y: distance, opacity: 0 };
    case 'drop':
      return { y: -distance * 1.6, opacity: 0 };
    case 'slide': {
      const axis = side === 'left' || side === 'right' ? 'x' : 'y';
      const sign = side === 'left' || side === 'top' ? -1 : 1;
      return { [axis]: sign * distance * 1.5, opacity: 0 };
    }
    case 'grow':
      return { scaleY: 0, transformOrigin: origin || '50% 100%' };
    case 'grow-x':
      return { scaleX: 0, transformOrigin: origin || '0% 50%' };
    case 'pop':
      return { scale: 0, opacity: 0, transformOrigin: origin || '50% 50%' };
    case 'light':
      return { opacity: 0.12 };
    case 'wipe':
      return { clipPath: HIDDEN_INSET[side] };
    case 'draw':
      return { strokeDashoffset: 1 };
    case 'fade':
    default:
      return { opacity: 0 };
  }
}

/** End state for an exit verb. */
export function exitToVars(verb, { dir, distance = 32 } = {}) {
  const side = normalizeDir(dir, 'right');
  switch (verb) {
    case 'drop':
      return { y: distance * 1.5, opacity: 0 };
    case 'lift':
      return { y: -distance * 2.5, opacity: 0 };
    case 'slide': {
      const axis = side === 'left' || side === 'right' ? 'x' : 'y';
      const sign = side === 'left' || side === 'top' ? -1 : 1;
      return { [axis]: sign * distance * 3, opacity: 0 };
    }
    case 'fade':
    default:
      return { opacity: 0 };
  }
}

/** Split "−1,240.5 m²" into { prefix, value, decimals, suffix }; null when there is no number. */
export function parseCount(text) {
  const match = String(text).match(/^(\D*?)(-?[\d.,\s]*\d)(.*)$/s);
  if (!match) return null;
  const digits = match[2].replace(/[,\s]/g, '');
  const value = Number(digits);
  if (!Number.isFinite(value)) return null;
  const decimals = digits.includes('.') ? digits.split('.')[1].length : 0;
  return { prefix: match[1], value, decimals, suffix: match[3] };
}

const intAttr = (el, name, fallback) => {
  const n = parseInt(el.getAttribute(name), 10);
  return Number.isFinite(n) ? n : fallback;
};

/** Group parts by step, then by order: Map<step, Map<order, Element[]>>. */
export function groupParts(elements, attr = 'data-step') {
  const byStep = new Map();
  elements.forEach((el) => {
    const step = intAttr(el, attr, 0);
    const order = intAttr(el, 'data-order', 0);
    if (!byStep.has(step)) byStep.set(step, new Map());
    const byOrder = byStep.get(step);
    if (!byOrder.has(order)) byOrder.set(order, []);
    byOrder.get(order).push(el);
  });
  return byStep;
}

/** Start offsets (in step units) and duration for G ordered groups inside one step. */
export function stepTiming(groupCount, staggerSeconds = 0.08) {
  const gap = groupCount > 1 ? Math.min(staggerSeconds * 1.5, 0.6 / (groupCount - 1)) : 0;
  const duration = Math.max(0.3, 0.95 - gap * (groupCount - 1));
  return { gap, duration };
}

/** Put back the authored text (and remove added labels) of every `count` part under `root`. */
export function restoreCounts(root) {
  root.querySelectorAll('[data-count-original]').forEach((el) => {
    el.textContent = el.dataset.countOriginal;
    delete el.dataset.countOriginal;
    if ('countLabel' in el.dataset) {
      el.removeAttribute('aria-label');
      delete el.dataset.countLabel;
    }
  });
}

function addCount(tl, el, at, duration, ease) {
  // A rebuild (media query change) may run mid-count: always start from the authored text.
  const original = el.dataset.countOriginal ?? el.textContent;
  const parsed = parseCount(original);
  if (!parsed) return;
  el.dataset.countOriginal = original;
  const fmt = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: parsed.decimals,
    maximumFractionDigits: parsed.decimals,
  });
  if (!el.hasAttribute('aria-label')) {
    el.setAttribute('aria-label', original.trim());
    el.dataset.countLabel = '';
  }
  const counter = { v: 0 };
  tl.fromTo(
    counter,
    { v: 0 },
    {
      v: parsed.value,
      duration,
      ease,
      immediateRender: true,
      onUpdate() {
        el.textContent = counter.v >= parsed.value ? original : `${parsed.prefix}${fmt.format(counter.v)}${parsed.suffix}`;
      },
    },
    at
  );
}

function addEntrance(gsap, tl, el, at, duration, lang) {
  const verb = VERBS.includes(el.dataset.enter) ? el.dataset.enter : 'fade';
  const ease = verb === 'drop' || verb === 'pop' ? lang.settle : verb === 'draw' || verb === 'wipe' ? 'power1.inOut' : lang.ease;
  if (verb === 'count') {
    addCount(tl, el, at, duration, lang.ease);
    return;
  }
  const from = {
    ...enterFromVars(verb, { dir: el.dataset.dir, origin: el.dataset.origin, distance: lang.distance }),
    ...parseFrom(el.dataset.from),
  };
  if (verb === 'draw') {
    // stroke-dashoffset repaints (not compositor-only); keep draw for modest paths.
    // autoRound: false — GSAP rounds px values by default, which would snap a 0..1 offset.
    if (!el.hasAttribute('pathLength')) el.setAttribute('pathLength', '1');
    gsap.set(el, { strokeDasharray: '1 1' });
    tl.fromTo(el, from, { strokeDashoffset: 0, autoRound: false, duration, ease, immediateRender: true }, at);
    return;
  }
  if (verb === 'wipe') {
    tl.fromTo(el, from, { clipPath: SHOWN_INSET, duration, ease, immediateRender: true }, at);
    return;
  }
  tl.from(el, { ...from, duration, ease, immediateRender: true }, at);
}

/**
 * Build a paused timeline for every [data-step] part inside `stage`.
 * @param {Element} stage
 * @param {{ gsap: any, language?: string|object, steps?: number }} options
 *   steps: number of story steps (text blocks). The timeline is at least this
 *   long even if the art has fewer steps, so labels always line up with text.
 */
export function buildScene(stage, { gsap, language, steps = 0 } = {}) {
  if (!gsap) throw new Error('buildScene: pass { gsap }');
  const lang = resolveLanguage(language);
  const tl = gsap.timeline({ paused: true });
  if (!stage) return tl;

  const parts = [...stage.querySelectorAll('[data-step]')];
  const exits = [...stage.querySelectorAll('[data-exit-step]')];
  const maxStep = Math.max(-1, ...parts.map((el) => intAttr(el, 'data-step', 0)), ...exits.map((el) => intAttr(el, 'data-exit-step', 0)));
  const total = Math.max(1, steps, maxStep + 1);

  for (let i = 0; i < total; i += 1) tl.addLabel(`step-${i}`, i);
  tl.addLabel('end', total);

  groupParts(parts).forEach((byOrder, step) => {
    const orders = [...byOrder.keys()].sort((a, b) => a - b);
    const { gap, duration } = stepTiming(orders.length, lang.stagger);
    orders.forEach((order, g) => {
      byOrder.get(order).forEach((el) => addEntrance(gsap, tl, el, step + g * gap, duration, lang));
    });
  });

  groupParts(exits, 'data-exit-step').forEach((byOrder, step) => {
    const orders = [...byOrder.keys()].sort((a, b) => a - b);
    const { gap, duration } = stepTiming(orders.length, lang.stagger);
    orders.forEach((order, g) => {
      byOrder.get(order).forEach((el) => {
        const to = exitToVars(el.dataset.exit, { dir: el.dataset.dir, distance: lang.distance });
        tl.to(el, { ...to, duration: duration * 0.8, ease: lang.exitEase }, step + g * gap);
      });
    });
  });

  // Pad so the timeline is exactly `total` units long even if the last step has no parts.
  tl.set({}, {}, total);
  return tl;
}
