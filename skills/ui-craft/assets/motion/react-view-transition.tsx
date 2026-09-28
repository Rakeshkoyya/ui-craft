/*
 * React <ViewTransition> — shared element morph + directional route slides
 * ----------------------------------------------------------------------------
 * Communicates: continuity between routes. A card thumbnail becomes the
 *   detail hero ("same thing, going deeper"); forward/back navigations slide
 *   in the direction of travel; the header stays anchored.
 * Use: React 19.3+ (ViewTransition is stable there) or Next.js App Router
 *   (ships the React canary that contains it — no config flag required).
 *   Import from 'react'. Load view-transition.css for the base styles and
 *   add the `.slide-*` classes below. ViewTransition only animates updates
 *   inside a Transition (startTransition, Suspense reveal, useDeferredValue,
 *   Next.js navigations) — a plain setState will not animate.
 *   Next.js: tag links with <Link href="/x" transitionTypes={['nav-forward']}>.
 * Reduced motion: view-transition.css zeroes every ::view-transition-*
 *   duration under prefers-reduced-motion: reduce, so routes swap instantly.
 * Support: Chromium 125+ and Safari 18.2+ for types/classes. Elsewhere the
 *   app works normally; transitions just don't animate.
 */
import { ViewTransition, startTransition, addTransitionType, type ReactNode } from 'react';

/* 1. Shared element: same `name` on the thumbnail and on the detail hero. */
export function CardMedia({ id, src, alt }: { id: string; src: string; alt: string }) {
  return (
    <ViewTransition name={`media-${id}`} share="morph" default="none">
      <img src={src} alt={alt} width={640} height={400} />
    </ViewTransition>
  );
}

/* 2. Page wrapper: put this in each page (not the layout — layouts persist). */
export function RouteSlide({ children }: { children: ReactNode }) {
  const map = { 'nav-forward': 'slide-forward', 'nav-back': 'slide-back', default: 'none' };
  return (
    <ViewTransition enter={map} exit={map} default="none">
      {children}
    </ViewTransition>
  );
}

/* 3. Non-router state change with a direction (e.g. a slideshow). */
export function goTo(next: () => void, direction: 'nav-forward' | 'nav-back') {
  startTransition(() => {
    addTransitionType(direction);
    next();
  });
}

/*
 * CSS to add next to view-transition.css:
 *
 * ::view-transition-group(.morph) { animation-duration: var(--dur-slow); }
 * ::view-transition-old(.slide-forward) { animation: var(--dur-fast) var(--ease-exit) both ui-vt-out-left; }
 * ::view-transition-new(.slide-forward) { animation: var(--dur-slow) var(--ease-out) both ui-vt-in-right; }
 * ::view-transition-old(.slide-back)    { animation: var(--dur-fast) var(--ease-exit) both ui-vt-out-right; }
 * ::view-transition-new(.slide-back)    { animation: var(--dur-slow) var(--ease-out) both ui-vt-in-left; }
 */
