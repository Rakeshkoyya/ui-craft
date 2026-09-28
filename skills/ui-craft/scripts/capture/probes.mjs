// In-page probes for capture.mjs. Every exported function runs inside the browser via
// page.evaluate, so each must be self-contained (no closures over module scope). Shared helpers
// travel as source strings (SELECTOR_FN) and are rebuilt with new Function() in the page.

export const SELECTOR_FN = `(el) => {
  const esc = (s) => (window.CSS && CSS.escape ? CSS.escape(s) : s);
  if (el.id && document.querySelectorAll('#' + esc(el.id)).length === 1) return '#' + esc(el.id);
  const parts = [];
  let node = el;
  while (node && node.nodeType === 1 && node !== document.documentElement) {
    let part = node.tagName.toLowerCase();
    const cls = [...node.classList].filter((c) => /^[a-zA-Z_-][\\w-]*$/.test(c)).slice(0, 2);
    if (cls.length) part += '.' + cls.map(esc).join('.');
    const parent = node.parentElement;
    if (parent) {
      const same = [...parent.children].filter((c) => c.tagName === node.tagName);
      if (same.length > 1) part += ':nth-of-type(' + (same.indexOf(node) + 1) + ')';
    }
    parts.unshift(part);
    const sel = parts.join(' > ');
    if (document.querySelectorAll(sel).length === 1) return sel;
    if (parent && parent.id) return '#' + esc(parent.id) + ' > ' + sel;
    node = parent;
  }
  return parts.join(' > ');
}`;

export function installClsObserver() {
  window.__uiCraftCls = 0;
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__uiCraftCls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  } catch { window.__uiCraftCls = null; }
}

export function probeLayout({ selectorFn, minTarget, maxList }) {
  const selectorOf = new Function(`return ${selectorFn}`)();
  const vw = window.innerWidth;
  const clipsX = (el) => {
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      if (getComputedStyle(a).overflowX !== 'visible') return true;
    }
    return false;
  };
  const sticksOut = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && (r.right > vw + 1 || r.left < -1);
  };
  const all = [...document.body.querySelectorAll('*')];
  const overflowing = all.filter((el) => sticksOut(el) && !clipsX(el))
    .filter((el) => !el.parentElement || el.parentElement === document.body || !sticksOut(el.parentElement))
    .slice(0, maxList)
    .map((el) => ({ selector: selectorOf(el), right: Math.round(el.getBoundingClientRect().right) }));
  const scrollWidth = document.documentElement.scrollWidth;

  const imagesMissingAlt = [...document.images].filter((img) => !img.hasAttribute('alt'))
    .slice(0, maxList).map((img) => ({ selector: selectorOf(img), src: (img.currentSrc || img.src || '').slice(0, 120) }));

  const interactive = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[tabindex]:not([tabindex="-1"])';
  const smallTargets = [...document.querySelectorAll(interactive)].filter((el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    if (el.tagName === 'A' && cs.display === 'inline') return false; // inline text links are exempt (WCAG 2.5.8)
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && (r.width < minTarget || r.height < minTarget);
  }).slice(0, maxList).map((el) => {
    const r = el.getBoundingClientRect();
    return { selector: selectorOf(el), width: Math.round(r.width), height: Math.round(r.height) };
  });

  return {
    title: document.title,
    viewportWidth: vw,
    scrollWidth,
    pageHeight: document.documentElement.scrollHeight,
    hasHorizontalOverflow: scrollWidth > vw,
    overflowing,
    imagesMissingAlt,
    smallTargets,
  };
}

export function probeFonts() {
  const loaded = [];
  document.fonts.forEach((f) => {
    if (f.status === 'loaded') loaded.push(`${f.family.replace(/["']/g, '')} ${f.weight} ${f.style}`);
  });
  const computed = {};
  for (const sel of ['h1', 'h2', 'body', 'button']) {
    const el = document.querySelector(sel);
    if (el) computed[sel] = getComputedStyle(el).fontFamily;
  }
  return { loadedFaces: [...new Set(loaded)], computed, cls: window.__uiCraftCls ?? null };
}

export function probeAnimations({ selectorFn, composited, maxList }) {
  const selectorOf = new Function(`return ${selectorFn}`)();
  const toKebab = (p) => p.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
  const skip = new Set(['offset', 'computedOffset', 'easing', 'composite']);
  const allowed = new Set(composited);
  const isScrollLinked = (a) => a.timeline && typeof DocumentTimeline !== 'undefined' && !(a.timeline instanceof DocumentTimeline);
  const out = [];
  for (const anim of document.getAnimations()) {
    const effect = anim.effect;
    if (!effect) continue;
    const props = new Set();
    let kfEasing = null;
    for (const kf of effect.getKeyframes()) {
      Object.keys(kf).filter((k) => !skip.has(k)).forEach((k) => props.add(toKebab(k)));
      if (!kfEasing && kf.easing && kf.easing !== 'linear') kfEasing = kf.easing;
    }
    const timing = effect.getComputedTiming();
    const target = effect.target;
    const properties = [...props];
    const scrollLinked = isScrollLinked(anim);
    out.push({
      type: anim.constructor.name,
      name: anim.animationName || anim.transitionProperty || anim.id || '',
      target: target ? selectorOf(target) + (effect.pseudoElement || '') : '(none)',
      properties,
      nonComposited: properties.filter((p) => !allowed.has(p)),
      timeline: scrollLinked ? anim.timeline.constructor.name : 'document',
      // numbers are milliseconds; scroll-linked timings are progress percentages, not time
      duration: scrollLinked ? 'scroll-linked' : (typeof timing.duration === 'number' ? Math.round(timing.duration) : String(timing.duration)),
      delay: typeof timing.delay === 'number' ? Math.round(timing.delay) : 0,
      easing: timing.easing && timing.easing !== 'linear' ? timing.easing : (kfEasing || timing.easing),
      iterations: timing.iterations === Infinity ? 'infinite' : timing.iterations,
      playState: anim.playState,
    });
  }
  return { total: out.length, running: out.filter((a) => a.playState === 'running').length, items: out.slice(0, maxList * 2) };
}

// Hidden-content scan. mode "mark": remember every candidate that is visible while inside the
// viewport (called at each scroll step). mode "report": list candidates that are invisible now
// and were never seen visible, grouped by the element responsible for hiding them.
export function hiddenScan({ mode, selectorFn, maxList, minOpacity }) {
  const selectorOf = new Function(`return ${selectorFn}`)();
  const seen = window.__uiCraftSeen || (window.__uiCraftSeen = new WeakSet());
  const TEXT = 'h1,h2,h3,h4,h5,h6,p,li,a,button,blockquote,figcaption,label,dt,dd,td,th';
  const MEDIA = 'img,svg,video,canvas';
  const EXCLUDED = '[aria-hidden="true"],[inert],[hidden],dialog:not([open]),details:not([open]) > :not(summary),template,noscript';
  const styles = new Map();
  const cs = (el) => { if (!styles.has(el)) styles.set(el, getComputedStyle(el)); return styles.get(el); };
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const candidates = [];
  for (const el of document.body.querySelectorAll(`${TEXT},${MEDIA}`)) {
    if (el.matches(MEDIA)) {
      if (el.parentElement && el.parentElement.closest('svg')) continue;
    } else if (!el.textContent.trim()) continue;
    if (el.closest(EXCLUDED)) continue;
    if (el.checkVisibility && !el.checkVisibility()) continue; // display:none, skipped content
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    candidates.push({ el, r });
  }

  const opacityInfo = (el) => {
    let product = 1;
    let lowest = null;
    for (let a = el; a && a.nodeType === 1; a = a.parentElement) {
      const o = parseFloat(cs(a).opacity);
      product *= o;
      if (o < 1 && (!lowest || o <= lowest.o)) lowest = { el: a, o };
    }
    return { product, root: lowest && lowest.el };
  };
  const visibilityRoot = (el) => {
    if (cs(el).visibility === 'visible') return null;
    let root = el;
    for (let a = el.parentElement; a && cs(a).visibility !== 'visible'; a = a.parentElement) root = a;
    return root;
  };

  if (mode === 'mark') {
    for (const { el, r } of candidates) {
      if (seen.has(el) || r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) continue;
      if (opacityInfo(el).product >= minOpacity && !visibilityRoot(el)) seen.add(el);
    }
    return { marked: candidates.filter(({ el }) => seen.has(el)).length };
  }

  const docW = document.documentElement.scrollWidth;
  const offCanvasRoot = (el, r) => {
    const x = r.left + window.scrollX;
    const y = r.top + window.scrollY;
    if (!(x + r.width <= 0 || x >= docW || y + r.height <= 0)) return null;
    let transformed = null;
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const s = cs(a);
      if (a !== el && (s.overflowX !== 'visible' || s.overflowY !== 'visible')) return null; // deliberate clip region (carousel)
      if (!transformed && (s.transform !== 'none' || (s.translate && s.translate !== 'none'))) transformed = a;
    }
    return transformed;
  };
  const inOverlay = (el) => {
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const p = cs(a).position;
      if (p === 'fixed' || p === 'absolute') return true;
    }
    return false;
  };

  const groups = new Map();
  for (const { el, r } of candidates) {
    if (seen.has(el)) continue;
    const op = opacityInfo(el);
    const visRoot = visibilityRoot(el);
    const offRoot = op.product >= minOpacity && !visRoot ? offCanvasRoot(el, r) : null;
    let root;
    let reason;
    if (op.product < minOpacity) { root = op.root; reason = `opacity ${+op.product.toFixed(3)}`; }
    else if (visRoot) { root = visRoot; reason = 'visibility hidden'; }
    else if (offRoot) { root = offRoot; reason = 'transformed off-canvas'; }
    else continue;
    const rr = root.getBoundingClientRect();
    if (rr.width < 1 || rr.height < 1) continue; // collapsed accordion / closed panel
    if (inOverlay(root)) continue; // drawers, dropdowns, tooltips, skip links
    if (!groups.has(root)) groups.set(root, { selector: selectorOf(root), reason, count: 0, sample: '' });
    const g = groups.get(root);
    g.count += 1;
    if (!g.sample) g.sample = (el.textContent.trim() || el.getAttribute('alt') || el.tagName.toLowerCase()).replace(/\s+/g, ' ').slice(0, 60);
  }
  return [...groups.values()].slice(0, maxList);
}

// Snapshot of the styles that can show focus. Default: document.activeElement (null when nothing
// is focused), which is also tagged. useMarked: the tagged element again, after it was blurred.
// Comparing the two decides whether a visible focus indicator exists.
export function focusSnapshot({ selectorFn, useMarked }) {
  const MARK = 'data-ui-craft-focus';
  const el = useMarked ? document.querySelector(`[${MARK}]`) : document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;
  if (useMarked) el.removeAttribute(MARK);
  else el.setAttribute(MARK, '');
  const selectorOf = new Function(`return ${selectorFn}`)();
  const pick = (s) => ({
    outline: s.outlineStyle === 'none' || parseFloat(s.outlineWidth) === 0 ? 'none' : `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor} ${s.outlineOffset}`,
    boxShadow: s.boxShadow,
    border: `${s.borderTopWidth} ${s.borderTopColor} ${s.borderBottomWidth} ${s.borderBottomColor}`,
    background: `${s.backgroundColor} ${s.backgroundImage}`,
    color: s.color,
    textDecoration: `${s.textDecorationLine} ${s.textDecorationThickness}`,
    transform: s.transform,
    filter: s.filter,
  });
  const pseudo = (p) => {
    const s = getComputedStyle(el, p);
    return s.content === 'none' || s.content === 'normal' ? 'none' : JSON.stringify({ ...pick(s), opacity: s.opacity, w: s.width, h: s.height });
  };
  const r = el.getBoundingClientRect();
  return {
    selector: selectorOf(el),
    label: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40),
    styles: { ...pick(getComputedStyle(el)), before: pseudo('::before'), after: pseudo('::after') },
    rect: { x: r.left, y: r.top, width: r.width, height: r.height },
  };
}
