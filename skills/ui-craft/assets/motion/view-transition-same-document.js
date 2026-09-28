/*
 * Same-document View Transition helper
 * ----------------------------------------------------------------------------
 * Communicates: continuity across a state change in one page — a thumbnail
 *   growing into a detail view, a list re-sorting, a filter swapping content,
 *   a theme switch. The browser snapshots before/after and morphs between
 *   them, so "the same thing moved" instead of "something vanished".
 * Use:
 *   import { withViewTransition } from './view-transition-same-document.js';
 *   button.addEventListener('click', () =>
 *     withViewTransition(() => renderDetail(item), { types: ['forward'] }));
 *   Give elements that should morph a unique `view-transition-name` (CSS or
 *   `el.style.viewTransitionName`) in BOTH the old and new state. Style the
 *   animation in view-transition.css.
 * Reduced motion: the DOM update still happens, but instantly (no transition
 *   is started). view-transition.css also zeroes durations as a second guard.
 * Support: `document.startViewTransition` is Baseline (Chrome 111, Safari 18,
 *   Firefox 144). Transition `types` need Chrome 125+/Safari 18.2+; the helper
 *   falls back to the callback form when types are unsupported. Without the
 *   API at all, the update just runs.
 */

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Run `update` (sync or async DOM mutation) inside a view transition when possible.
 * @param {() => void | Promise<void>} update
 * @param {{ types?: string[] }} [options]
 * @returns {Promise<void>} resolves when the new state is on screen
 */
export async function withViewTransition(update, { types = [] } = {}) {
  if (!document.startViewTransition || reduceMotion() || document.hidden) {
    await update();
    return;
  }

  let transition;
  try {
    // Object form (with types) — throws or ignores types in older engines.
    transition = document.startViewTransition({ update, types });
  } catch {
    transition = document.startViewTransition(update);
  }

  // `updateCallbackDone` rejects if `update` throws; surface that to the caller.
  await transition.updateCallbackDone;
}

/**
 * Temporarily give one element a view-transition-name, e.g. the clicked card,
 * so only it morphs (names must be unique on the page at snapshot time).
 */
export function nameForTransition(el, name) {
  el.style.viewTransitionName = name;
  return () => {
    el.style.viewTransitionName = '';
  };
}
