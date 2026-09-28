/*
 * Staggered in-view entrance with Motion (vanilla JS)
 * ----------------------------------------------------------------------------
 * Communicates: "these items are a set" as the group scrolls into view —
 *   like stagger-entrance.css, but scroll-triggered, spring-driven, and
 *   interruptible. Pick this when the project already ships Motion; if not,
 *   reveal-on-scroll.css + stagger-entrance.css need no dependency.
 * Use: `npm install motion`
 *   <ul data-inview-stagger> <li>…</li> … </ul>
 *     import { initInViewStagger } from './motion-inview-stagger.js';
 *     initInViewStagger();
 *   Items are hidden by JS right before observing (never in CSS), so a
 *   script failure leaves everything visible.
 * Reduced motion: no hiding and no animation — the list is simply there.
 * Support: Motion's animate() uses WAAPI where it can (hardware-accelerated
 *   transform/opacity); inView() is IntersectionObserver-based.
 */
import { animate, inView, stagger } from 'motion';

export function initInViewStagger({ selector = '[data-inview-stagger]' } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const stops = [...document.querySelectorAll(selector)].map((group) => {
    const items = [...group.children];
    items.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(16px)';
    });

    let stop = () => {};
    stop = inView(
      group,
      () => {
        animate(
          items,
          { opacity: 1, transform: 'translateY(0px)' },
          { delay: stagger(0.06, { startDelay: 0.05 }), duration: 0.5, ease: [0.22, 1, 0.36, 1] }
        );
        stop(); // animate once: stop observing so re-entering the viewport doesn't replay it
      },
      { amount: 0.25 }
    );
    return () => stop();
  });

  return () => stops.forEach((stop) => stop());
}
