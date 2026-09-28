/*
 * Smooth tab indicator (FLIP, framework-free)
 * ----------------------------------------------------------------------------
 * Communicates: "selection moved from here to there" — one underline glides
 *   between tabs instead of each tab lighting up on its own.
 * Use: one indicator element inside the tablist, absolutely positioned:
 *   <div role="tablist" data-tab-indicator>
 *     <button role="tab" aria-selected="true">Overview</button> …
 *     <span class="tab-indicator" aria-hidden="true"></span>
 *   </div>
 *   CSS: [data-tab-indicator] { position: relative; }
 *        .tab-indicator { position: absolute; left: 0; bottom: 0; height: 2px;
 *          width: 100px; transform-origin: 0 0; background: currentColor; }
 *   import { initTabIndicator } from './tab-indicator.js';
 *   const indicator = initTabIndicator(tablist);  // then indicator.update()
 *   after you change aria-selected (keyboard handling stays with your tabs
 *   component: roving tabindex + arrow keys).
 * How: the indicator has a fixed 100px base width and is placed purely with
 *   translateX + scaleX, so moving it never triggers layout (FLIP: measure
 *   the target, then animate transform only via WAAPI).
 * Reduced motion: jumps to the new tab without animating.
 * Support: evergreen browsers (WAAPI, ResizeObserver).
 */

const BASE_WIDTH = 100;

export function initTabIndicator(tablist) {
  const bar = tablist.querySelector('.tab-indicator');
  if (!bar) return { update() {}, destroy() {} };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let current = '';

  const targetTransform = () => {
    const tab = tablist.querySelector('[role="tab"][aria-selected="true"]');
    if (!tab) return '';
    const listRect = tablist.getBoundingClientRect();
    const rect = tab.getBoundingClientRect();
    const x = rect.left - listRect.left + tablist.scrollLeft;
    return `translateX(${x}px) scaleX(${rect.width / BASE_WIDTH})`;
  };

  const update = ({ animate = true } = {}) => {
    const next = targetTransform();
    if (!next || next === current) return;
    if (animate && current && !reduce.matches) {
      bar.animate([{ transform: current }, { transform: next }], {
        duration: 280,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      });
    }
    bar.style.transform = next;
    current = next;
  };

  const onClick = (event) => {
    if (event.target.closest('[role="tab"]')) requestAnimationFrame(() => update());
  };
  tablist.addEventListener('click', onClick);
  tablist.addEventListener('keyup', onClick);

  // Re-measure without animating when fonts load or the container resizes.
  const ro = new ResizeObserver(() => {
    current = '';
    update({ animate: false });
  });
  ro.observe(tablist);
  update({ animate: false });

  return {
    update,
    destroy() {
      ro.disconnect();
      tablist.removeEventListener('click', onClick);
      tablist.removeEventListener('keyup', onClick);
    },
  };
}
