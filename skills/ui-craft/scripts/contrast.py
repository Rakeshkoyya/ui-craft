"""WCAG 2.x contrast checker for colors, CSS custom properties, and the palette catalog.

Usage:
    python contrast.py "#6b6b6b" "#fafaf7"              # one pair (FG BG)
    python contrast.py "oklch(0.7 0.1 250)" "#111" --large
    python contrast.py --css src/styles/tokens.css      # auto-pairs text/bg, X-foreground/X
    python contrast.py --css tokens.css --pairs text:bg,muted:bg,border-strong:bg:3
    python contrast.py "#8a8a84" "#fff" --non-text      # UI component / graphic: 3:1
    python contrast.py --palettes                       # every row in data/palettes
    add --json for machine output

Colors: #rgb, #rgba, #rrggbb, #rrggbbaa (alpha composited on BG), rgb()/rgba(), hsl()/hsla(),
oklch() (out-of-gamut values are clamped), white/black/transparent.
Thresholds: AA 4.5 (AA-large 3.0), AAA 7.0 (AAA-large 4.5). A pair passes at AA, at 3:1 with
--large or --non-text (WCAG 1.4.11: borders, focus rings, icons), or at the per-pair threshold
given as a third field in --pairs (`fg:bg:3`). Every row reports the threshold it was held to.
--css reads the first definition of each property (usually :root), resolves var()
chains (with fallbacks), checks light-dark() values once per scheme, and auto-pairs only
properties whose values are colors.
Exit codes: 0 all pass, 1 any failure, 2 usage error.
"""
import argparse
import json
import math
import re
import sys
from pathlib import Path

from _common import data_dir, fail_usage, read_csv_dir, setup_stdio
from _contrast_roles import non_text_pairs, text_pairs

AA, AA_LARGE, AAA, AAA_LARGE = 4.5, 3.0, 7.0, 4.5
NAMED = {"white": (1.0, 1.0, 1.0, 1.0), "black": (0.0, 0.0, 0.0, 1.0),
         "transparent": (0.0, 0.0, 0.0, 0.0)}
PALETTE_PAIRS = (("text", "bg"), ("muted", "bg"), ("accent_text", "accent"))
OKLCH_PERCENT_CHROMA = 0.4  # CSS Color 4: 100% chroma = 0.4
FUNC_RE = re.compile(r"(rgba?|hsla?|oklch)\((.*)\)", re.I | re.S)
NUM_RE = re.compile(r"([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(%|deg|rad|grad|turn)?", re.I)
PROP_RE = re.compile(r"--([\w-]+)\s*:\s*([^;{}]+)")
LIGHT_DARK_RE = re.compile(r"light-dark\((.*)\)", re.I | re.S)
MAX_VAR_DEPTH = 10
VAR_START_RE = re.compile(r"var\(\s*(?=--)")
NON_TEXT = AA_LARGE  # WCAG 1.4.11 non-text contrast
MIN_THRESHOLD, MAX_THRESHOLD = 1.0, 21.0


# --- parsing ---------------------------------------------------------------------------------

def parse_color(text):
    """Parse a CSS color into (r, g, b, a) floats in 0..1 (sRGB). Raises ValueError."""
    s = (text or "").strip().lower()
    if s in NAMED:
        return NAMED[s]
    if s.startswith("#"):
        return _parse_hex(s)
    match = FUNC_RE.fullmatch(s)
    if not match:
        raise ValueError(f"unsupported color {text!r}")
    name, parts, alpha = match.group(1), *_split_args(match.group(2), text)
    if name.startswith("rgb"):
        rgb = tuple(_channel(p, text) for p in parts)
    elif name.startswith("hsl"):
        rgb = _hsl_to_rgb(*parts, text)
    else:
        rgb = _oklch_to_rgb(*parts, text)
    return (*rgb, _alpha(alpha, text))


def _parse_hex(s):
    digits = s[1:]
    if len(digits) in (3, 4):
        digits = "".join(c * 2 for c in digits)
    if len(digits) not in (6, 8) or not re.fullmatch(r"[0-9a-f]+", digits):
        raise ValueError(f"bad hex color {s!r}")
    vals = [int(digits[i:i + 2], 16) / 255 for i in range(0, len(digits), 2)]
    return tuple(vals) if len(vals) == 4 else (*vals, 1.0)


def _split_args(inner, original):
    alpha = None
    if "/" in inner:
        inner, alpha = inner.split("/", 1)
    parts = [p for p in re.split(r"[\s,]+", inner.strip()) if p]
    if alpha is None and len(parts) == 4:
        parts, alpha = parts[:3], parts[3]
    if len(parts) != 3:
        raise ValueError(f"expected 3 components in {original!r}")
    return parts, alpha


def _number(token, original):
    if token == "none":
        return 0.0, None
    match = NUM_RE.fullmatch(token)
    if not match:
        raise ValueError(f"bad number {token!r} in {original!r}")
    return float(match.group(1)), (match.group(2) or "").lower() or None


def _channel(token, original):
    value, unit = _number(token, original)
    return _clamp(value / 100 if unit == "%" else value / 255)


def _alpha(token, original):
    if token is None:
        return 1.0
    value, unit = _number(token.strip(), original)
    return _clamp(value / 100 if unit == "%" else value)


def _angle(token, original):
    value, unit = _number(token, original)
    factor = {"rad": 180 / math.pi, "grad": 0.9, "turn": 360.0}.get(unit, 1.0)
    return (value * factor) % 360


def _percent(token, original):
    value, unit = _number(token, original)
    return value / 100


def _hsl_to_rgb(h_tok, s_tok, l_tok, original):
    h = _angle(h_tok, original) / 360
    s, lum = _clamp(_percent(s_tok, original)), _clamp(_percent(l_tok, original))
    q = lum * (1 + s) if lum < 0.5 else lum + s - lum * s
    p = 2 * lum - q

    def hue(t):
        t %= 1
        if t < 1 / 6:
            return p + (q - p) * 6 * t
        if t < 1 / 2:
            return q
        if t < 2 / 3:
            return p + (q - p) * (2 / 3 - t) * 6
        return p
    return hue(h + 1 / 3), hue(h), hue(h - 1 / 3)


def _oklch_to_rgb(l_tok, c_tok, h_tok, original):
    lum, unit = _number(l_tok, original)
    lum = lum / 100 if unit == "%" else lum
    chroma, unit = _number(c_tok, original)
    chroma = chroma / 100 * OKLCH_PERCENT_CHROMA if unit == "%" else chroma
    hue = math.radians(_angle(h_tok, original))
    a, b = chroma * math.cos(hue), chroma * math.sin(hue)
    l_ = (lum + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m_ = (lum - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s_ = (lum - 0.0894841775 * a - 1.2914855480 * b) ** 3
    linear = (4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
              -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
              -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_)
    return tuple(_clamp(_gamma(v)) for v in linear)


def _gamma(v):
    if v <= 0.0031308:
        return 12.92 * v
    return 1.055 * v ** (1 / 2.4) - 0.055


def _clamp(v):
    return min(1.0, max(0.0, v))


# --- WCAG math -------------------------------------------------------------------------------

def to_hex(rgb):
    return "#" + "".join(f"{round(_clamp(v) * 255):02x}" for v in rgb)


def composite(fg, bg):
    """Alpha-composite fg over bg (bg itself composited over white)."""
    bg_rgb = [c * bg[3] + (1 - bg[3]) for c in bg[:3]]
    return tuple(f * fg[3] + b * (1 - fg[3]) for f, b in zip(fg[:3], bg_rgb)), tuple(bg_rgb)


def luminance(rgb):
    def lin(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast_ratio(fg, bg):
    """WCAG contrast ratio of two CSS color strings (fg alpha composited on bg)."""
    fg_rgb, bg_rgb = composite(parse_color(fg), parse_color(bg))
    hi, lo = sorted((luminance(fg_rgb), luminance(bg_rgb)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def grade(ratio):
    return {"AA": ratio >= AA, "AA-large": ratio >= AA_LARGE,
            "AAA": ratio >= AAA, "AAA-large": ratio >= AAA_LARGE}


def check(fg_label, bg_label, fg, bg, large=False, threshold=None, **extra):
    """Grade one pair. `threshold` overrides the pass level (default AA, or 3:1 with large)."""
    ratio = contrast_ratio(fg, bg)
    needed = threshold or (AA_LARGE if large else AA)
    result = {"fg": fg_label, "bg": bg_label, **extra, "ratio": round(ratio, 2), **grade(ratio),
              "threshold": needed}
    result["pass"] = ratio >= needed
    return result


# --- CSS custom properties -------------------------------------------------------------------

def parse_css_vars(text):
    """Return {name-without-dashes: value}; the first definition of each property wins."""
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    props = {}
    for name, value in PROP_RE.findall(text):
        props.setdefault(name, value.strip())
    return props


def resolve(props, name, _seen=None):
    """Value of --name with every var() substituted recursively. KeyError if unresolvable or cyclic."""
    seen = (_seen or set()) | {name}
    if len(seen) > MAX_VAR_DEPTH:
        raise KeyError(name)

    value = props[name]
    while True:
        call = _find_var(value)
        if call is None:
            return value
        start, end, ref, fallback = call
        if ref in seen:
            raise KeyError(f"cycle via --{ref}")
        if ref in props:
            replacement = resolve(props, ref, seen)
        elif fallback:
            replacement = fallback
        else:
            raise KeyError(ref)
        value = value[:start] + replacement + value[end:]


def _find_var(value):
    """First var(--ref[, fallback]) with balanced parens: (start, end, ref, fallback) or None."""
    match = VAR_START_RE.search(value)
    if not match:
        return None
    depth, pos = 1, match.end()
    while pos < len(value) and depth:
        depth += {"(": 1, ")": -1}.get(value[pos], 0)
        pos += 1
    if depth:
        raise KeyError(f"unbalanced var() in {value!r}")
    ref, _, fallback = value[match.end():pos - 1].partition(",")
    return match.start(), pos, ref.strip().lstrip("-"), fallback.strip()


def _split_top_level(args):
    """Split on commas that are not inside parentheses."""
    parts, depth, start = [], 0, 0
    for i, char in enumerate(args):
        depth += char == "("
        depth -= char == ")"
        if char == "," and depth == 0:
            parts.append(args[start:i].strip())
            start = i + 1
    parts.append(args[start:].strip())
    return parts


def by_scheme(value):
    """{'light': v, 'dark': v} for light-dark(), else {None: value}."""
    match = LIGHT_DARK_RE.fullmatch(value.strip())
    if match:
        parts = _split_top_level(match.group(1))
        if len(parts) == 2:
            return {"light": parts[0], "dark": parts[1]}
    return {None: value}


def _is_color(props, name):
    try:
        return all(parse_color(v) for v in by_scheme(resolve(props, name)).values())
    except (KeyError, ValueError):
        return False


def _color_names(props):
    return {n for n in props if _is_color(props, n)}


def auto_pairs(props):
    """Text pairs (fg, bg) among the color properties; see _contrast_roles.text_pairs."""
    return text_pairs(_color_names(props))


def auto_non_text_pairs(props):
    """UI-component pairs (fg, bg) checked at 3:1; see _contrast_roles.non_text_pairs."""
    return non_text_pairs(_color_names(props))


def _check_pair(props, fg, bg, large, threshold=None):
    """One result per color scheme (light-dark() values are checked in both)."""
    fg_by, bg_by = by_scheme(resolve(props, fg)), by_scheme(resolve(props, bg))
    schemes = [s for s in ("light", "dark") if s in fg_by or s in bg_by] or [None]
    results = []
    for scheme in schemes:
        fg_val = fg_by.get(scheme, fg_by.get(None))
        bg_val = bg_by.get(scheme, bg_by.get(None))
        extra = {"fg_value": fg_val, "bg_value": bg_val}
        if scheme:
            extra["scheme"] = scheme
        results.append(check(f"--{fg}", f"--{bg}", fg_val, bg_val, large, threshold, **extra))
    return results


def _parse_pairs(spec):
    """'fg:bg[:ratio],...' -> [(fg, bg, ratio or None)]."""
    pairs = []
    for item in spec.split(","):
        parts = [p.strip().lstrip("-") for p in item.split(":")]
        if len(parts) not in (2, 3) or not all(parts):
            raise ValueError(f"bad --pairs entry {item!r}; expected fg:bg or fg:bg:ratio")
        threshold = _parse_threshold(parts[2], item) if len(parts) == 3 else None
        pairs.append((parts[0], parts[1], threshold))
    return pairs


def _parse_threshold(text, item):
    try:
        value = float(text)
    except ValueError:
        value = 0.0
    if not MIN_THRESHOLD < value <= MAX_THRESHOLD:
        raise ValueError(f"bad --pairs threshold in {item!r}; use a ratio such as 3 or 4.5")
    return value


def css_results(path, pairs_spec, large, non_text=False):
    """Check CSS pairs. Raises ValueError for usage problems."""
    file = Path(path)
    if not file.is_file():
        raise ValueError(f"CSS file not found: {path}")
    props = parse_css_vars(file.read_text(encoding="utf-8", errors="replace"))
    explicit = bool(pairs_spec)
    default = NON_TEXT if non_text else None
    if explicit:
        pairs = [(fg, bg, t or default) for fg, bg, t in _parse_pairs(pairs_spec)]
    else:
        pairs = ([(fg, bg, default) for fg, bg in auto_pairs(props)]
                 + [(fg, bg, NON_TEXT) for fg, bg in auto_non_text_pairs(props)])
    if not pairs:
        raise ValueError("no text/background custom-property pairs found; pass --pairs fg:bg")
    results = []
    for fg, bg, threshold in pairs:
        try:
            results.extend(_check_pair(props, fg, bg, large, threshold))
        except (KeyError, ValueError) as exc:
            if explicit:
                raise ValueError(f"cannot check --{fg}:--{bg}: {exc}") from exc
            print(f"warning: skipped --{fg}/--{bg}: {exc}", file=sys.stderr)
    return results


def palette_results(large):
    """Check every palette row. Raises ValueError if the palettes dir is missing."""
    directory = data_dir() / "palettes"
    if not directory.is_dir():
        raise ValueError(f"palettes directory not found: {directory}")
    results, errors = [], 0
    for row in read_csv_dir(directory):
        for fg, bg in PALETTE_PAIRS:
            try:
                results.append(check(row.get(fg, ""), row.get(bg, ""), row.get(fg, ""),
                                     row.get(bg, ""), large, palette=row.get("id", "?"),
                                     pair=f"{fg}/{bg}"))
            except ValueError as exc:
                errors += 1
                print(f"error: palette {row.get('id', '?')} {fg}/{bg}: {exc}", file=sys.stderr)
    return results, errors


# --- CLI -------------------------------------------------------------------------------------

def _mark(ok):
    return "PASS" if ok else "FAIL"


def render(results):
    lines = ["| check | fg | bg | ratio | needs | AA | AA-large | AAA | result |",
             "|---|---|---|---|---|---|---|---|---|"]
    for r in results:
        label = f"{r['palette']} {r['pair']}" if "palette" in r else f"{r['fg']} on {r['bg']}"
        if "scheme" in r:
            label += f" ({r['scheme']})"
        fg, bg = r.get("fg_value", r["fg"]), r.get("bg_value", r["bg"])
        lines.append(f"| {label} | {fg} | {bg} | {r['ratio']:.2f}:1 | {r['threshold']:g}:1 | "
                     f"{_mark(r['AA'])} | "
                     f"{_mark(r['AA-large'])} | {_mark(r['AAA'])} | {_mark(r['pass'])} |")
    failed = sum(not r["pass"] for r in results)
    lines.append("")
    lines.append(f"{len(results) - failed} passed, {failed} failed")
    return "\n".join(lines)


def build_parser():
    parser = argparse.ArgumentParser(description="WCAG contrast checker (AA / AA-large / AAA).")
    parser.add_argument("colors", nargs="*", metavar="FG BG", help="foreground and background")
    parser.add_argument("--large", action="store_true", help="large text: pass at 3:1")
    parser.add_argument("--non-text", action="store_true",
                        help="UI components and graphics (WCAG 1.4.11): pass at 3:1")
    parser.add_argument("--css", metavar="FILE", help="read CSS custom properties from FILE")
    parser.add_argument("--pairs", help="with --css: comma-separated fg:bg[:ratio] property names, "
                             "e.g. text:bg,border-strong:bg:3")
    parser.add_argument("--palettes", action="store_true", help="check every data/palettes row")
    parser.add_argument("--json", action="store_true", help="machine-readable output")
    return parser


def _collect(args):
    """Return (results, extra_failures). Raises ValueError on usage errors."""
    modes = sum([bool(args.colors), bool(args.css), args.palettes])
    if modes != 1:
        raise ValueError("give FG BG, or --css FILE, or --palettes (exactly one)")
    if args.palettes:
        return palette_results(args.large)
    if args.css:
        return css_results(args.css, args.pairs, args.large, args.non_text), 0
    if len(args.colors) != 2:
        raise ValueError("expected exactly two colors: FG BG")
    fg, bg = args.colors
    return [check(fg, bg, fg, bg, args.large, NON_TEXT if args.non_text else None)], 0


def main(argv=None):
    args = build_parser().parse_args(argv)
    try:
        results, errors = _collect(args)
    except ValueError as exc:
        return fail_usage(str(exc))
    if args.json:
        print(json.dumps({"results": results, "errors": errors}, indent=2, ensure_ascii=False))
    else:
        print(render(results))
    return 1 if errors or any(not r["pass"] for r in results) else 0


if __name__ == "__main__":
    setup_stdio()
    sys.exit(main())
