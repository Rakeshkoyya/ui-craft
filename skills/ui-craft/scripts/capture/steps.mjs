// Browser-driving steps for capture.mjs: navigation, scroll-through, full-page + slices, motion
// frames, scroll filmstrip, focus walk and clicks.
import path from 'node:path';
import { focusSnapshot, hiddenScan, probeAnimations, SELECTOR_FN } from './probes.mjs';

export const MOTION_FRAMES_MS = [0, 150, 300, 600, 1000];
export const COMPOSITED = ['transform', 'opacity', 'filter', 'clip-path', 'translate', 'scale', 'rotate'];
export const MIN_TARGET_PX = 24;
export const MAX_LIST = 25;
const NAV_TIMEOUT_MS = 30000;
const FILMSTRIP_SETTLE_MS = 400;
const MAX_FILMSTRIP_STEPS = 20;
const SCROLL_STEP_MS = 350;
const MAX_SCROLL_STEPS = 30;
const SCROLL_STEP_RATIO = 0.9; // overlap steps a little so IO thresholds are crossed
const RETURN_SETTLE_MS = 600;
const MIN_VISIBLE_OPACITY = 0.05;
const SLICE_RATIO = 1.5;
const MAX_SLICES = 12;
const FOCUS_SETTLE_MS = 250;
const FOCUS_PAD_PX = 12;
const CLICK_TIMEOUT_MS = 5000;
const CLICK_SETTLE_MS = 600;

export class CaptureError extends Error {}

export function probeArgs(extra = {}) {
  return { selectorFn: SELECTOR_FN, composited: COMPOSITED, minTarget: MIN_TARGET_PX, maxList: MAX_LIST, minOpacity: MIN_VISIBLE_OPACITY, ...extra };
}

const scrollToY = (page, y) => page.evaluate((top) => window.scrollTo({ top, left: 0, behavior: 'instant' }), y);
const metrics = (page) => page.evaluate(() => ({ height: document.documentElement.scrollHeight, vh: window.innerHeight, vw: window.innerWidth }));

export function attachCollectors(page, sink) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') sink.consoleErrors.push(msg.text().slice(0, 500));
  });
  page.on('pageerror', (err) => sink.pageErrors.push(String(err && err.message ? err.message : err).slice(0, 500)));
  page.on('response', (res) => {
    if (res.status() >= 400) sink.failedRequests.push({ url: res.url(), status: res.status() });
  });
  page.on('requestfailed', (req) => {
    sink.failedRequests.push({ url: req.url(), status: req.failure()?.errorText || 'failed' });
  });
}

export async function navigate(page, url, waitMs) {
  try {
    await page.goto(url, { waitUntil: 'load', timeout: NAV_TIMEOUT_MS });
  } catch (err) {
    const msg = String(err.message || err).split('\n')[0];
    throw new CaptureError(`Could not load ${url}\n  ${msg}\n  Is the dev server running and is the URL/port right?`);
  }
  await page.evaluate(() => document.fonts.ready.then(() => true)).catch(() => {});
  if (waitMs) await page.waitForTimeout(waitMs);
}

// Scroll top→bottom so IntersectionObserver / scroll-driven reveals fire, marking content that is
// visible while in view, then return to the top and report what never became visible.
export async function scrollThrough(page) {
  let steps = 0;
  let y = 0;
  let m = await metrics(page);
  const stepPx = Math.max(Math.round(m.vh * SCROLL_STEP_RATIO), Math.ceil((m.height - m.vh) / MAX_SCROLL_STEPS));
  for (;;) {
    const maxY = Math.max(0, m.height - m.vh);
    await scrollToY(page, Math.min(y, maxY));
    await page.waitForTimeout(SCROLL_STEP_MS);
    await page.evaluate(hiddenScan, probeArgs({ mode: 'mark' }));
    steps += 1;
    if (y >= maxY || steps >= MAX_SCROLL_STEPS) break;
    y += stepPx;
    m = await metrics(page); // lazy content can grow the page
  }
  await scrollToY(page, 0);
  await page.waitForTimeout(RETURN_SETTLE_MS);
  const hidden = await page.evaluate(hiddenScan, probeArgs({ mode: 'report' }));
  return { scrollThrough: { steps, stepPx, height: m.height }, hidden };
}

// Scroll-linked (view()/scroll()) animations sit at their start state when the page is at the
// top, which blanks full-page images. Move them to the document timeline so they finish.
async function settleScrollLinked(page) {
  return page.evaluate(() => {
    let n = 0;
    for (const a of document.getAnimations()) {
      if (a.timeline && typeof DocumentTimeline !== 'undefined' && !(a.timeline instanceof DocumentTimeline)) {
        try { a.timeline = document.timeline; a.finish(); n += 1; } catch { /* leave as is */ }
      }
    }
    return n;
  });
}

export async function captureFullPage(page, vp, dir) {
  const settled = await settleScrollLinked(page);
  await page.waitForTimeout(100);
  const full = path.join(dir, `${vp.name}-full.png`);
  await page.screenshot({ path: full, fullPage: true });
  const { height, vw, vh } = await metrics(page);
  const sliceH = Math.max(Math.round(vh * SLICE_RATIO), Math.ceil(height / MAX_SLICES));
  const slices = [];
  for (let y = 0, i = 1; y < height && i <= MAX_SLICES; y += sliceH, i += 1) {
    const file = path.join(dir, `${vp.name}-full-${String(i).padStart(2, '0')}.png`);
    await page.screenshot({ path: file, fullPage: true, clip: { x: 0, y, width: vw, height: Math.min(sliceH, height - y) } });
    slices.push(file);
  }
  return { full, slices, sliceHeight: sliceH, settledScrollLinked: settled };
}

export async function captureMotionFrames(page, url, vp, dir) {
  const shots = [];
  await page.goto(url, { waitUntil: 'load', timeout: NAV_TIMEOUT_MS });
  const start = Date.now();
  for (const t of MOTION_FRAMES_MS) {
    const remaining = t - (Date.now() - start);
    if (remaining > 0) await page.waitForTimeout(remaining);
    const file = path.join(dir, `motion-${vp.name}-t${t}.png`);
    await page.screenshot({ path: file });
    shots.push({ file, requestedMs: t, actualMs: Date.now() - start });
  }
  return shots;
}

export async function captureFilmstrip(page, vp, dir) {
  const shots = [];
  const seen = [];
  await scrollToY(page, 0);
  for (let i = 0; i < MAX_FILMSTRIP_STEPS; i++) {
    await scrollToY(page, i * vp.height);
    await page.waitForTimeout(FILMSTRIP_SETTLE_MS);
    const file = path.join(dir, `scroll-${vp.name}-${i}.png`);
    await page.screenshot({ path: file });
    shots.push(file);
    seen.push(await page.evaluate(probeAnimations, probeArgs()));
    const done = await page.evaluate(() => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1);
    if (done) break;
  }
  return { shots, animationSnapshots: seen };
}

function clipAround(rect, vp) {
  const x = Math.max(0, Math.floor(rect.x - FOCUS_PAD_PX));
  const y = Math.max(0, Math.floor(rect.y - FOCUS_PAD_PX));
  const right = Math.min(vp.width, Math.ceil(rect.x + rect.width + FOCUS_PAD_PX));
  const bottom = Math.min(vp.height, Math.ceil(rect.y + rect.height + FOCUS_PAD_PX));
  return right - x >= 1 && bottom - y >= 1 ? { x, y, width: right - x, height: bottom - y } : null;
}

// Press Tab n times; for each stop screenshot the focused element and compare its focus-capable
// styles with the blurred state. Blurring keeps Chromium's sequential-navigation start point.
export async function focusWalk(page, n, vp, dir) {
  const stops = [];
  for (let i = 1; i <= n; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(FOCUS_SETTLE_MS);
    const focused = await page.evaluate(focusSnapshot, probeArgs());
    if (!focused) break; // focus left the document: end of the tab order
    const file = path.join(dir, `focus-${i}.png`);
    const clip = clipAround(focused.rect, vp);
    await page.screenshot(clip ? { path: file, clip } : { path: file });
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.waitForTimeout(FOCUS_SETTLE_MS);
    const plain = await page.evaluate(focusSnapshot, probeArgs({ useMarked: true }));
    const changed = plain ? Object.keys(focused.styles).filter((k) => focused.styles[k] !== plain.styles[k]) : ['(element vanished)'];
    stops.push({ index: i, selector: focused.selector, label: focused.label, file, visibleIndicator: changed.length > 0, changed });
  }
  return stops;
}

export async function clickThrough(page, selectors, dir) {
  const clicks = [];
  for (const selector of selectors) {
    try {
      await page.click(selector, { timeout: CLICK_TIMEOUT_MS });
      clicks.push({ selector, ok: true });
    } catch (err) {
      clicks.push({ selector, ok: false, error: String(err.message || err).split('\n')[0].slice(0, 200) });
    }
    await page.waitForTimeout(CLICK_SETTLE_MS);
  }
  const afterClick = path.join(dir, 'after-click.png');
  await page.screenshot({ path: afterClick });
  return { clicks, afterClick, titleAfter: await page.title() };
}
