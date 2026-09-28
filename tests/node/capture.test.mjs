// Tests for skills/ui-craft/scripts/capture.mjs. Requires `playwright` + chromium installed at
// the repo root (npm i -D playwright && npx playwright install chromium). Run: npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { FIX, ROOT, SCRIPT, SCRIPTS, VIEWPORT, captureInto as captureIn, runCapture } from './_helpers.mjs';

const GOOD = path.join(FIX, 'good.html');
const BAD = path.join(FIX, 'bad.html');

let tmp;
before(() => { tmp = mkdtempSync(path.join(os.tmpdir(), 'ui-craft-capture-')); });
after(() => { rmSync(tmp, { recursive: true, force: true }); });

const captureInto = (name, target, extra = []) => captureIn(tmp, name, target, extra);

test('--help exits 0 and prints usage', () => {
  const res = runCapture(['--help']);
  assert.equal(res.code, 0);
  assert.match(res.stdout, /Usage: node capture\.mjs URL/);
});

test('missing URL is a usage error (exit 2)', () => {
  const res = runCapture([]);
  assert.equal(res.code, 2);
  assert.match(res.stderr, /Expected exactly one URL/);
});

test('bad viewport and unknown option are usage errors (exit 2)', () => {
  assert.equal(runCapture([GOOD, '--viewports', 'big']).code, 2);
  assert.equal(runCapture([GOOD, '--bogus']).code, 2);
  assert.equal(runCapture(['no/such/page.html']).code, 2);
});

test('unreachable URL exits 1 with a clear message', () => {
  const res = runCapture(['http://127.0.0.1:9/', '--out', path.join(tmp, 'unreachable'), '--viewports', VIEWPORT]);
  assert.equal(res.code, 1);
  assert.match(res.stderr, /Could not load http:\/\/127\.0\.0\.1:9\//);
  assert.match(res.stderr, /dev server running/);
});

test('schemeless host:port/page.html is treated as a URL, not a missing file', () => {
  const res = runCapture(['127.0.0.1:9/index.html', '--out', path.join(tmp, 'schemeless'), '--viewports', VIEWPORT]);
  assert.equal(res.code, 1);
  assert.match(res.stderr, /Could not load http:\/\/127\.0\.0\.1:9\/index\.html/);
});

test('missing playwright prints install instructions and exits 2', () => {
  const isolated = mkdtempSync(path.join(os.tmpdir(), 'ui-craft-nopw-'));
  const copy = path.join(isolated, 'capture.mjs');
  cpSync(SCRIPT, copy);
  cpSync(path.join(SCRIPTS, 'capture'), path.join(isolated, 'capture'), { recursive: true });
  try {
    const res = runCapture([GOOD], { cwd: isolated, script: copy });
    assert.equal(res.code, 2);
    assert.match(res.stderr, /npm i -D playwright && npx playwright install chromium/);
  } finally {
    rmSync(isolated, { recursive: true, force: true });
  }
});

test('good page: clean report, screenshots written, exit 0 (local path input)', () => {
  const r = captureInto('good', GOOD, ['--full-page']);
  assert.equal(r.code, 0, r.stderr + r.stdout);
  assert.equal(r.report.clean, true);
  assert.deepEqual(r.vp.findings, []);
  assert.match(r.report.url, /^http:\/\/127\.0\.0\.1:\d+\/tests\/node\/fixtures\/good\.html$/, 'local files are auto-served');
  assert.equal(r.report.source, GOOD);
  for (const f of [`${VIEWPORT}.png`, `${VIEWPORT}-full-01.png`]) {
    const p = path.join(r.dir, f);
    assert.ok(existsSync(p), `${f} missing`);
    assert.ok(r.stdout.includes(p), `stdout should list ${p}`);
  }
  assert.ok(r.stdout.includes(path.join(r.dir, 'report.md')));
  assert.equal(r.vp.layout.hasHorizontalOverflow, false);
  assert.equal(r.vp.fonts.computed.h1.includes('Georgia'), true);
  assert.equal(typeof r.vp.fonts.cls, 'number');
  assert.match(r.md, /Overall: clean/);
});

test('bad page: every planted problem is reported, exit 1', () => {
  const r = captureInto('bad', pathToFileURL(BAD).href);
  assert.equal(r.code, 1);
  const v = r.vp;
  assert.equal(r.report.clean, false);
  assert.ok(v.consoleErrors.some((e) => e.includes('intentional console error')));
  assert.equal(v.layout.hasHorizontalOverflow, true);
  assert.ok(v.layout.scrollWidth > 390);
  assert.ok(v.layout.overflowing.some((o) => o.selector === '#wide-banner'));
  assert.equal(v.layout.imagesMissingAlt.length, 1);
  assert.ok(v.layout.smallTargets.some((t) => t.selector === '#tiny-btn' && t.width === 12));
  const grow = v.animations.items.find((a) => a.target === '#grower');
  assert.ok(grow, 'width animation should be listed');
  assert.deepEqual(grow.properties, ['width']);
  assert.deepEqual(grow.nonComposited, ['width']);
  assert.equal(grow.duration, 2000);
  assert.equal(grow.iterations, 'infinite');
  assert.match(r.md, /non-composited: width/);
  assert.match(r.md, /#wide-banner/);
  assert.match(r.md, /#tiny-btn/);
});

test('--reduced-motion flags pages that keep animating', () => {
  const r = captureInto('bad-rm', BAD, ['--reduced-motion']);
  assert.equal(r.code, 1);
  assert.ok(r.vp.findings.some((f) => f.startsWith('prefers-reduced-motion not respected')));
  assert.match(r.md, /prefers-reduced-motion respected\? \*\*no\*\*/);
});

test('--reduced-motion passes on a page that honours it; --dark emulates dark scheme', () => {
  const r = captureInto('good-rm', GOOD, ['--reduced-motion', '--dark']);
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.vp.runningAtLoad, 0);
  assert.equal(r.report.options.dark, true);
  assert.match(r.md, /dark color scheme, reduced motion/);
  assert.match(r.md, /respected\? yes/);
});

test('--motion writes timed frames and a scroll filmstrip', () => {
  const r = captureInto('good-motion', GOOD, ['--motion', '--wait', '0']);
  assert.equal(r.code, 0, r.stdout);
  for (const t of [0, 150, 300, 600, 1000]) {
    assert.ok(existsSync(path.join(r.dir, `motion-${VIEWPORT}-t${t}.png`)), `frame t${t} missing`);
  }
  const strip = r.vp.motion.filmstrip;
  assert.ok(strip.length >= 2, 'page is taller than one viewport, expect >= 2 filmstrip frames');
  strip.forEach((p, i) => {
    assert.equal(path.basename(p), `scroll-${VIEWPORT}-${i}.png`);
    assert.ok(existsSync(p));
  });
  const rise = r.vp.animations.items.find((a) => a.name === 'rise');
  assert.ok(rise, 'entrance animation should be seen');
  assert.deepEqual(rise.nonComposited, []);
  assert.equal(rise.easing, 'cubic-bezier(0.22, 1, 0.36, 1)');
});

test('multiple viewports produce one screenshot each', () => {
  const out = path.join(tmp, 'multi');
  const res = runCapture([GOOD, '--out', out, '--viewports', '390x844,1440x900']);
  assert.equal(res.code, 0, res.stderr);
  const dir = path.join(out, readdirSync(out)[0]);
  assert.ok(existsSync(path.join(dir, '390x844.png')));
  assert.ok(existsSync(path.join(dir, '1440x900.png')));
});

test('http URL: 404 subresources are reported as failed requests', async () => {
  const { createServer } = await import('node:http');
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>x</title>'
    + '<link rel="stylesheet" href="/missing.css"></head><body><h1>Hi</h1></body></html>';
  const server = createServer((req, res) => {
    if (req.url === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(html); return; }
    res.writeHead(404); res.end();
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  try {
    const out = path.join(tmp, 'http');
    const { spawn } = await import('node:child_process');
    const child = spawn(process.execPath, [SCRIPT, url, '--out', out, '--viewports', VIEWPORT], { cwd: ROOT });
    const code = await new Promise((resolve) => child.on('close', resolve));
    assert.equal(code, 1);
    const dir = path.join(out, readdirSync(out)[0]);
    const report = JSON.parse(readFileSync(path.join(dir, 'report.json'), 'utf8'));
    const failed = report.viewports[0].failedRequests;
    assert.ok(failed.some((f) => f.status === 404 && f.url.endsWith('/missing.css')), JSON.stringify(failed));
  } finally {
    server.close();
  }
});
