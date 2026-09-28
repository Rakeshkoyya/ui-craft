"""contrast.py: role-family auto-pairing, extra fg roles, and non-text (3:1) thresholds."""
import json

import pytest

import contrast

TOKENS = """
:root {
  --color-bg: #ffffff;
  --color-surface: #f6f6f4;
  --color-bg-subtle: #efefec;
  --color-text: #1a1a18;
  --color-muted: #5f5f58;
  --color-secondary: #56564f;
  --color-accent: #1d4ed8;
  --color-accent-text: #ffffff;
  --color-link: #1e40af;
  --color-text-inverse: #fafaf7;
  --color-bg-inverse: #1a1a18;
  --color-text-on-dark: #f0f0f0;
  --color-bg-dark: #111111;
  --color-border-strong: #8a8a84;
  --color-focus: #2563eb;
}
"""


def _pairs():
    return set(contrast.auto_pairs(contrast.parse_css_vars(TOKENS)))


def _write(tmp_path, css=TOKENS):
    path = tmp_path / "tokens.css"
    path.write_text(css, encoding="utf-8")
    return str(path)


def run(capsys, *argv):
    code = contrast.main(list(argv))
    out = capsys.readouterr()
    return code, out.out, out.err


# --- role families ---------------------------------------------------------------------------

@pytest.mark.parametrize("pair", [
    ("color-text-inverse", "color-bg"),
    ("color-text", "color-bg-inverse"),
    ("color-text-on-dark", "color-bg"),
    ("color-text", "color-bg-dark"),
    ("color-muted", "color-bg-inverse"),
])
def test_light_and_dark_roles_are_not_crossed(pair):
    assert pair not in _pairs()


@pytest.mark.parametrize("pair", [
    ("color-text-inverse", "color-bg-inverse"),
    ("color-text-on-dark", "color-bg-dark"),
])
def test_same_family_roles_are_paired(pair):
    assert pair in _pairs()


# --- extra foreground roles --------------------------------------------------------------------

@pytest.mark.parametrize("fg", ["color-muted", "color-secondary", "color-accent", "color-link"])
@pytest.mark.parametrize("bg", ["color-bg", "color-surface"])
def test_muted_accent_link_roles_are_checked_on_bg_and_surface(fg, bg):
    assert (fg, bg) in _pairs()


def test_background_named_subtle_is_not_a_foreground():
    assert not any(fg == "color-bg-subtle" for fg, _ in _pairs())


def test_on_color_suffix_pairing_is_kept():
    pairs = _pairs()
    assert ("color-accent-text", "color-accent") in pairs
    assert ("color-accent-text", "color-bg") not in pairs


def test_ui_component_roles_are_auto_paired_at_3_to_1(tmp_path, capsys):
    code, out, _ = run(capsys, "--css", _write(tmp_path), "--json")
    rows = {(r["fg"], r["bg"]): r for r in json.loads(out)["results"]}
    assert rows[("--color-border-strong", "--color-bg")]["threshold"] == 3.0
    assert rows[("--color-focus", "--color-surface")]["threshold"] == 3.0
    assert rows[("--color-text", "--color-bg")]["threshold"] == 4.5


# --- thresholds --------------------------------------------------------------------------------

def test_per_pair_threshold_suffix(tmp_path, capsys):
    code, out, _ = run(capsys, "--css", _write(tmp_path), "--pairs",
                       "color-border-strong:color-bg:3,color-text:color-bg", "--json")
    border, text = json.loads(out)["results"]
    assert 3.0 <= border["ratio"] < 4.5
    assert border["threshold"] == 3.0 and border["pass"] is True
    assert text["threshold"] == 4.5
    assert code == 0


def test_without_suffix_border_fails_text_threshold(tmp_path, capsys):
    code, out, _ = run(capsys, "--css", _write(tmp_path), "--pairs",
                       "color-border-strong:color-bg", "--json")
    assert code == 1 and json.loads(out)["results"][0]["pass"] is False


def test_non_text_flag_sets_3_to_1(tmp_path, capsys):
    code, out, _ = run(capsys, "--css", _write(tmp_path), "--pairs",
                       "color-border-strong:color-bg", "--non-text", "--json")
    row = json.loads(out)["results"][0]
    assert code == 0 and row["threshold"] == 3.0 and row["pass"] is True


def test_non_text_flag_for_a_single_pair(capsys):
    code, out, _ = run(capsys, "#8a8a84", "#ffffff", "--non-text")
    assert code == 0 and "3:1" in out


def test_threshold_column_in_markdown(tmp_path, capsys):
    code, out, _ = run(capsys, "--css", _write(tmp_path), "--pairs",
                       "color-border-strong:color-bg:3,color-text:color-bg")
    assert "| needs |" in out.splitlines()[0] or "needs" in out.splitlines()[0]
    assert "3:1" in out and "4.5:1" in out


def test_default_and_large_thresholds_reported(capsys):
    _, out, _ = run(capsys, "#000", "#fff", "--json")
    assert json.loads(out)["results"][0]["threshold"] == 4.5
    _, out, _ = run(capsys, "#000", "#fff", "--large", "--json")
    assert json.loads(out)["results"][0]["threshold"] == 3.0


@pytest.mark.parametrize("spec", ["color-text:color-bg:x", "color-text:color-bg:0.5",
                                  "color-text:color-bg:30", "a:b:3:4"])
def test_bad_threshold_is_usage_error(tmp_path, capsys, spec):
    code, _, err = run(capsys, "--css", _write(tmp_path), "--pairs", spec)
    assert code == 2 and "pairs" in err
