// Findings and report.json / report.md for capture.mjs. report.md is read by agents, so it is
// compact: summary table first, details second, each image path exactly once at the end.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { MIN_TARGET_PX } from './steps.mjs';

export const CLS_THRESHOLD = 0.1;

export function findingsFor(v, opts) {
  const f = [];
  if (v.consoleErrors.length) f.push(`${v.consoleErrors.length} console error(s)`);
  if (v.pageErrors.length) f.push(`${v.pageErrors.length} uncaught page error(s)`);
  if (v.failedRequests.length) f.push(`${v.failedRequests.length} failed request(s)`);
  if (v.layout.hasHorizontalOverflow) f.push(`horizontal overflow (scrollWidth ${v.layout.scrollWidth} > ${v.layout.viewportWidth})`);
  if (v.layout.imagesMissingAlt.length) f.push(`${v.layout.imagesMissingAlt.length} image(s) missing alt`);
  if (v.layout.smallTargets.length) f.push(`${v.layout.smallTargets.length} tap target(s) < ${MIN_TARGET_PX}x${MIN_TARGET_PX}px`);
  if (typeof v.fonts.cls === 'number' && v.fonts.cls > CLS_THRESHOLD) f.push(`CLS ${v.fonts.cls.toFixed(3)} > ${CLS_THRESHOLD}`);
  const nonComp = v.animations.items.filter((a) => a.nonComposited.length);
  if (nonComp.length) f.push(`${nonComp.length} animation(s) on non-composited properties`);
  if (opts.reducedMotion && v.runningAtLoad > 0) f.push(`prefers-reduced-motion not respected: ${v.runningAtLoad} animation(s) running`);
  if (v.hiddenContent.length) {
    const n = v.hiddenContent.reduce((s, h) => s + h.count, 0);
    const where = v.hiddenContent.slice(0, 3).map((h) => h.selector).join(', ');
    f.push(`hidden content: ${n} element(s) never became visible after scrolling through (${where})`);
  }
  const ix = v.interactions;
  if (ix) {
    for (const s of ix.focusWalk.filter((x) => !x.visibleIndicator)) f.push(`no visible focus: ${s.selector}`);
    for (const c of ix.clicks.filter((x) => !x.ok)) f.push(`click failed: ${c.selector} (${c.error})`);
  }
  return f;
}

const code = (s) => `\`${s}\``;
const ms = (d) => (typeof d === 'number' ? `${d}ms` : d);

function listOrNone(label, items, fmt) {
  if (!items.length) return '';
  return `${label}:\n${items.map((x) => `- ${fmt(x)}\n`).join('')}`;
}

function detailsMarkdown(v, opts) {
  const L = v.layout;
  let md = `### ${v.viewport}\n\n**Findings:** ${v.findings.length ? v.findings.join('; ') : 'none'}\n\n`;
  const errs = listOrNone('Console errors', v.consoleErrors, (e) => e)
    + listOrNone('Page errors', v.pageErrors, (e) => e)
    + listOrNone('Failed requests', v.failedRequests, (r) => `${r.status} ${r.url}`);
  md += errs ? `${errs}\n` : 'Errors: none.\n\n';
  md += `Page: "${L.title}", ${L.viewportWidth}px wide, ${L.pageHeight}px tall; scrollWidth ${L.scrollWidth}px → ${L.hasHorizontalOverflow ? '**overflow**' : 'ok'}.\n`;
  md += listOrNone('Elements sticking out of the viewport', L.overflowing, (o) => `${code(o.selector)} (right edge ${o.right}px)`);
  md += listOrNone('Images missing alt', L.imagesMissingAlt, (i) => `${code(i.selector)} ${i.src}`);
  md += listOrNone(`Tap targets < ${MIN_TARGET_PX}px`, L.smallTargets, (t) => `${code(t.selector)} ${t.width}x${t.height}`);
  const st = v.scrollThrough;
  md += `Scroll-through: ${st.steps} step(s) of ${st.stepPx}px before probing; hidden content: ${v.hiddenContent.length ? '' : 'none'}\n`;
  md += v.hiddenContent.map((h) => `- ${code(h.selector)} — ${h.reason} — ${h.count} element(s), e.g. "${h.sample}"\n`).join('');
  if (v.fullPage && v.fullPage.settledScrollLinked) {
    md += `Full-page images: ${v.fullPage.settledScrollLinked} scroll-linked animation(s) were set to their end state.\n`;
  }
  md += `\nFonts loaded: ${v.fonts.loadedFaces.join(', ') || 'none (system fonts only)'}\n`;
  md += Object.entries(v.fonts.computed).map(([k, val]) => `- ${code(k)}: ${val}\n`).join('');
  md += `CLS: ${v.fonts.cls === null ? 'unavailable' : v.fonts.cls.toFixed(3)} (target ≤ ${CLS_THRESHOLD})\n\n`;
  md += animationsMarkdown(v, opts);
  if (v.interactions) md += interactionsMarkdown(v.interactions);
  return md + '\n';
}

function animationsMarkdown(v, opts) {
  const A = v.animations;
  let md = `Animations (document.getAnimations): total ${A.total}, running at load ${v.runningAtLoad}\n`;
  if (opts.reducedMotion) {
    md += `- prefers-reduced-motion respected? ${v.runningAtLoad === 0 ? 'yes (nothing running)' : `**no** — ${v.runningAtLoad} running`}\n`;
  }
  if (!A.items.length) return md;
  md += '\n| targets | name | properties | duration | easing | iterations | flag |\n|---|---|---|---|---|---|---|\n';
  for (const g of groupAnimations(A.items)) {
    const shown = g.targets.slice(0, 2).map(code).join(', ');
    const extra = g.targets.length > 2 ? ` +${g.targets.length - 2} more` : '';
    const flag = g.nonComposited.length ? `non-composited: ${g.nonComposited.join(', ')}` : '';
    md += `| ${shown}${extra} | ${g.name} | ${g.properties.join(', ')} | ${ms(g.duration)} | ${g.easing} | ${g.iterations} | ${flag} |\n`;
  }
  return md;
}

// One row per distinct animation: transitions on the same element merge (opacity + transform),
// then identical animations on many elements collapse into one row with a target list.
function groupAnimations(items) {
  const merged = new Map();
  for (const a of items) {
    const isTransition = a.type === 'CSSTransition';
    const k = isTransition ? `T|${a.target}|${a.duration}|${a.easing}` : `A|${merged.size}`;
    const prev = merged.get(k);
    if (prev) {
      prev.properties = [...new Set([...prev.properties, ...a.properties])];
      prev.nonComposited = [...new Set([...prev.nonComposited, ...a.nonComposited])];
    } else {
      merged.set(k, { ...a, name: isTransition ? 'transition' : a.name });
    }
  }
  const groups = new Map();
  for (const a of merged.values()) {
    const k = [a.name, a.properties.join(','), a.duration, a.easing, a.iterations, a.nonComposited.join(',')].join('|');
    if (groups.has(k)) groups.get(k).targets.push(a.target);
    else groups.set(k, { ...a, targets: [a.target] });
  }
  return [...groups.values()];
}

function interactionsMarkdown(ix) {
  let md = '';
  if (ix.focusWalk.length) {
    md += '\nFocus walk (Tab order):\n\n| # | element | visible focus? | changed styles |\n|---|---|---|---|\n';
    for (const s of ix.focusWalk) md += `| ${s.index} | ${code(s.selector)} ${s.label} | ${s.visibleIndicator ? 'yes' : '**no**'} | ${s.changed.join(', ')} |\n`;
  }
  if (ix.clicks.length) {
    md += `\nClicks: ${ix.clicks.map((c) => `${code(c.selector)} ${c.ok ? 'ok' : `**failed** (${c.error})`}`).join(' → ')}; title after: "${ix.titleAfter}"\n`;
  }
  return md;
}

function filesMarkdown(v, dir) {
  const rel = (p) => code(path.relative(dir, p).split(path.sep).join('/'));
  let md = `### ${v.viewport}\n- Viewport: ${rel(v.shot)}\n`;
  if (v.fullPage) {
    md += `- Full page, read these slices in order (${v.fullPage.sliceHeight}px each): ${v.fullPage.slices.map(rel).join(', ')}\n`;
    md += `- Whole page in one image (too tall to read; for reference): ${rel(v.fullPage.full)}\n`;
  }
  if (v.motion) {
    md += `- Load frames: ${v.motion.frames.map((fr) => `t${fr.requestedMs} ${rel(fr.file)}`).join(', ')}\n`;
    md += `- Scroll filmstrip: ${v.motion.filmstrip.map(rel).join(', ')}\n`;
  }
  if (v.interactions) {
    if (v.interactions.focusWalk.length) md += `- Focus walk: ${v.interactions.focusWalk.map((s) => rel(s.file)).join(', ')}\n`;
    if (v.interactions.afterClick) md += `- After clicks: ${rel(v.interactions.afterClick)}\n`;
  }
  return md;
}

export function allImages(v) {
  return [
    v.shot,
    ...(v.fullPage ? [...v.fullPage.slices, v.fullPage.full] : []),
    ...(v.motion ? [...v.motion.frames.map((f) => f.file), ...v.motion.filmstrip] : []),
    ...(v.interactions ? [...v.interactions.focusWalk.map((s) => s.file), ...(v.interactions.afterClick ? [v.interactions.afterClick] : [])] : []),
  ];
}

export function writeReports(dir, opts, results) {
  const report = {
    url: opts.url,
    source: opts.source,
    runId: path.basename(dir),
    runIdTimezone: 'UTC',
    createdAt: new Date().toISOString(),
    options: {
      dark: opts.dark, reducedMotion: opts.reducedMotion, fullPage: opts.fullPage, motion: opts.motion,
      wait: opts.wait, serve: opts.serve, focusWalk: opts.focusWalk, click: opts.click,
    },
    clean: results.every((r) => r.findings.length === 0),
    viewports: results,
  };
  const jsonPath = path.join(dir, 'report.json');
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const total = results.reduce((n, r) => n + r.findings.length, 0);
  let md = '# ui-craft capture report\n\n';
  md += `- URL: ${opts.url}${opts.source !== opts.url ? ` (serving ${code(opts.source)})` : ''}\n`;
  md += `- Run: ${report.runId} (UTC) · ${opts.dark ? 'dark' : 'light'} color scheme${opts.reducedMotion ? ', reduced motion' : ''}\n`;
  md += `- Overall: ${report.clean ? 'clean' : `**issues found** (${total} finding line(s) across ${results.length} viewport(s))`}\n`;
  md += `- Images are in ${code(dir)}; paths below are relative to it.\n\n`;
  md += '## Summary\n\n| viewport | findings |\n|---|---|\n';
  md += results.map((r) => `| ${r.viewport} | ${r.findings.length ? r.findings.join('; ') : 'none'} |\n`).join('');
  md += '\nHow to look: open each viewport image, then the full-page slices in order (the single `-full.png` '
    + 'is too tall to read), then load frames and the filmstrip. A clean report cannot see ugly, only broken.\n\n';
  md += `## Details\n\n${results.map((r) => detailsMarkdown(r, opts)).join('')}`;
  md += `## Files\n\n${results.map((r) => filesMarkdown(r, dir)).join('\n')}`;
  const mdPath = path.join(dir, 'report.md');
  writeFileSync(mdPath, md);
  return { report, jsonPath, mdPath };
}
