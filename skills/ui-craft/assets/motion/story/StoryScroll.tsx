/*
 * <StoryScroll> — sticky-stage scrollytelling section for React / Next.js
 * ----------------------------------------------------------------------------
 * Communicates: same as story-scroll.js. Renders the markup contract from
 *   story.css and wires useStoryScroll, so a page can write:
 *     <StoryScroll
 *       label="How we build"
 *       layout="stage-right"
 *       language="weighty"
 *       stage={<BuildingScene />}                 // SVG with data-step parts
 *       steps={[
 *         { id: 'ground', content: <><h3>Ground first</h3><p>…</p></> },
 *         { id: 'frame',  content: <><h3>Frame</h3><p>…</p></> },
 *       ]}
 *     />
 *   `stage` and each step's `content` can be server components rendered by a
 *   server page — only this wrapper runs on the client.
 * Use: import story.css once (e.g. in app/layout.tsx or the page's CSS).
 * Reduced motion / mobile / never-invisible: see story-scroll.js and story.css.
 *   The stage is aria-hidden by default because the steps carry the meaning;
 *   pass stageLabel to expose it as an image with a text alternative instead.
 * Support: React 18+, Next.js App Router or any React setup.
 */
'use client';

import { useRef, type ReactNode } from 'react';
import { useStoryScroll, type StoryScrollOptions } from './use-story-scroll';

export interface StoryStep {
  id: string;
  content: ReactNode;
}

export interface StoryScrollProps extends StoryScrollOptions {
  /** Accessible name for the section (e.g. "How we build"). */
  label: string;
  stage: ReactNode;
  steps: StoryStep[];
  layout?: 'stage-right' | 'stage-left' | 'stage-top' | 'stage-behind';
  /** When set, the stage is exposed as role="img" with this label instead of aria-hidden. */
  stageLabel?: string;
  className?: string;
}

export function StoryScroll({ label, stage, steps, layout = 'stage-right', stageLabel, className, ...options }: StoryScrollProps) {
  const ref = useRef<HTMLElement>(null);
  useStoryScroll(ref, options);

  const stageA11y = stageLabel ? { role: 'img', 'aria-label': stageLabel } : { 'aria-hidden': true as const };

  return (
    <section ref={ref} className={['story', className].filter(Boolean).join(' ')} data-layout={layout} aria-label={label}>
      <div className="story__stage" {...stageA11y}>
        {stage}
      </div>
      <ol className="story__steps">
        {steps.map((step) => (
          <li key={step.id} className="story__step">
            <div className="story__card">{step.content}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}
