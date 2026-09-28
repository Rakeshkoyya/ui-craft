#!/usr/bin/env node
// ui-craft capture: screenshots + a machine-checkable UI report, so an agent can look at the
// page it built and loop until it is right. Contract: docs/CONTRACTS.md §2 scripts/capture.mjs.
// Exit codes: 0 = captured, report clean; 1 = captured with findings, or capture failed;
// 2 = usage error or Playwright not installed.
// Helpers live in ./capture/ (probes, steps, report, serve); no dependencies beyond playwright.
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { installClsObserver, probeAnimations, probeFonts, probeLayout } from './capture/probes.mjs';
import { allImages, findingsFor, writeReports } from './capture/report.mjs';
import { startStaticServer } from './capture/serve.mjs';
import {
  CaptureError, MAX_LIST, MOTION_FRAMES_MS, attachCollectors, captureFilmstrip, captureFullPage,
  captureMotionFrames, clickThrough, focusWalk, navigate, probeArgs, scrollThrough,
} from './capture/steps.mjs';

const DEFAULT_VIEWPORTS = '390x844,768x1024,1440x900';
const DEFAULT_OUT = path.join('.ui-craft', 'shots');
const INSTALL_HINT = 'npm i -D playwright && npx playwright install chromium';

const USAGE = `Usage: node capture.mjs URL [options]

URL may be http(s)://, file://, or a local .html path. Local files are served from their folder
over http://127.0.0.1 (so ES modules, fetch and fonts work) unless --no-serve is given.

Options:
  --out DIR            output root (default: <folder of the local file>/.ui-craft/shots,
                       or ./.ui-craft/shots for URLs)
  --viewports LIST     comma list WxH (default ${DEFAULT_VIEWPORTS})
  --full-page          whole page as <vp>-full.png plus readable slices <vp>-full-01.png, -02...
  --motion             timed frames after load (${MOTION_FRAMES_MS.join('/')} ms) + scroll filmstrip
  --reduced-motion     emulate prefers-reduced-motion: reduce and check it is respected
  --dark               emulate prefers-color-scheme: dark
  --wait MS            extra wait after load before capturing (default 500)
  --focus-walk N       first viewport: press Tab N times, screenshot each stop (focus-<n>.png),
                       flag elements without a visible focus indicator
  --click SELECTOR     first viewport: click this element before after-click.png (repeatable,
                       clicked in order; use it to open menus and dialogs)
  --no-serve           open local files as raw file:// instead of serving them
  -h, --help           show this help

Every run scrolls through the page before probing and reports content that never becomes
visible ("hidden content").`;

class UsageError extends Error {}

// ---------- CLI ----------

function parseCli(argv) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        out: { type: 'string' },
        viewports: { type: 'string', default: DEFAULT_VIEWPORTS },
        'full-page': { type: 'boolean', default: false },
        motion: { type: 'boolean', default: false },
        'reduced-motion': { type: 'boolean', default: false },
        dark: { type: 'boolean', default: false },
        wait: { type: 'string', default: '500' },
        'focus-walk': { type: 'string', default: '0' },
        click: { type: 'string', multiple: true, default: [] },
        'no-serve': { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
    });
  } catch (err) {
    throw new UsageError(err.message);
  }
  const { values, positionals } = parsed;
  if (values.help) return { help: true };
  if (positionals.length !== 1) throw new UsageError('Expected exactly one URL.');
  const wait = Number(values.wait);
  if (!Number.isFinite(wait) || wait < 0) throw new UsageError(`--wait must be a number >= 0, got "${values.wait}"`);
  const focus = values['focus-walk'];
  if (!/^\d{1,3}$/.test(focus)) throw new UsageError(`--focus-walk must be a whole number 0-999, got "${focus}"`);
  const target = resolveTarget(positionals[0]);
  const outDefault = target.localFile ? path.join(path.dirname(target.localFile), DEFAULT_OUT) : DEFAULT_OUT;
  return {
    ...target,
    out: path.resolve(values.out ?? outDefault),
    viewports: parseViewports(values.viewports),
    fullPage: values['full-page'],
    motion: values.motion,
    reducedMotion: values['reduced-motion'],
    dark: values.dark,
    wait,
    focusWalk: Number(focus),
    click: values.click,
    serve: !values['no-serve'],
  };
}

function parseViewports(list) {
  return list.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
    const m = /^(\d{2,5})x(\d{2,5})$/i.exec(s);
    if (!m) throw new UsageError(`Bad viewport "${s}" (expected WxH, e.g. 390x844)`);
    return { name: `${m[1]}x${m[2]}`, width: Number(m[1]), height: Number(m[2]) };
  });
}

// -> { url: what to open without serving, localFile: absolute path when the page is on disk }
function resolveTarget(input) {
  const isFile = (p) => existsSync(p) && statSync(p).isFile();
  if (/^file:\/\//i.test(input)) {
    const file = fileURLToPath(input);
    return { url: input, localFile: isFile(file) ? file : null };
  }
  if (/^https?:\/\//i.test(input)) return { url: input, localFile: null };
  if (isFile(input)) {
    const file = path.resolve(input);
    return { url: pathToFileURL(file).href, localFile: file };
  }
  // host:port[/path] is always a server; a bare name ending in .html is a missing local file
  if (/^[\w.-]+:\d+(\/.*)?$/.test(input)) return { url: `http://${input}`, localFile: null };
  if (/^[\w.-]+(\/.*)?$/.test(input) && !/\.html?$/i.test(input)) return { url: `http://${input}`, localFile: null };
  throw new UsageError(`"${input}" is not a URL and no such file exists.`);
}

// ---------- Playwright resolution ----------

function loadPlaywright() {
  const bases = [path.join(process.cwd(), 'package.json'), fileURLToPath(import.meta.url)];
  for (const base of bases) {
    try {
      return createRequire(base)('playwright');
    } catch { /* try next location */ }
  }
  return null;
}

// ---------- per-viewport capture ----------

// --motion and interactions reload the page, so the same error can be seen twice; keep one of each.
function dedupeSink(sink) {
  const uniq = (arr, key) => [...new Map(arr.map((x) => [key(x), x])).values()];
  return {
    consoleErrors: uniq(sink.consoleErrors, (x) => x),
    pageErrors: uniq(sink.pageErrors, (x) => x),
    failedRequests: uniq(sink.failedRequests, (x) => `${x.status} ${x.url}`),
  };
}

function mergeAnimations(base, snapshots) {
  const key = (a) => `${a.target}|${a.name}|${a.properties.join(',')}|${a.duration}`;
  const map = new Map(base.items.map((a) => [key(a), a]));
  for (const snap of snapshots) for (const a of snap.items) if (!map.has(key(a))) map.set(key(a), a);
  const items = [...map.values()];
  return { ...base, total: Math.max(base.total, items.length), items: items.slice(0, MAX_LIST * 2) };
}

async function captureInteractions(page, opts, vp, dir) {
  if (!opts.focusWalk && !opts.click.length) return null;
  await navigate(page, opts.url, opts.wait); // start again from a fresh, unscrolled page
  const walk = opts.focusWalk ? await focusWalk(page, opts.focusWalk, vp, dir) : [];
  const clicked = opts.click.length
    ? await clickThrough(page, opts.click, dir)
    : { clicks: [], afterClick: null, titleAfter: null };
  return { focusWalk: walk, ...clicked };
}

async function captureViewport(browser, opts, vp, dir, isFirst) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    colorScheme: opts.dark ? 'dark' : 'light',
    reducedMotion: opts.reducedMotion ? 'reduce' : 'no-preference',
    bypassCSP: true, // probes build a helper with new Function(); strict CSP would block it
  });
  const sink = { consoleErrors: [], pageErrors: [], failedRequests: [] };
  try {
    await context.addInitScript(installClsObserver);
    const page = await context.newPage();
    attachCollectors(page, sink);
    await navigate(page, opts.url, opts.wait);
    const shot = path.join(dir, `${vp.name}.png`);
    await page.screenshot({ path: shot });
    const layout = await page.evaluate(probeLayout, probeArgs());
    const fonts = await page.evaluate(probeFonts);
    let animations = await page.evaluate(probeAnimations, probeArgs());
    const runningAtLoad = animations.running;
    const { scrollThrough: st, hidden } = await scrollThrough(page);
    const fullPage = opts.fullPage ? await captureFullPage(page, vp, dir) : null;
    const interactions = isFirst ? await captureInteractions(page, opts, vp, dir) : null;
    let motion = null;
    if (opts.motion) {
      const frames = await captureMotionFrames(page, opts.url, vp, dir);
      const strip = await captureFilmstrip(page, vp, dir);
      animations = mergeAnimations(animations, strip.animationSnapshots);
      motion = { frames, filmstrip: strip.shots };
    }
    return {
      viewport: vp.name, title: layout.title, shot, fullPage, ...dedupeSink(sink), layout, fonts, animations,
      runningAtLoad, scrollThrough: st, hiddenContent: hidden, interactions, motion,
    };
  } finally {
    await context.close();
  }
}

function runId() {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');
}

// ---------- main ----------

const isInside = (dir, file) => {
  const rel = path.relative(dir, file);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
};

// Serve root: the nearest ancestor holding package.json or .git (so "../assets/x.css" resolves),
// else the cwd when it contains the file, else the file's own folder.
function serveRootFor(file) {
  for (let dir = path.dirname(file); ; dir = path.dirname(dir)) {
    if (existsSync(path.join(dir, 'package.json')) || existsSync(path.join(dir, '.git'))) return dir;
    if (path.dirname(dir) === dir) break;
  }
  return isInside(process.cwd(), file) ? process.cwd() : path.dirname(file);
}

// Local files are served over http so ES modules, fetch() and fonts behave like production.
async function withTarget(opts, fn) {
  if (!opts.localFile || !opts.serve) return fn({ ...opts, source: opts.url });
  const root = serveRootFor(opts.localFile);
  const server = await startStaticServer(root);
  try {
    const rel = path.relative(root, opts.localFile).split(path.sep).map(encodeURIComponent).join('/');
    const url = `${server.origin}/${rel}`;
    return await fn({ ...opts, url, source: opts.localFile, serveRoot: root });
  } finally {
    await server.close();
  }
}

function printSummary(dir, results, report, mdPath) {
  console.log(`Output: ${dir}`);
  console.log('Look at (viewport shots, then full-page slices in order):');
  for (const r of results) {
    console.log(`  ${r.shot}`);
    for (const s of r.fullPage ? r.fullPage.slices : []) console.log(`  ${s}`);
  }
  const listed = results.reduce((n, r) => n + 1 + (r.fullPage ? r.fullPage.slices.length : 0), 0);
  const more = results.reduce((n, r) => n + allImages(r).length, 0) - listed;
  if (more) console.log(`  (+${more} more image(s): whole-page, motion, filmstrip, interactions; listed in report.md)`);
  console.log(`Report: ${mdPath}`);
  if (report.clean) {
    console.log('Report clean.');
    return;
  }
  const total = results.reduce((n, r) => n + r.findings.length, 0);
  const per = results.map((r) => `${r.viewport}: ${r.findings.length}`).join(', ');
  console.log(`Findings: ${total} line(s) (${per}); one problem can repeat per viewport. See report.md.`);
}

async function run(opts) {
  const pw = loadPlaywright();
  if (!pw) {
    console.error(`Playwright is not installed (looked in ${process.cwd()} and next to this script).\nInstall it in your project:\n\n  ${INSTALL_HINT}\n`);
    return 2;
  }
  const dir = path.join(opts.out, runId());
  mkdirSync(dir, { recursive: true });
  let browser;
  try {
    browser = await pw.chromium.launch();
  } catch (err) {
    console.error(`Could not launch Chromium: ${String(err.message || err).split('\n')[0]}\nRun: npx playwright install chromium`);
    return 2;
  }
  try {
    return await withTarget(opts, async (target) => {
      const results = [];
      for (const [i, vp] of target.viewports.entries()) {
        const v = await captureViewport(browser, target, vp, dir, i === 0);
        results.push({ ...v, findings: findingsFor(v, target) });
      }
      const { report, mdPath } = writeReports(dir, target, results);
      printSummary(dir, results, report, mdPath);
      return report.clean ? 0 : 1;
    });
  } finally {
    await browser.close();
  }
}

async function main() {
  let opts;
  try {
    opts = parseCli(process.argv.slice(2));
  } catch (err) {
    if (!(err instanceof UsageError)) throw err;
    console.error(`Error: ${err.message}\n\n${USAGE}`);
    return 2;
  }
  if (opts.help) {
    console.log(USAGE);
    return 0;
  }
  try {
    return await run(opts);
  } catch (err) {
    console.error(err instanceof CaptureError ? err.message : `Capture failed: ${err.stack || err}`);
    return 1;
  }
}

main().then((code) => { process.exitCode = code; });
