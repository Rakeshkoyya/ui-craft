/*
 * Motion languages — one brand, one way of moving
 * ----------------------------------------------------------------------------
 * Communicates: the brand's character through physics. A construction firm's
 *   parts arrive heavy and settle; a wellness brand's grow and breathe; a dev
 *   tool's snap precisely into place. Every scene on a page reads the SAME
 *   language, so the site feels like one hand made it.
 * Use:
 *     import { resolveLanguage, applyCssTokens } from './languages.js';
 *     const lang = resolveLanguage('weighty');           // or a custom object
 *     applyCssTokens(lang);                               // CSS motion tokens follow
 *   Pass the name (or object) as `language` to buildScene / initStoryScroll /
 *   initChapters / … . A custom object may override any field of a preset:
 *     resolveLanguage({ base: 'organic', duration: 1.4 })
 *   Fields:
 *     ease      GSAP ease for entrances
 *     settle    GSAP ease for parts that land (drop, pop) — the language's "weight"
 *     exitEase  GSAP ease for parts that leave
 *     duration  seconds for one step in `play` mode and for standalone tweens
 *     stagger   seconds between parts entering on the same step
 *     distance  px of travel for rise/drop/slide
 *     scrub     seconds of smoothing when scroll drives the timeline
 *     cssTokens values for assets/motion/tokens.css names, so CSS transitions
 *               (hover, reveals, dialogs) share the scenes' rhythm
 * Reduced motion: languages only describe motion; every consumer checks
 *   prefers-reduced-motion itself. Under reduce, tokens.css still zeroes
 *   distances even after applyCssTokens (it only sets durations/easings).
 * Support: plain data, any environment.
 */

export const MOTION_LANGUAGES = Object.freeze({
  weighty: {
    description: 'Heavy parts arrive and settle with a small bounce — construction, architecture, manufacturing.',
    ease: 'power3.out',
    settle: 'back.out(1.15)',
    exitEase: 'power2.in',
    duration: 0.9,
    stagger: 0.09,
    distance: 60,
    scrub: 0.7,
    cssTokens: {
      '--dur-base': '300ms',
      '--dur-slow': '520ms',
      '--dur-deliberate': '860ms',
      '--ease-out': 'cubic-bezier(0.33, 1, 0.68, 1)',
      '--ease-emphasized': 'cubic-bezier(0.34, 1.3, 0.64, 1)',
      '--stagger': '90ms',
    },
  },
  precise: {
    description: 'Exact, even, no overshoot — developer tools, engineering, fintech, medical devices.',
    ease: 'power2.inOut',
    settle: 'power2.out',
    exitEase: 'power2.in',
    duration: 0.6,
    stagger: 0.05,
    distance: 24,
    scrub: 0.4,
    cssTokens: {
      '--dur-base': '200ms',
      '--dur-slow': '340ms',
      '--dur-deliberate': '560ms',
      '--ease-out': 'cubic-bezier(0.45, 0, 0.2, 1)',
      '--ease-emphasized': 'cubic-bezier(0.65, 0, 0.35, 1)',
      '--stagger': '50ms',
    },
  },
  organic: {
    description: 'Slow swells that grow from a root — agriculture, wellness, food, education, sustainability.',
    ease: 'sine.out',
    settle: 'sine.inOut',
    exitEase: 'sine.in',
    duration: 1.1, // ui-craft-ignore UC012 — one story step, not a UI transition
    stagger: 0.12,
    distance: 32,
    scrub: 0.9,
    cssTokens: {
      '--dur-base': '340ms',
      '--dur-slow': '600ms',
      '--dur-deliberate': '960ms',
      '--ease-out': 'cubic-bezier(0.39, 0.58, 0.57, 1)',
      '--ease-emphasized': 'cubic-bezier(0.37, 0, 0.63, 1)',
      '--stagger': '110ms',
    },
  },
  airy: {
    description: 'Long, soft decelerations over short distances — luxury, hospitality, fashion, editorial.',
    ease: 'expo.out',
    settle: 'expo.out',
    exitEase: 'power1.in',
    duration: 1.2, // ui-craft-ignore UC012 — one story step, not a UI transition
    stagger: 0.1,
    distance: 16,
    scrub: 1,
    cssTokens: {
      '--dur-base': '360ms',
      '--dur-slow': '640ms',
      '--dur-deliberate': '960ms',
      '--ease-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      '--ease-emphasized': 'cubic-bezier(0.16, 1, 0.3, 1)',
      '--stagger': '100ms',
    },
  },
  playful: {
    description: 'Springy pops with visible overshoot — consumer apps, kids, games, snacks.',
    ease: 'back.out(1.7)',
    settle: 'elastic.out(1, 0.6)',
    exitEase: 'back.in(1.4)',
    duration: 0.7,
    stagger: 0.07,
    distance: 40,
    scrub: 0.5,
    cssTokens: {
      '--dur-base': '240ms',
      '--dur-slow': '420ms',
      '--dur-deliberate': '700ms',
      '--ease-out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      '--ease-emphasized': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      '--stagger': '70ms',
    },
  },
  cinematic: {
    description: 'Big, slow, deliberate moves with long holds — launches, film, games, flagship products.',
    ease: 'power4.inOut',
    settle: 'power4.out',
    exitEase: 'power3.in',
    duration: 1.4, // ui-craft-ignore UC012 — one story step, not a UI transition
    stagger: 0.14,
    distance: 80,
    scrub: 1.2,
    cssTokens: {
      '--dur-base': '380ms',
      '--dur-slow': '700ms',
      '--dur-deliberate': '960ms',
      '--ease-out': 'cubic-bezier(0.25, 1, 0.5, 1)',
      '--ease-emphasized': 'cubic-bezier(0.76, 0, 0.24, 1)',
      '--stagger': '140ms',
    },
  },
  mechanical: {
    description: 'Even, linear-ish travel like conveyors and pistons — logistics, industrial, automotive.',
    ease: 'power1.inOut',
    settle: 'power1.out',
    exitEase: 'power1.in',
    duration: 0.5,
    stagger: 0.06,
    distance: 48,
    scrub: 0.3,
    cssTokens: {
      '--dur-base': '220ms',
      '--dur-slow': '360ms',
      '--dur-deliberate': '540ms',
      '--ease-out': 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
      '--ease-emphasized': 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
      '--stagger': '60ms',
    },
  },
});

export const DEFAULT_LANGUAGE = 'precise';

/**
 * Return a complete language object.
 * - a preset name ('weighty') → that preset
 * - an object → merged over its `base` preset (default: precise); cssTokens merge too
 * - anything else → the default preset
 */
export function resolveLanguage(nameOrObject) {
  if (typeof nameOrObject === 'string') {
    return MOTION_LANGUAGES[nameOrObject] || MOTION_LANGUAGES[DEFAULT_LANGUAGE];
  }
  if (nameOrObject && typeof nameOrObject === 'object') {
    const base = MOTION_LANGUAGES[nameOrObject.base] || MOTION_LANGUAGES[DEFAULT_LANGUAGE];
    return {
      ...base,
      ...nameOrObject,
      cssTokens: { ...base.cssTokens, ...(nameOrObject.cssTokens || {}) },
    };
  }
  return MOTION_LANGUAGES[DEFAULT_LANGUAGE];
}

/** Write the language's CSS tokens onto an element (default <html>). Returns an undo function. */
export function applyCssTokens(language, el = document.documentElement) {
  const tokens = resolveLanguage(language).cssTokens;
  const previous = Object.keys(tokens).map((k) => [k, el.style.getPropertyValue(k)]);
  Object.entries(tokens).forEach(([k, v]) => el.style.setProperty(k, v));
  return () => previous.forEach(([k, v]) => (v ? el.style.setProperty(k, v) : el.style.removeProperty(k)));
}
