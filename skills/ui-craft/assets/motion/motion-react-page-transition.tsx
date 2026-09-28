/*
 * SPA page transition with Motion for React (AnimatePresence)
 * ----------------------------------------------------------------------------
 * Communicates: "you moved to a new place, and it's the same app." The old
 *   view leaves quickly and slightly upward; the new view settles in.
 * Use: `npm install motion`. Wrap your routed outlet:
 *     <PageTransition routeKey={location.pathname}>{outlet}</PageTransition>
 *   React Router: routeKey = useLocation().pathname. For Next.js App Router
 *   prefer React's <ViewTransition> (see react-view-transition.tsx) — the App
 *   Router unmounts pages in ways that make exit animations unreliable.
 *   `mode="wait"` means the exit finishes before the enter starts, so keep
 *   the exit short (<= 160ms) or navigation will feel laggy.
 * Reduced motion: <MotionConfig reducedMotion="user"> makes Motion skip
 *   transform animations for users who ask for less motion; the opacity
 *   cross-fade remains, so the change is still perceptible.
 * Focus: after the new page mounts, focus moves to its <h1> (tabIndex=-1) so
 *   keyboard and screen-reader users land at the start of the new content.
 * Support: Motion supports React 18+; import path is "motion/react"
 *   (the package formerly published as framer-motion).
 */
'use client';

import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useEffect, useRef, type ReactNode } from 'react';

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_EXIT = [0.4, 0, 1, 1] as const;

const variants = {
  initial: { opacity: 0, y: 12 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE_OUT } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.16, ease: EASE_EXIT } },
};

export function PageTransition({ routeKey, children }: { routeKey: string; children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {/* initial={false}: no animation on the very first load — the hero sequence owns that moment. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={routeKey}
          variants={variants}
          initial="initial"
          animate="enter"
          exit="exit"
        >
          <FocusOnMount routeKey={routeKey} />
          {children}
        </motion.main>
      </AnimatePresence>
    </MotionConfig>
  );
}

function FocusOnMount({ routeKey }: { routeKey: string }) {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const heading = marker.current?.parentElement?.querySelector<HTMLElement>('h1');
    if (!heading) return;
    if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }, [routeKey]);
  return <span ref={marker} hidden />;
}
