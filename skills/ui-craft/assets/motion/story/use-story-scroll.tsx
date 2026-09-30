/*
 * useStoryScroll — React / Next.js hook for story-scroll.js (GSAP)
 * ----------------------------------------------------------------------------
 * Communicates: same as story-scroll.js — a sticky stage that advances as
 *   the reader's text steps scroll past.
 * Use: `npm install gsap @gsap/react`, copy story/*.js + story.css into the
 *   project (e.g. `components/story/`), import story.css once, then
 *     'use client';
 *     const ref = useRef<HTMLElement>(null);
 *     useStoryScroll(ref, { language: 'weighty', mode: 'scrub' });
 *     return <section ref={ref} className="story">…markup contract…</section>;
 *   Or use <StoryScroll> (StoryScroll.tsx), which renders the markup for you.
 *   Options are read once on mount (like the vanilla init); pass a new
 *   `key` to the section to rebuild with different options.
 * Next.js: this file is a client component module ("use client"). Keep the
 *   step content server-rendered and pass it in as children/props.
 * Reduced motion / mobile / never-invisible: handled by story-scroll.js and
 *   story.css — the server HTML is the finished picture with every step visible.
 * Cleanup: useGSAP reverts everything created in its callback on unmount;
 *   the engine's own cleanup also runs (restores attributes).
 * Support: React 18+, @gsap/react 2.x, GSAP 3.12+.
 */
'use client';

import { useRef, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { initStoryScroll } from './story-scroll.js';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type StoryLanguage = 'weighty' | 'precise' | 'organic' | 'airy' | 'playful' | 'cinematic' | 'mechanical' | Record<string, unknown>;

export interface StoryScrollOptions {
  language?: StoryLanguage;
  mode?: 'scrub' | 'play';
  /** GSAP timeline, or a factory (stage, { gsap, language, steps }) => timeline, for custom scenes. */
  timeline?: gsap.core.Timeline | ((stage: Element | null, o: { gsap: typeof gsap; language: unknown; steps: number }) => gsap.core.Timeline);
  onStep?: (index: number) => void;
  onProgress?: (progress: number) => void;
  /** Reading line as a fraction of viewport height (default 0.6). */
  anchor?: number;
}

export function useStoryScroll(scopeRef: RefObject<HTMLElement | null>, options: StoryScrollOptions = {}): void {
  // Keep the latest callbacks without rebuilding the timeline on every render.
  const callbacks = useRef({ onStep: options.onStep, onProgress: options.onProgress });
  callbacks.current = { onStep: options.onStep, onProgress: options.onProgress };

  useGSAP(
    () => {
      const section = scopeRef.current;
      if (!section) return undefined;
      return initStoryScroll(section, {
        gsap,
        ScrollTrigger,
        language: options.language,
        mode: options.mode,
        timeline: options.timeline,
        anchor: options.anchor,
        onStep: (i: number) => callbacks.current.onStep?.(i),
        onProgress: (p: number) => callbacks.current.onProgress?.(p),
      });
    },
    { scope: scopeRef }
  );
}
