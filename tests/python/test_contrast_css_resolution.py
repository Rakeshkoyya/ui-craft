"""contrast.py --css against the token structure recommended in references/tokens.md:
primitive -> semantic var() chains, light-dark(), and non-color tokens sharing names."""
import contrast

TOKENS = """
:root {
  color-scheme: light dark;
  --gray-50: #fafaf7;
  --gray-900: #1a1a18;
  --gray-600: #5f5f58;
  --color-bg: light-dark(var(--gray-50), var(--gray-900));
  --color-text: light-dark(var(--gray-900), var(--gray-50));
  --color-text-muted: var(--gray-600);
  --text-lg: 1.125rem;
  --text-base: 1rem;
}
"""


def _write(tmp_path, css):
    path = tmp_path / "tokens.css"
    path.write_text(css, encoding="utf-8")
    return path


def test_resolves_var_chains_several_levels_deep():
    props = contrast.parse_css_vars(":root{--a:#111;--b:var(--a);--c:var(--b);}")
    assert contrast.resolve(props, "c") == "#111"


def test_resolve_stops_on_cycles():
    props = contrast.parse_css_vars(":root{--a:var(--b);--b:var(--a);}")
    try:
        contrast.resolve(props, "a")
    except KeyError:
        return
    raise AssertionError("cycle should raise KeyError")


def test_light_dark_is_checked_once_per_scheme(tmp_path):
    results = contrast.css_results(_write(tmp_path, TOKENS), "color-text:color-bg", False)
    schemes = sorted(r["scheme"] for r in results)
    assert schemes == ["dark", "light"]
    assert all(r["pass"] for r in results)


def test_auto_pairs_ignore_non_color_tokens(tmp_path):
    results = contrast.css_results(_write(tmp_path, TOKENS), None, False)
    labels = {(r["fg"], r["bg"]) for r in results}
    assert ("--color-text", "--color-bg") in labels
    assert ("--color-text-muted", "--color-bg") in labels
    assert not any(fg.startswith("--text-") for fg, _ in labels)


def test_single_scheme_values_have_no_scheme_suffix(tmp_path):
    css = ":root{--fg:#000;--bg:#fff;}"
    (result,) = contrast.css_results(_write(tmp_path, css), "fg:bg", False)
    assert "scheme" not in result


def test_suffix_text_pairs_only_with_its_base_color():
    props = contrast.parse_css_vars(
        ":root{--color-bg:#fff;--color-text:#111;--color-accent:#0a58ca;--color-accent-text:#fff;}")
    pairs = contrast.auto_pairs(props)
    assert ("color-accent-text", "color-accent") in pairs
    assert ("color-accent-text", "color-bg") not in pairs
    assert ("color-text", "color-bg") in pairs


def test_fallback_containing_a_function_resolves_cleanly():
    props = contrast.parse_css_vars(
        ":root{--text:var(--missing, rgb(17, 17, 17));--bg:var(--x, var(--y, oklch(0.98 0 0)));}")
    assert contrast.resolve(props, "text") == "rgb(17, 17, 17)"
    assert contrast.resolve(props, "bg") == "oklch(0.98 0 0)"


def test_defined_ref_wins_over_function_fallback():
    props = contrast.parse_css_vars(":root{--accent:#111111;--text:var(--accent, rgb(99,102,241));}")
    assert contrast.resolve(props, "text") == "#111111"
