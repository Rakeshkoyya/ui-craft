// Shared helpers for the capture.mjs tests (not a test file itself).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..', '..');
export const SCRIPTS = path.join(ROOT, 'skills', 'ui-craft', 'scripts');
export const SCRIPT = path.join(SCRIPTS, 'capture.mjs');
export const FIX = path.join(HERE, 'fixtures');
export const VIEWPORT = '390x844';

export function runCapture(args, { cwd = ROOT, script = SCRIPT } = {}) {
  const res = spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8', timeout: 180000 });
  return { code: res.status, stdout: res.stdout, stderr: res.stderr };
}

export function readRun(out) {
  const runs = existsSync(out) ? readdirSync(out) : [];
  assert.equal(runs.length, 1, `expected one run dir in ${out}`);
  const dir = path.join(out, runs[0]);
  const report = JSON.parse(readFileSync(path.join(dir, 'report.json'), 'utf8'));
  const md = readFileSync(path.join(dir, 'report.md'), 'utf8');
  return { dir, report, md, vp: report.viewports[0] };
}

export function captureInto(tmp, name, target, extra = []) {
  const out = path.join(tmp, name);
  const res = runCapture([target, '--out', out, '--viewports', VIEWPORT, ...extra]);
  let run;
  try {
    run = readRun(out);
  } catch (err) {
    err.message += `\nstdout: ${res.stdout}\nstderr: ${res.stderr}`;
    throw err;
  }
  return { ...res, ...run };
}
