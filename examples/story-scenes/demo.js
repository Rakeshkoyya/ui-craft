/* Story scenes demo — wires each fictional brand to the shared story modules. */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { initStoryScroll } from '../../skills/ui-craft/assets/motion/story/story-scroll.js';
import { buildJourney } from '../../skills/ui-craft/assets/motion/story/path-journey.js';
import { initTextHighlight } from '../../skills/ui-craft/assets/motion/story/text-highlight.js';
import { initBeforeAfter } from '../../skills/ui-craft/assets/motion/story/before-after.js';
import { initZoomThrough } from '../../skills/ui-craft/assets/motion/story/zoom-through.js';
import { initChapters } from '../../skills/ui-craft/assets/motion/story/chapters.js';

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
const deps = { gsap, ScrollTrigger };
const $ = (selector) => document.querySelector(selector);

// 1. Construction: heavy parts that settle.
initStoryScroll($('#build-story'), { ...deps, language: 'weighty' });

// 2. Tea importer: a route travelled at an unhurried pace; the journey timeline replaces buildScene.
initStoryScroll($('#tea-story'), {
  ...deps,
  language: 'organic',
  timeline: (stage, options) => buildJourney(stage.querySelector('svg'), { gsap, MotionPathPlugin, ...options }),
});

// 3. Nonprofit manifesto: read word by word.
initTextHighlight($('#canopy .th'), { ...deps, language: 'airy' });

// 4. Renovation: scroll reveals, then the reader compares.
initBeforeAfter($('#dovetail .ba'), { ...deps, language: 'airy' });

// 5. Hardware: exact, and each step plays in full (no half-exploded states).
initStoryScroll($('#halden-story'), { ...deps, language: 'precise', mode: 'play' });

// 6. Film festival: step through the frame, then three pinned chapters.
initZoomThrough($('#northlight-zoom'), { ...deps, language: 'cinematic' });
initChapters($('#northlight-chapters'), { ...deps, language: 'cinematic' });
