/*
 * Marquee controller (companion to marquee.css)
 * ----------------------------------------------------------------------------
 * Communicates: nothing new — it makes the CSS marquee accessible and cheap:
 *   wires the Pause/Play button, makes the duplicate track inert, and pauses
 *   the loop while it is off-screen.
 * Use: `import { initMarquees } from './marquee.js'; initMarquees();`
 * Reduced motion: the CSS already stops the animation and hides the button;
 *   this script only toggles attributes, so it is harmless there.
 * Support: IntersectionObserver + `inert` (Baseline 2023).
 */

export function initMarquees(root = document) {
  const cleanups = [];

  root.querySelectorAll('[data-marquee]').forEach((marquee) => {
    marquee.querySelectorAll('.marquee__track[aria-hidden="true"]').forEach((dup) => {
      dup.inert = true;
    });

    const toggle = marquee.querySelector('.marquee__toggle');
    let userPaused = false;
    let offscreen = false;
    const sync = () => marquee.toggleAttribute('data-paused', userPaused || offscreen);

    const onToggle = () => {
      userPaused = !userPaused;
      toggle.setAttribute('aria-pressed', String(userPaused));
      toggle.textContent = userPaused ? 'Play' : 'Pause';
      sync();
    };
    toggle?.addEventListener('click', onToggle);

    const io = new IntersectionObserver(([entry]) => {
      offscreen = !entry.isIntersecting;
      sync();
    });
    io.observe(marquee);

    cleanups.push(() => {
      toggle?.removeEventListener('click', onToggle);
      io.disconnect();
    });
  });

  return () => cleanups.forEach((fn) => fn());
}
