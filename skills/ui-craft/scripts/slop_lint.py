"""Lint web UI source for mechanical "AI slop" and motion/accessibility anti-patterns.

Usage:
    python slop_lint.py src/
    python slop_lint.py index.html styles.css --severity high
    python slop_lint.py app/ --ignore UC006,UC013 --json

Scans .html .htm .css .scss .js .jsx .ts .tsx .vue .svelte .astro (skips node_modules, dist,
build, .next, .git, .nuxt, .svelte-kit, .output and *.min.* files). Output lines look like
`path:line: UCxxx [severity] message`. Suppress one finding with a comment containing
`ui-craft-ignore UC006` on the same or the previous line. Rule IDs match
references/anti-patterns.md. Exit codes: 0 clean, 1 findings, 2 usage error.
"""
import argparse
import json
import os
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path

from _common import setup_stdio

EXTS = {".html", ".htm", ".css", ".scss", ".js", ".jsx", ".ts", ".tsx", ".vue", ".svelte",
        ".astro"}
SKIP_DIRS = {"node_modules", "dist", "build", ".next", ".git", ".nuxt", ".svelte-kit", ".output"}
SEVERITY_RANK = {"low": 0, "med": 1, "high": 2}
SEVERITY_ALIASES = {"medium": "med"}
RULES = {
    "UC001": ("high", "transition: all animates every property, layout included - list the "
                      "properties (e.g. opacity, transform)"),
    "UC002": ("high", "animating layout properties (width/height/top/left/margin/padding) causes "
                      "reflow jank - animate transform/opacity instead"),
    "UC003": ("high", "animations found but no prefers-reduced-motion handling in the scanned "
                      "files - add a reduced-motion fallback (reported once)"),
    "UC004": ("high", "focus outline removed with no :focus-visible style in this file - "
                      "keyboard users lose their place"),
    "UC005": ("med", "default AI indigo/violet/purple gradient - choose a palette with intent"),
    "UC006": ("med", "100vh/h-screen jumps under mobile browser UI - use 100dvh/100svh "
                     "(h-dvh/h-svh); a 100vh line followed by a dvh/svh fallback is fine"),
    "UC007": ("med", "z-index >= 999 - use a small, named z-index scale"),
    "UC008": ("high", "<img> without alt - describe it, or alt=\"\" if decorative"),
    "UC009": ("med", "placeholder copy (lorem ipsum / 'Welcome to our website' / 'Your Company' "
                     "/ 'John Doe') - write real content"),
    "UC010": ("low", "emoji used as an icon in a heading/button/list item - use an SVG icon"),
    "UC011": ("med", "ease-in/linear on a UI transition feels sluggish on entry - use an "
                     "ease-out curve (ease-in-out, loops and infinite animations are not flagged)"),
    "UC012": ("med", "UI transition longer than 1000ms - keep UI motion ~150-600ms "
                     "(loops, marquees and delays are not flagged)"),
    "UC013": ("med", "headings/display type set in Inter/Roboto/Arial/system-ui - pick a display "
                     "face with character (reported once)"),
    "UC014": ("low", "pure #000 on #fff (or inverse) - soften to an off-black/off-white"),
    "UC015": ("med", "clickable <div>/<span> without role and tabindex - use <button>, or add "
                     "role, tabindex and key handling"),
    "UC016": ("low", "more than 5 !important in this file - fix specificity instead"),
    "UC017": ("med", "scroll/wheel/touch listener without { passive: true } - can block smooth "
                     "scrolling"),
    "UC018": ("high", "viewport meta blocks zoom (user-scalable=no / maximum-scale=1) - remove "
                      "it (WCAG 1.4.4)"),
}

EMOJI = "[\U0001F300-\U0001FAFF☀☕⚠⚡✅✔✨❌❤⭐]"
ATTRS = r"""(?:[^<>"'{}]|"[^"]*"|'[^']*'|\{(?:[^{}]|\{[^{}]*\})*\})*"""
LAYOUT = r"(?:width|height|top|left|right|bottom|margin(?:-[a-z]+)?|padding(?:-[a-z]+)?|" \
         r"(?:max|min)-(?:width|height))"
TIME_RE = re.compile(r"(?<![\w.])(\d*\.?\d+)(ms|s)\b")
LOOP_RE = re.compile(r"infinite|repeat|loop|marquee", re.I)
SUPPRESS_RE = re.compile(r"ui-craft-ignore((?:[\s,]+UC\d{3})+)")
# exits accelerate away, so ease-in is correct there (view-transition-old, .toast-exit, closed…)
EXIT_RE = re.compile(r"-old\b|\bexit|\bleav(?:e|ing)|\bclos(?:e|ed|ing)\b|\bhid(?:e|den|ing)\b"
                     r"|\bdismiss|fade-?out|slide-?out|(?<!ease)-out\b", re.I)
EXIT_CONTEXT_LINES = 2
SCRIPT_EXTS = {".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".vue", ".svelte", ".astro"}
MARKUP_EXTS = {".html", ".htm", ".vue", ".svelte", ".astro"}
BLOCK_COMMENT_RE = re.compile(r"/\*.*?\*/", re.S)
LINE_COMMENT_RE = re.compile(r"(?<![:\w\"'`\\])//[^\n]*")  # skips https:// and strings' "//"
HTML_COMMENT_RE = re.compile(r"<!--.*?-->", re.S)
ANIM_RE = re.compile(r"@keyframes|\btransition(?:-property|-duration)?\s*:|\banimation(?:-name)?\s*:"
                     r"|\.animate\(|\banimate=|(?<![\w-])(?:transition|animate)-[a-z\[]|\bgsap\."
                     r"|<motion\.|from\s+['\"](?:motion|framer-motion)")
REDUCED_RE = re.compile(r"prefers-reduced-motion|useReducedMotion|reducedMotion|motion-reduce:"
                        r"|motion-safe:")
LINE_RULES = [  # (rule, compiled regex) evaluated on every line
    ("UC001", re.compile(r"\btransition(?:-property)?\s*:\s*['\"]?all\b|(?<![\w-])transition-all\b")),
    ("UC002", re.compile(rf"(?<![\w-])transition-\[{LAYOUT}|\banimate=\{{\{{[^}}]*\b{LAYOUT}\s*:"
                         rf"|\bgsap\.(?:to|from|fromTo)\([^)]*\b{LAYOUT}\s*:")),
    ("UC005", re.compile(r"gradient\([^;]*#(?:6366f1|8b5cf6|a855f7|7c3aed|4f46e5|9333ea|818cf8|"
                         r"c084fc|a78bfa)\b|(?<![\w-])(?:from|via|to)-(?:indigo|violet|purple)-\d",
                         re.I)),
    ("UC009", re.compile(r"lorem ipsum|welcome to our (?:web)?site|\byour company\b|\b(?:john|jane) "
                         r"doe\b", re.I)),
    ("UC010", re.compile(rf"<(?:h[1-6]|button|li)\b[^>]*>[^<]*{EMOJI}|content\s*:\s*['\"][^'\"]*"
                         rf"{EMOJI}", re.I)),
    ("UC018", re.compile(r"user-scalable\s*=\s*(?:no|0)\b|maximum-scale\s*=\s*1(?:\.0*)?(?![\d.])"
                         r"|userScalable\s*:\s*false|maximumScale\s*:\s*1(?![\d.])")),
]


@dataclass(frozen=True)
class Finding:
    path: str
    line: int
    rule: str
    severity: str
    message: str

    def __str__(self):
        return f"{self.path}:{self.line}: {self.rule} [{self.severity}] {self.message}"


def line_of(text, offset):
    return text.count("\n", 0, offset) + 1


# --- per-line checks -------------------------------------------------------------------------

def _first_times_ms(value):
    """First time token of each comma-separated part (the duration), in ms."""
    out = []
    for part in value.split(","):
        match = TIME_RE.search(part)
        if match:
            out.append(float(match.group(1)) * (1 if match.group(2) == "ms" else 1000))
    return out


def _uc002_transition(line):
    for value in re.findall(r"\btransition(?:-property)?\s*:\s*['\"]?([^;{}'\"]*)", line):
        props = [p.strip().split(" ")[0] for p in value.split(",")]
        if any(re.fullmatch(LAYOUT, p) for p in props):
            return True
    return False


def _uc006(line, next_line):
    if not re.search(r"\b100vh\b|(?<![\w-])(?:min-|max-)?h-screen\b", line):
        return False
    return not re.search(r"\d[dsl]vh\b|h-[dsl]vh\b", line + " " + next_line)


def _uc007(line):
    for groups in re.findall(r"\bz-index\s*:\s*(\d+)|\bzIndex\s*:\s*['\"]?(\d+)"
                             r"|(?<![\w-])z-\[(\d+)\]", line):
        if int(next(g for g in groups if g)) >= 999:
            return True
    return False


def _uc011(line, context=""):
    """context: the preceding lines, to recognise exits (ease-in is right for exits)."""
    if not re.search(r"\btransition|\banimation\s*:|\bease\s*:", line) or LOOP_RE.search(line):
        return False
    if EXIT_RE.search(context + "\n" + line):
        return False
    return bool(re.search(r"(?<![\w-])ease-in\b(?!-)|(?<![\w-])(?:ease-)?linear\b(?![-(])"
                          r"|\bease\s*:\s*['\"](?:linear|easeIn|power\d\.in|expo\.in)['\"]",
                          line))


def _uc012(line, is_lenis):
    if LOOP_RE.search(line):
        return False
    times = []
    for value in re.findall(r"\b(?:transition|animation)(?:-duration)?\s*:\s*([^;{}]*)", line):
        times += _first_times_ms(value)
    times += [float(v) for v in re.findall(r"(?<![\w-])duration-(\d+)\b", line)]
    times += [float(v) * (1 if u == "ms" else 1000)
              for v, u in re.findall(r"duration-\[(\d*\.?\d+)(ms|s)\]", line)]
    if not is_lenis:
        for raw in re.findall(r"\bduration\s*:\s*(\d*\.?\d+)(?![\d.])(?!\s*m?s\b)", line):
            value = float(raw)
            times.append(value * 1000 if value < 20 else value)  # JS libs use seconds
    return any(t > 1000 for t in times)


def _uc014_line(line):
    return bool(re.search(r"(?<![\w-])bg-white\b", line) and re.search(r"(?<![\w-])text-black\b", line)
                or re.search(r"(?<![\w-])bg-black\b", line)
                and re.search(r"(?<![\w-])text-white\b", line))


def line_findings(lines, text):
    is_lenis = "new Lenis(" in text
    for i, line in enumerate(lines):
        nxt = lines[i + 1] if i + 1 < len(lines) else ""
        for rule, regex in LINE_RULES:
            if regex.search(line):
                yield i + 1, rule
        checks = (("UC002", _uc002_transition(line)), ("UC006", _uc006(line, nxt)),
                  ("UC007", _uc007(line)),
                  ("UC011", _uc011(line, "\n".join(lines[max(0, i - EXIT_CONTEXT_LINES):i]))),
                  ("UC012", _uc012(line, is_lenis)), ("UC014", _uc014_line(line)))
        for rule, hit in checks:
            if hit:
                yield i + 1, rule


# --- whole-file checks -----------------------------------------------------------------------

def _keyframe_layout(text):
    for match in re.finditer(r"@keyframes\s+[\w-]+\s*\{", text):
        depth, pos = 1, match.end()
        while depth and pos < len(text):
            depth += {"{": 1, "}": -1}.get(text[pos], 0)
            pos += 1
        body = text[match.end():pos]
        for decl in re.finditer(rf"(?<![\w-]){LAYOUT}\s*:", body):
            yield line_of(text, match.end() + decl.start()), "UC002"


def _css_blocks(text):
    """Yield (selector, own_body, body_offset) for every rule, nested ones included.

    own_body blanks out nested child blocks (same length, so offsets map to lines), so a parent
    only sees its own declarations, as in nested SCSS / native CSS nesting.
    """
    stack, boundary = [], 0
    for i, char in enumerate(text):
        if char == "{":
            stack.append((text[boundary:i], i + 1))
            boundary = i + 1
        elif char == "}":
            if stack:
                selector, start = stack.pop()
                yield selector, _blank_nested(text[start:i]), start
            boundary = i + 1
        elif char == ";":
            boundary = i + 1


def _blank_nested(body):
    out, depth = [], 0
    for char in body:
        depth += char == "{"
        out.append(char if depth == 0 else " ")
        depth -= char == "}" and depth > 0
    return "".join(out)


def _uc013(text):
    families = r"['\"]?(?:Inter|Roboto|Arial|system-ui)\b"
    for selector, body, start in _css_blocks(text):
        if re.search(r"(?<![\w-])h[1-6]\b|heading|display|title|hero|headline", selector, re.I):
            match = re.search(rf"font-family\s*:\s*{families}", body, re.I)
            if match:
                yield line_of(text, start + match.start()), "UC013"
    for match in re.finditer(rf"--font-(?:display|heading|headline|title)\s*:\s*{families}"
                             rf"|\b(?:display|heading)\s*:\s*\[\s*{families}", text, re.I):
        yield line_of(text, match.start()), "UC013"


def _uc014_blocks(text):
    black, white = r"(?:#000(?:000)?|black)\b", r"(?:#fff(?:fff)?|white)\b"
    for _, body, start in _css_blocks(text):
        for fg, bg in ((black, white), (white, black)):
            color = re.search(rf"(?<![\w-])color\s*:\s*{fg}", body, re.I)
            if color and re.search(rf"background(?:-color)?\s*:\s*{bg}", body, re.I):
                yield line_of(text, start + color.start()), "UC014"


def _tags(text, names):
    for match in re.finditer(rf"<(?:{names})\b({ATTRS})>", text, re.I):
        yield match.start(), match.group(1)


def _call_args(text, open_paren):
    depth, pos = 0, open_paren
    while pos < len(text):
        depth += {"(": 1, ")": -1}.get(text[pos], 0)
        if depth == 0:
            return text[open_paren + 1:pos]
        pos += 1
    return text[open_paren + 1:]


def _uc017(text):
    for match in re.finditer(r"addEventListener\(\s*['\"](?:scroll|wheel|touchstart|touchmove)['\"]",
                             text):
        args = _call_args(text, match.start() + len("addEventListener"))
        if re.search(r"passive\s*:\s*true", args):
            continue
        third = re.split(r",(?![^{(]*[})])", args)[2:3]
        if third and re.fullmatch(r"\s*[A-Za-z_$][\w$.]*\s*", third[0]) and \
                third[0].strip() not in ("true", "false"):
            continue  # options passed by reference: can't tell
        yield line_of(text, match.start()), "UC017"


def file_findings(text):
    yield from _keyframe_layout(text)
    yield from _uc013(text)
    yield from _uc014_blocks(text)
    yield from _uc017(text)
    if not re.search(r":focus-visible|focus-visible:", text):
        for match in re.finditer(r"\boutline\s*:\s*(?:none|0)\b|(?<![\w-])outline-(?:none|hidden)\b",
                                 text):
            yield line_of(text, match.start()), "UC004"
    for offset, attrs in _tags(text, "img"):
        if not re.search(r"(?<![\w-])alt\b(?!-)", attrs):
            yield line_of(text, offset), "UC008"
    for offset, attrs in _tags(text, "div|span"):
        if re.search(r"(?<![\w-])(?:onClick|@click|v-on:click|on:click)\b", attrs, re.I) and not (
                re.search(r"(?<![\w-])role\s*=", attrs) and re.search(r"tabindex", attrs, re.I)):
            yield line_of(text, offset), "UC015"
    importants = [m.start() for m in re.finditer(r"!important", text)]
    if len(importants) > 5:
        yield line_of(text, importants[5]), "UC016"


# --- driver ----------------------------------------------------------------------------------

def _suppressed(lines):
    per_line = {}
    for i, line in enumerate(lines, 1):
        match = SUPPRESS_RE.search(line)
        if match:
            per_line[i] = set(re.findall(r"UC\d{3}", match.group(1)))
    return lambda line, rule: rule in per_line.get(line, set()) | per_line.get(line - 1, set())


def _display(path):
    try:
        rel = os.path.relpath(path)
        shown = path if rel.startswith("..") else rel
    except ValueError:  # different drive on Windows
        shown = path
    return str(shown).replace("\\", "/")


def _blank(match):
    return re.sub(r"[^\n]", " ", match.group(0))


def strip_comments(text, suffix):
    """Blank out comments (keeping newlines, so line numbers hold) so examples in docs and
    commented-out code aren't linted."""
    text = BLOCK_COMMENT_RE.sub(_blank, text)
    if suffix in SCRIPT_EXTS:
        text = LINE_COMMENT_RE.sub(_blank, text)
    if suffix in MARKUP_EXTS:
        text = HTML_COMMENT_RE.sub(_blank, text)
    return text


def lint_text(path, text):
    is_suppressed = _suppressed(text.splitlines())  # suppression lives in comments: read first
    text = strip_comments(text, Path(str(path)).suffix.lower())
    lines = text.splitlines()
    hits = sorted(set(line_findings(lines, text)) | set(file_findings(text)))
    return [Finding(_display(path), line, rule, *RULES[rule]) for line, rule in hits
            if not is_suppressed(line, rule)]


def iter_files(paths):
    for root in paths:
        root = Path(root)
        if root.is_file():
            yield root
            continue
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS)
            for name in sorted(filenames):
                if Path(name).suffix.lower() in EXTS and ".min." not in name:
                    yield Path(dirpath) / name


def lint_paths(paths, stats=None):
    """Lint files/directories; returns findings in path/line order (unfiltered)."""
    findings, first_anim, has_reduced, scanned = [], None, False, 0
    for path in iter_files(paths):
        text = path.read_bytes().decode("utf-8", errors="replace")
        scanned += 1
        findings += lint_text(path, text)
        has_reduced = has_reduced or bool(REDUCED_RE.search(text))
        anim = ANIM_RE.search(text)
        if anim and first_anim is None:
            first_anim = Finding(_display(path), line_of(text, anim.start()), "UC003",
                                 *RULES["UC003"])
    if first_anim and not has_reduced:
        findings.append(first_anim)
    first_uc013 = next((f for f in findings if f.rule == "UC013"), None)
    findings = [f for f in findings if f.rule != "UC013" or f is first_uc013]
    if stats is not None:
        stats["files_scanned"] = scanned
    return sorted(findings, key=lambda f: (f.path, f.line, f.rule))


def _parse_filters(args):
    ignore = {r.strip().upper() for r in (args.ignore or "").split(",") if r.strip()}
    unknown = sorted(ignore - set(RULES))
    if unknown:
        raise ValueError(f"unknown rule id(s) in --ignore: {', '.join(unknown)}")
    severity = SEVERITY_ALIASES.get(args.severity.lower(), args.severity.lower())
    if severity not in SEVERITY_RANK:
        raise ValueError(f"--severity must be one of low, med, high (got {args.severity!r})")
    missing = [p for p in args.paths if not Path(p).exists()]
    if missing:
        raise ValueError(f"path not found: {', '.join(missing)}")
    return ignore, SEVERITY_RANK[severity]


def build_parser():
    parser = argparse.ArgumentParser(description="Lint UI code for mechanical anti-patterns.")
    parser.add_argument("paths", nargs="+", metavar="PATH", help="files or directories")
    parser.add_argument("--json", action="store_true", help="machine-readable output")
    parser.add_argument("--ignore", help="comma-separated rule ids to skip, e.g. UC006,UC013")
    parser.add_argument("--severity", default="low",
                        help="minimum severity to report: low (default), med, high")
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    try:
        ignore, min_rank = _parse_filters(args)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    stats = {}
    findings = [f for f in lint_paths(args.paths, stats)
                if f.rule not in ignore and SEVERITY_RANK[f.severity] >= min_rank]
    if args.json:
        print(json.dumps({"findings": [asdict(f) for f in findings], "count": len(findings),
                          "files_scanned": stats["files_scanned"]}, indent=2, ensure_ascii=False))
    elif findings:
        print("\n".join(str(f) for f in findings))
        print(f"\n{len(findings)} finding(s) in {stats['files_scanned']} file(s)")
    else:
        print(f"No issues found in {stats['files_scanned']} file(s).")
    return 1 if findings else 0


if __name__ == "__main__":
    setup_stdio()
    sys.exit(main())
