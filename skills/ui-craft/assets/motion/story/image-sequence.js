/*
 * Image sequence — scrub a rendered frame sequence on canvas
 * ----------------------------------------------------------------------------
 * Communicates: "turn it over in your hands." A product rotates, a machine
 *   opens, a drink pours — frame-accurate and tied to scroll, the way
 *   flagship product pages do it. Needs a real render or video export
 *   (60–180 frames, WebP/AVIF, ~1600 px wide). Don't fake it with 8 frames.
 * Use (standalone, with its own ScrollTrigger):
 *     <div class="seq"><img class="seq__poster" src="f/000.webp" alt="…" width="1600" height="1000">
 *       <canvas class="seq__canvas" aria-hidden="true"></canvas></div>
 *     import { initImageSequence } from './image-sequence.js';
 *     const cleanup = initImageSequence(wrapper, {
 *       gsap, ScrollTrigger, canvas, count: 120,
 *       frames: (i) => `/f/${String(i).padStart(3, '0')}.webp`,
 *       pin: true, length: 2,   // the poster is the <img> in the markup
 *     });
 *   Or as a story-scroll stage (the story engine owns the scroll):
 *     const seq = createImageSequence({ canvas, count, frames });
 *     initStoryScroll(section, { gsap, ScrollTrigger, onProgress: seq.render });
 *     // later: seq.destroy()
 *   Stack the canvas over the poster <img> (same box, canvas absolutely
 *   positioned); the canvas stays transparent until the first frame draws.
 * Loading: frames load progressively — every 8th first so scrubbing works
 *   early, then the rest. Rendering picks the nearest loaded frame.
 * Mobile (< 48rem): every 2nd frame only (half the bytes).
 * Reduced motion: frames are not loaded; the poster image is all that shows.
 * Never-invisible: the poster <img> is in the markup with real alt text; the
 *   canvas is decorative (aria-hidden) and only draws over it.
 * Support: canvas 2D, Image.decode (evergreen). GSAP injected for the
 *   standalone mode. Returns a cleanup function.
 */

const MOTION_OK = '(prefers-reduced-motion: no-preference)';
const SMALL = '(max-width: 47.99rem)';
const noop = () => {};

/** Load order: every `stride`-th frame first, then the rest (only frames on the `step` grid). */
export function loadOrder(count, step = 1, stride = 8) {
  const all = [];
  for (let i = 0; i < count; i += step) all.push(i);
  const first = all.filter((i) => i % stride === 0);
  return [...first, ...all.filter((i) => i % stride !== 0)];
}

/** Draw rectangle that makes an iw×ih image cover a cw×ch canvas. */
export function coverRect(iw, ih, cw, ch) {
  const scale = Math.max(cw / iw, ch / ih);
  const w = iw * scale;
  const h = ih * scale;
  return { x: (cw - w) / 2, y: (ch - h) / 2, w, h };
}

export function createImageSequence({ canvas, count, frames, step } = {}) {
  if (!canvas || !count || typeof frames !== 'function') return { render: noop, destroy: noop };
  // Reduced motion: keep the poster, load nothing (also when called directly for story-scroll).
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return { render: noop, destroy: noop };
  const ctx = canvas.getContext('2d');
  const stride = step || (matchMedia(SMALL).matches ? 2 : 1);
  const images = new Map();
  let alive = true;
  let target = 0;
  let drawn = -1;
  let frame = 0;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    drawn = -1;
    draw();
  };

  const nearestLoaded = (i) => {
    for (let d = 0; d < count; d += 1) {
      if (images.get(i - d)?.complete) return i - d;
      if (images.get(i + d)?.complete) return i + d;
    }
    return -1;
  };

  function draw() {
    frame = 0;
    const i = nearestLoaded(target);
    if (i < 0 || i === drawn) return;
    const img = images.get(i);
    const r = coverRect(img.naturalWidth, img.naturalHeight, canvas.width, canvas.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, r.x, r.y, r.w, r.h);
    drawn = i;
  }

  const load = async (order) => {
    for (const i of order) {
      if (!alive) return;
      const img = new Image();
      img.decoding = 'async';
      img.src = frames(i);
      try {
        await img.decode();
      } catch {
        continue; // a missing frame is skipped; the nearest loaded one is drawn instead
      }
      if (!alive) return;
      images.set(i, img);
      if (Math.abs(i - target) <= stride * 8) draw();
    }
  };

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  load(loadOrder(count, stride));

  return {
    render(progress) {
      const p = Math.min(1, Math.max(0, Number(progress) || 0));
      target = Math.round((p * (count - 1)) / stride) * stride;
      if (!frame) frame = requestAnimationFrame(draw);
    },
    destroy() {
      alive = false;
      ro.disconnect();
      if (frame) cancelAnimationFrame(frame);
      images.clear();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}

export function initImageSequence(wrapper, { gsap, ScrollTrigger, canvas, count, frames, pin = false, length = 1.5, start = 'top top' } = {}) {
  if (!wrapper || !gsap || !ScrollTrigger || !canvas) return noop;
  gsap.registerPlugin(ScrollTrigger);
  const mm = gsap.matchMedia();
  mm.add(MOTION_OK, () => {
    const seq = createImageSequence({ canvas, count, frames });
    ScrollTrigger.create({
      trigger: wrapper,
      start: pin ? start : 'top bottom',
      end: pin ? () => `+=${window.innerHeight * length}` : 'bottom top',
      pin,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => seq.render(self.progress),
    });
    seq.render(0);
    return () => seq.destroy();
  });
  // Reduced motion: nothing to do — the poster <img> under the canvas is the picture.
  return () => mm.revert();
}
