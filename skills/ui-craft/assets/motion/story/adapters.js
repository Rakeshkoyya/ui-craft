/*
 * Progress adapters — drive a non-SVG stage from story progress
 * ----------------------------------------------------------------------------
 * Communicates: nothing by itself. Lets the SAME story engine
 *   (story-scroll.js, chapters, your own ScrollTrigger) move a Lottie file,
 *   a Rive state machine, a scrubbed video, or a three.js scene, so the medium
 *   can be chosen per brand without changing the scroll logic.
 * Use: each adapter returns `(progress: number 0..1) => void`; pass it as
 *   `onProgress`:
 *     initStoryScroll(section, { gsap, ScrollTrigger, onProgress: lottieScrub(player) });
 *   With a stage that has no [data-step] parts, story-scroll still builds an
 *   empty timeline of the right length, so progress flows through.
 * Reduced motion: story-scroll jumps step to step, so adapters receive
 *   discrete progress values (still pictures), not a scrub.
 * Never-invisible: give Lottie/Rive/canvas stages a static poster (an <img>
 *   underneath, or the first frame) so something shows before load and when
 *   scripts fail.
 * Support: APIs checked 2026-09-30 against the published type definitions of
 *   @lottiefiles/dotlottie-web 0.80.0 (`totalFrames`, `setFrame(frame)`,
 *   `isLoaded`, `addEventListener('load', …)`) and @rive-app/canvas 2.43.1
 *   (`rive.stateMachineInputs(name)` → StateMachineInput[] with a settable
 *   `value`). Re-check if you install a different major version.
 */

const clamp01 = (n) => Math.min(1, Math.max(0, Number(n) || 0));

/**
 * Scrub a <video> by progress.
 * Encode for scrubbing or seeking will stutter: every frame (or every few) a keyframe, e.g.
 *   ffmpeg -i in.mp4 -an -c:v libx264 -g 1 -crf 22 -movflags +faststart scrub.mp4
 * Mark the video `muted playsinline preload="auto"` and never autoplay it.
 * @param {HTMLVideoElement} video
 * @returns {(progress: number) => void}
 */
export function videoScrub(video) {
  let pending = null;
  let frame = 0;
  const apply = () => {
    frame = 0;
    if (pending === null || !video.duration) return;
    // Stay a hair before the end: seeking to exactly `duration` shows a black frame in some engines.
    video.currentTime = pending * Math.max(0, video.duration - 0.05);
  };
  return (progress) => {
    pending = clamp01(progress);
    if (!frame) frame = requestAnimationFrame(apply);
  };
}

/**
 * Scrub a dotLottie player (@lottiefiles/dotlottie-web) by progress.
 *   const player = new DotLottie({ canvas, src: '/scene.lottie', autoplay: false, loop: false });
 * Progress that arrives before the file loads is applied on 'load'.
 * @param {{ totalFrames: number, isLoaded: boolean, setFrame: (f: number) => unknown, addEventListener: Function }} player
 * @returns {(progress: number) => void}
 */
export function lottieScrub(player) {
  let last = 0;
  const apply = () => {
    if (!player.isLoaded || !player.totalFrames) return;
    player.setFrame(Math.round(last * (player.totalFrames - 1)));
  };
  player.addEventListener('load', apply);
  return (progress) => {
    last = clamp01(progress);
    apply();
  };
}

/**
 * Feed progress into a Rive state-machine number input.
 *   const rive = new Rive({ src, canvas, stateMachines: 'Story', autoplay: true,
 *     onLoad: () => { input = rive.stateMachineInputs('Story').find(i => i.name === 'progress'); } });
 * The designer maps the input (0..scale) to the scene inside Rive.
 * @param {{ value: number } | (() => ({ value: number } | undefined))} input  the input, or a getter while it loads
 * @param {number} [scale=100]  input range the Rive file expects (0..scale)
 * @returns {(progress: number) => void}
 */
export function riveNumberInput(input, scale = 100) {
  return (progress) => {
    const target = typeof input === 'function' ? input() : input;
    if (target) target.value = clamp01(progress) * scale;
  };
}

/**
 * Wrap any renderer (three.js camera path, canvas drawing, CSS variable).
 *   onProgress: callback((p) => { camera.position.z = 10 - p * 6; renderer.render(scene, camera); })
 * Calls are coalesced to one per animation frame.
 * @param {(progress: number) => void} fn
 * @returns {(progress: number) => void}
 */
export function callback(fn) {
  let pending = 0;
  let frame = 0;
  return (progress) => {
    pending = clamp01(progress);
    if (!frame) {
      frame = requestAnimationFrame(() => {
        frame = 0;
        fn(pending);
      });
    }
  };
}

/** Combine several adapters: onProgress: all(lottieScrub(a), callback(b)). */
export function all(...adapters) {
  return (progress) => adapters.forEach((fn) => fn(progress));
}
