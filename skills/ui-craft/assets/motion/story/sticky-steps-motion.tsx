/*
 * <StickySteps> — sticky-stage scrollytelling with the Motion library
 * ----------------------------------------------------------------------------
 * Communicates: same as story-scroll.js — the stage advances while text
 *   steps scroll past. Use this variant when the project already ships
 *   Motion (`motion/react`) and the scene is easier to express as React
 *   components reading a MotionValue than as a GSAP timeline.
 * Use: `npm install motion`, import story.css once (same markup contract), then
 *     <StickySteps
 *       label="From leaf to cup"
 *       layout="stage-left"
 *       steps={[{ id: 'pick', content: <>…</> }, …]}
 *       stage={({ progress, active }) => <TeaScene progress={progress} active={active} />}
 *     />
 *   Inside the scene, derive motion from `progress` (a MotionValue 0..1):
 *     const y = useTransform(progress, [0, 0.25], [60, 0]);
 *     <motion.g style={{ y, opacity: useTransform(progress, [0, 0.25], [0, 1]) }} />
 *   `active` is the index of the step at the reading line (React state —
 *   use it for discrete changes such as captions, not per-frame motion).
 * Reduced motion: `progress` jumps to the end of each step when it becomes
 *   active (no scrubbing); the scene shows a sequence of still states.
 * Mobile: story.css handles layout (stage sticky on top at ~45svh).
 * Never-invisible: server HTML renders the scene with progress 1 (finished)
 *   and every step undimmed; `data-story-js` is set only after hydration.
 * Support: Motion for React 11+ (package `motion`, import "motion/react"), React 18+.
 */
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, type MotionValue } from 'motion/react';

export interface StickyStep {
  id: string;
  content: ReactNode;
}

export interface StickyStepsProps {
  label: string;
  steps: StickyStep[];
  stage: (state: { progress: MotionValue<number>; active: number }) => ReactNode;
  layout?: 'stage-right' | 'stage-left' | 'stage-top' | 'stage-behind';
  /** Reading line as a fraction of viewport height (default 0.6). */
  anchor?: number;
  onStep?: (index: number) => void;
  className?: string;
}

/** Fractional step at a distance `y` into the list, given step top offsets + total height. */
export function stepAtOffset(offsets: number[], y: number): number {
  const n = offsets.length - 1;
  if (n <= 0 || y <= offsets[0]) return 0;
  for (let i = 0; i < n; i += 1) {
    if (y < offsets[i + 1]) return i + (y - offsets[i]) / (offsets[i + 1] - offsets[i] || 1);
  }
  return n;
}

export function StickySteps({ label, steps, stage, layout = 'stage-right', anchor = 0.6, onStep, className }: StickyStepsProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const offsets = useRef<number[]>([]);
  const reduce = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);
  const [active, setActive] = useState(-1);
  // Starts finished (1) so the server render and no-JS view show the complete scene.
  const progress = useMotionValue(1);
  // [target edge, viewport edge]: list start meets the anchor line → list end meets it.
  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: [[0, anchor], [1, anchor]],
  });

  useEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;
    const measure = () => {
      const base = list.getBoundingClientRect().top;
      const tops = [...list.children].map((c) => c.getBoundingClientRect().top - base);
      offsets.current = [...tops, list.getBoundingClientRect().height];
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    setHydrated(true);
    update(scrollYProgress.get()); // from "finished" (server render) to the real position
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once after hydration
  }, []);

  const update = (v: number) => {
    const total = offsets.current[offsets.current.length - 1] || 1;
    const s = stepAtOffset(offsets.current, v * total);
    const index = Math.min(steps.length - 1, Math.floor(s));
    if (index !== active) {
      setActive(index);
      onStep?.(index);
    }
    // Reduced motion: discrete states — the end of the active step, no scrub.
    progress.set(reduce ? Math.min(1, (index + 1) / steps.length) : s / steps.length);
  };
  useMotionValueEvent(scrollYProgress, 'change', update);

  return (
    <section
      ref={sectionRef}
      className={['story', className].filter(Boolean).join(' ')}
      data-layout={layout}
      data-story-js={hydrated ? '' : undefined}
      aria-label={label}
    >
      <div className="story__stage" aria-hidden="true">
        {stage({ progress, active })}
      </div>
      <ol ref={listRef} className="story__steps">
        {steps.map((step, i) => (
          <li
            key={step.id}
            className="story__step"
            data-active={i === active ? '' : undefined}
            aria-current={i === active ? 'step' : undefined}
          >
            <div className="story__card">{step.content}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}
