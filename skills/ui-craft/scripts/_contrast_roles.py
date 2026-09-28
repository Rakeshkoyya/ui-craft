"""Role-name heuristics that decide which CSS custom properties contrast.py pairs.

Not a CLI. Works on bare property names (without the leading --), e.g. "color-muted".
"""
import re

ON_COLOR_SUFFIXES = ("-foreground", "-text", "-fg")  # --accent-text sits on --accent
# roles for the opposite theme (inverse bands, dark sections) pair only with each other
DARK_FAMILY_RE = re.compile(r"(^|-)(inverse|inverted|dark)($|-)")
BG_RE = re.compile(r"(^|-)(bg|background|surface)($|-)")
FG_RE = re.compile(r"(^|-)(text|fg|foreground|muted|subtle|secondary|accent|link)($|-)")
FILL_RE = re.compile(r"(^|-)(soft|tint|fill|wash)($|-)")  # accent-soft is a fill, not text
NON_TEXT_RE = re.compile(r"(^|-)(focus|ring)($|-)|border-strong|input-border|control-border")


def same_family(a, b):
    """True when both names are dark/inverse roles or neither is."""
    return bool(DARK_FAMILY_RE.search(a)) == bool(DARK_FAMILY_RE.search(b))


def _backgrounds(colors):
    return sorted(n for n in colors if BG_RE.search(n))


def text_pairs(colors):
    """X-foreground/X pairs, plus text-like roles (text, muted, subtle, secondary, accent,
    link) on background-like roles (bg, background, surface) of the same theme family."""
    pairs = []
    for name in sorted(colors):
        for suffix in ON_COLOR_SUFFIXES:
            base = name[:-len(suffix)]
            if name.endswith(suffix) and base in colors:
                pairs.append((name, base))
                break
    paired = {fg for fg, _ in pairs}
    bg_like = _backgrounds(colors)
    fg_like = sorted(n for n in colors if n not in paired and n not in bg_like
                     and FG_RE.search(n) and not FILL_RE.search(n) and not NON_TEXT_RE.search(n))
    return pairs + [(f, b) for f in fg_like for b in bg_like if same_family(f, b)]


def non_text_pairs(colors):
    """UI-component roles (focus ring, strong/input borders) on backgrounds (WCAG 1.4.11)."""
    bg_like = _backgrounds(colors)
    ui_like = sorted(n for n in colors if NON_TEXT_RE.search(n) and n not in bg_like)
    return [(u, b) for u in ui_like for b in bg_like if same_family(u, b)]
