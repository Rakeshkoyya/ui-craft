/*
 * Pinned chapters — full-viewport story chapters that replace each other
 * ----------------------------------------------------------------------------
 * Communicates: "this is a story in parts." The section holds the screen
 *   while each chapter (a manifesto line, an era, a principle) takes over
 *   from the last; a rail shows where you are. Use once per page, for the
 *   brand's central narrative, never for ordinary content.
 * Use: `npm install gsap`, load chapters.css, then
 *     <section class="chapters" aria-label="Our story">
 *       <ol class="chapters__rail">
 *         <li><a href="#ch-origin">Origin</a></li> …
 *       </ol>
 *       <article class="chapters__panel" id="ch-origin">…</article>
 *       <article class="chapters__panel" id="ch-turn" data-transition="wipe">…</article>
 *       …
 *     </section>
 *     import { initChapters } from './chapters.js';
 *     const cleanup = initChapters(section, { gsap, ScrollTrigger, language: 'cinematic' });
 *   data-transition on a panel = how IT arrives: fade (default) | wipe | slide | zoom.
 *   Options: language, snap (default true: settle on a chapter when scrolling stops),
 *   length (scroll distance per chapter as a viewport fraction, default 1).
 * Reduced motion / small screens (< 48rem): not pinned. Panels stay in normal
 *   flow, stacked; rail links are ordinary anchor links.
 * Keyboard: panels stay in DOM order. Focus moving into a hidden chapter (Tab)
 *   scrolls the page to that chapter; rail links jump to their chapter.
 * Never-invisible: without JS (or when the media query fails) every panel is
 *   a normal, visible block. `.chapters--pinned` is only added by this script.
 * Support: GSAP 3.12+ with ScrollTrigger (injected). Returns a cleanup function.
 */

import { resolveLanguage } from './languages.js';

const PINNED_OK = '(min-width: 48rem) and (prefers-reduced-motion: no-preference)';
const noop = () => {};

/** Hidden start state for a panel arriving with `transition`. */
export function panelFromVars(transition) {
  switch (transition) {
    case 'wipe':
      return { clipPath: 'inset(100% 0% 0% 0%)' };
    case 'slide':
      return { yPercent: 100 };
    case 'zoom':
      return { scale: 1.15, opacity: 0 };
    case 'fade':
    default:
      return { opacity: 0 };
  }
}

export function initChapters(section, { gsap, ScrollTrigger, language = 'cinematic', snap = true, length = 1 } = {}) {
  if (!section || !gsap || !ScrollTrigger) return noop;
  const panels = [...section.querySelectorAll('.chapters__panel')];
  if (panels.length < 2) return noop;
  gsap.registerPlugin(ScrollTrigger);
  const lang = resolveLanguage(language);
  const railLinks = [...section.querySelectorAll('.chapters__rail a')];
  const mm = gsap.matchMedia();
  let current = -1;

  const setCurrent = (i) => {
    if (i === current) return;
    current = i;
    railLinks.forEach((a, k) => (k === i ? a.setAttribute('aria-current', 'step') : a.removeAttribute('aria-current')));
    panels.forEach((p, k) => p.toggleAttribute('data-active', k === i));
  };

  mm.add(PINNED_OK, () => {
    section.classList.add('chapters--pinned');
    const tl = gsap.timeline({ defaults: { duration: 1, ease: lang.ease } });
    tl.addLabel('chapter-0', 0);
    panels.forEach((panel, i) => {
      gsap.set(panel, { zIndex: i + 1 });
      if (i === 0) return;
      const transition = panel.dataset.transition || 'fade';
      const from = panelFromVars(transition);
      const at = i - 1;
      if (transition === 'wipe') tl.fromTo(panel, from, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.inOut' }, at);
      else tl.from(panel, { ...from, immediateRender: true }, at);
      // The outgoing panel recedes a little so the change reads as depth, not a cut.
      tl.to(panels[i - 1], { scale: 0.94, opacity: transition === 'fade' || transition === 'zoom' ? 0 : 0.35, ease: lang.exitEase }, at);
      tl.addLabel(`chapter-${i}`, i);
    });

    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => `+=${(panels.length - 1) * window.innerHeight * length}`,
      pin: true,
      scrub: lang.scrub,
      animation: tl,
      invalidateOnRefresh: true,
      snap: snap ? { snapTo: 'labels', duration: { min: 0.2, max: 0.8 }, ease: 'power1.inOut' } : undefined,
      onUpdate: (self) => setCurrent(Math.round(self.progress * (panels.length - 1))),
    });
    setCurrent(0);

    const scrollToPanel = (i) => {
      const y = st.start + ((st.end - st.start) * i) / (panels.length - 1);
      window.scrollTo({ top: y, behavior: 'instant' });
    };
    const onFocusIn = (e) => {
      const i = panels.findIndex((p) => p.contains(e.target));
      if (i >= 0 && i !== current) scrollToPanel(i);
    };
    const onRailClick = (e) => {
      const i = railLinks.indexOf(e.currentTarget);
      if (i < 0) return;
      e.preventDefault();
      scrollToPanel(i);
    };
    section.addEventListener('focusin', onFocusIn);
    railLinks.forEach((a) => a.addEventListener('click', onRailClick));

    return () => {
      section.classList.remove('chapters--pinned');
      section.removeEventListener('focusin', onFocusIn);
      railLinks.forEach((a) => a.removeEventListener('click', onRailClick));
      current = -1;
    };
  });

  const toEnd = () => {
    if (!section.classList.contains('chapters--pinned')) return;
    panels.forEach((p) => gsap.set(p, { clearProps: 'all' }));
  };
  const afterPrint = () => ScrollTrigger.refresh(); // re-applies the scrubbed panel state
  window.addEventListener('beforeprint', toEnd);
  window.addEventListener('afterprint', afterPrint);
  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  return () => {
    window.removeEventListener('beforeprint', toEnd);
    window.removeEventListener('afterprint', afterPrint);
    mm.revert();
    railLinks.forEach((a) => a.removeAttribute('aria-current'));
    panels.forEach((p) => p.removeAttribute('data-active'));
  };
}
