// Tests for capture.mjs: scroll-through + hidden content, auto-serving local files, full-page
// slices, compact report.md, --focus-walk and --click. Run: npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { FIX, SCRIPTS, VIEWPORT, captureInto as captureIn, readRun, runCapture } from './_helpers.mjs';

let tmp;
before(() => { tmp = mkdtempSync(path.join(os.tmpdir(), 'ui-craft-features-')); });
after(() => { rmSync(tmp, { recursive: true, force: true }); });

const captureInto = (name, target, extra = []) => captureIn(tmp, name, target, extra);
const hiddenFinding = (v) => v.findings.find((f) => f.startsWith('hidden content'));

// ---------- 1. scroll-through + hidden content ----------

test('reveal that never fires is reported as hidden content (exit 1)', () => {
  const r = captureInto('stuck', path.join(FIX, 'reveal-stuck.html'), ['--full-page']);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.ok(hiddenFinding(r.vp), `findings: ${r.vp.findings}`);
  const sels = r.vp.hiddenContent.map((h) => h.selector);
  assert.ok(sels.some((s) => s.includes('#collection')), JSON.stringify(r.vp.hiddenContent));
  assert.ok(r.vp.hiddenContent.every((h) => h.reason.includes('opacity')));
  assert.ok(!sels.some((s) => s.includes('h1')), 'visible intro must not be flagged');
  assert.ok(r.vp.scrollThrough.steps >= 2, JSON.stringify(r.vp.scrollThrough));
  assert.match(r.md, /#collection/);
});

test('IntersectionObserver and scroll-linked reveals are clean after the scroll-through', () => {
  const r = captureInto('io', path.join(FIX, 'reveal-io.html'), ['--full-page']);
  assert.equal(r.code, 0, `${r.vp.findings} ${JSON.stringify(r.vp.hiddenContent)}`);
  assert.deepEqual(r.vp.hiddenContent, []);
  assert.ok(r.vp.scrollThrough.steps >= 3);
});

// ---------- 2. local files are served over http ----------

test('local path with ES modules is auto-served and the module runs', () => {
  const r = captureInto('module', path.join(FIX, 'module', 'index.html'));
  assert.equal(r.code, 0, `${r.vp.findings} ${r.stderr}`);
  assert.match(r.report.url, /^http:\/\/127\.0\.0\.1:\d+\/tests\/node\/fixtures\/module\/index\.html$/);
  assert.equal(r.vp.title, 'module ran');
  assert.deepEqual(r.vp.consoleErrors, []);
});

test('file:// URL input is served too', () => {
  const r = captureInto('module-url', pathToFileURL(path.join(FIX, 'module', 'index.html')).href);
  assert.equal(r.code, 0, `${r.vp.findings}`);
  assert.equal(r.vp.title, 'module ran');
});

test('--no-serve keeps raw file:// (modules blocked, reported)', () => {
  const r = captureInto('module-noserve', path.join(FIX, 'module', 'index.html'), ['--no-serve']);
  assert.equal(r.code, 1);
  assert.ok(r.report.url.startsWith('file:///'));
  assert.notEqual(r.vp.title, 'module ran');
});

test('serve root is the project root, so ../ assets load', () => {
  const r = captureInto('parent', path.join(FIX, 'parent-asset', 'index.html'));
  assert.equal(r.code, 0, `${r.vp.findings} ${JSON.stringify(r.vp.failedRequests)}`);
  assert.deepEqual(r.vp.failedRequests, []);
  assert.equal(r.vp.title, 'parent assets loaded');
});

test('a served page whose asset 404s exits 1 with the failed request listed', () => {
  const r = captureInto('parent-broken', path.join(FIX, 'parent-asset', 'broken.html'));
  assert.equal(r.code, 1);
  assert.ok(r.vp.failedRequests.some((f) => f.status === 404 && f.url.endsWith('/assets/does-not-exist.css')));
  assert.ok(r.vp.findings.some((f) => f.includes('failed request')));
});

function rawGet(port, target) {
  return new Promise((resolve, reject) => {
    const sock = net.connect(port, '127.0.0.1', () => {
      sock.write(`GET ${target} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n`);
    });
    let data = '';
    sock.on('data', (d) => { data += d; });
    sock.on('end', () => resolve(data));
    sock.on('error', reject);
  });
}

test('static server: MIME types, 404, and path traversal refused', async () => {
  const { startStaticServer } = await import(pathToFileURL(path.join(SCRIPTS, 'capture', 'serve.mjs')).href);
  const server = await startStaticServer(path.join(FIX, 'module'));
  try {
    const port = new URL(server.origin).port;
    const js = await rawGet(port, '/mod.js');
    assert.match(js, /^HTTP\/1\.1 200/);
    assert.match(js, /content-type: text\/javascript/i);
    assert.match(await rawGet(port, '/dep.mjs'), /content-type: text\/javascript/i);
    assert.match(await rawGet(port, '/'), /content-type: text\/html/i);
    assert.match(await rawGet(port, '/nope.css'), /^HTTP\/1\.1 404/);
    for (const evil of ['/../good.html', '/%2e%2e/good.html', '/..%2fgood.html', '/..\\good.html', '/.git/config', '/%2egit/config']) {
      const res = await rawGet(port, evil);
      assert.match(res, /^HTTP\/1\.1 (400|403|404)/, `${evil} → ${res.split('\r\n')[0]}`);
      assert.doesNotMatch(res, /Good fixture/);
    }
  } finally {
    await server.close();
  }
});

test('--out defaults to <dir of the file>/.ui-craft/shots for local files', () => {
  const site = path.join(tmp, 'site');
  mkdirSync(site, { recursive: true });
  cpSync(path.join(FIX, 'good.html'), path.join(site, 'index.html'));
  const res = runCapture([path.join(site, 'index.html'), '--viewports', VIEWPORT]);
  assert.equal(res.code, 0, res.stderr);
  const { report } = readRun(path.join(site, '.ui-craft', 'shots'));
  assert.equal(report.clean, true);
});

// ---------- 3 + 4. slices and compact report ----------

test('--full-page writes slices and report.md lists each image once, summary first', () => {
  const r = captureInto('slices', path.join(FIX, 'reveal-io.html'), ['--full-page', '--motion', '--wait', '0']);
  const slices = r.vp.fullPage.slices;
  assert.ok(slices.length >= 2 && slices.length <= 12, JSON.stringify(slices));
  slices.forEach((s, i) => {
    assert.equal(path.basename(s), `${VIEWPORT}-full-${String(i + 1).padStart(2, '0')}.png`);
    assert.ok(existsSync(s));
  });
  const pngs = readdirSync(r.dir).filter((f) => f.endsWith('.png'));
  for (const f of pngs) {
    const n = r.md.split(f).length - 1;
    assert.equal(n, 1, `${f} appears ${n} times in report.md`);
  }
  const iSummary = r.md.indexOf('## Summary');
  const iFiles = r.md.indexOf('## Files');
  assert.ok(iSummary > 0 && iSummary < r.md.indexOf('## Details') && r.md.indexOf('## Details') < iFiles);
  assert.match(r.md, /slices/i);
  assert.doesNotMatch(r.md, /%ms/, 'scroll-linked durations must not get an ms suffix');
});

// ---------- 5. interactions ----------

test('--focus-walk screenshots each focus stop and flags missing focus indicators', () => {
  const r = captureInto('focus', path.join(FIX, 'focus.html'), ['--focus-walk', '3']);
  assert.equal(r.code, 1, r.stdout);
  const walk = r.vp.interactions.focusWalk;
  assert.equal(walk.length, 3);
  assert.deepEqual(walk.map((w) => w.selector), ['#ring', '#no-ring', '#custom']);
  assert.deepEqual(walk.map((w) => w.visibleIndicator), [true, false, true]);
  walk.forEach((w, i) => {
    assert.equal(path.basename(w.file), `focus-${i + 1}.png`);
    assert.ok(existsSync(w.file));
  });
  const noFocus = r.vp.findings.filter((f) => f.startsWith('no visible focus'));
  assert.equal(noFocus.length, 1);
  assert.match(noFocus[0], /#no-ring/);
});

test('--click opens a menu before after-click.png; a missing selector is a finding', () => {
  const ok = captureInto('click', path.join(FIX, 'focus.html'), ['--click', '#menu-btn']);
  assert.equal(ok.code, 0, `${ok.vp.findings}`);
  const { clicks, afterClick, titleAfter } = ok.vp.interactions;
  assert.deepEqual(clicks.map((c) => [c.selector, c.ok]), [['#menu-btn', true]]);
  assert.ok(existsSync(afterClick) && path.basename(afterClick) === 'after-click.png');
  assert.equal(titleAfter, 'Menu open');

  const bad = captureInto('click-missing', path.join(FIX, 'focus.html'), ['--click', '#menu-btn', '--click', '#nope']);
  assert.equal(bad.code, 1);
  assert.ok(bad.vp.findings.some((f) => f.startsWith('click failed') && f.includes('#nope')));
});

test('--focus-walk must be a positive integer', () => {
  assert.equal(runCapture([path.join(FIX, 'focus.html'), '--focus-walk', 'x']).code, 2);
});
