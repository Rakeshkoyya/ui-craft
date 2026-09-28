"""Tests for scripts/contrast.py (WCAG contrast checker)."""
import json

import pytest

import contrast
from conftest import run_script


def close(a, b, tol=0.004):
    return all(abs(x - y) <= tol for x, y in zip(a, b))


def run(capsys, *argv):
    code = contrast.main(list(argv))
    out = capsys.readouterr()
    return code, out.out, out.err


# --- parsing ---------------------------------------------------------------------------------

@pytest.mark.parametrize("text,rgba", [
    ("#fff", (1, 1, 1, 1)),
    ("#000000", (0, 0, 0, 1)),
    ("#FF0000", (1, 0, 0, 1)),
    ("#ff000080", (1, 0, 0, 128 / 255)),
    ("#f008", (1, 0, 0, 0x88 / 255)),
    ("rgb(255, 0, 0)", (1, 0, 0, 1)),
    ("rgb(255 0 0 / 50%)", (1, 0, 0, 0.5)),
    ("rgba(0,0,255,0.25)", (0, 0, 1, 0.25)),
    ("rgb(100% 0% 0%)", (1, 0, 0, 1)),
    ("hsl(0 100% 50%)", (1, 0, 0, 1)),
    ("hsl(120, 100%, 25%)", (0, 0.5, 0, 1)),
    ("hsla(240deg 100% 50% / 0.5)", (0, 0, 1, 0.5)),
    ("white", (1, 1, 1, 1)),
    ("black", (0, 0, 0, 1)),
])
def test_parse_color(text, rgba):
    assert close(contrast.parse_color(text), rgba)


def test_oklch_red_matches_srgb_red():
    r, g, b, a = contrast.parse_color("oklch(0.628 0.2577 29.23)")
    assert contrast.to_hex((r, g, b)) == "#ff0000"
    assert a == 1


@pytest.mark.parametrize("text,hexval", [
    ("oklch(1 0 0)", "#ffffff"),
    ("oklch(0 0 0)", "#000000"),
    ("oklch(62.8% 0.2577 29.23)", "#ff0000"),
    ("oklch(0.5198 0.1769 142.5)", "#008000"),
    ("oklch(0.452 0.313 264.05)", "#0000ff"),
])
def test_oklch_known_values(text, hexval):
    assert contrast.to_hex(contrast.parse_color(text)[:3]) == hexval


def test_oklch_with_alpha():
    assert contrast.parse_color("oklch(1 0 0 / 0.5)")[3] == pytest.approx(0.5)


@pytest.mark.parametrize("bad", ["", "#12", "#12345", "rgb(1,2)", "banana", "hsl(a b c)",
                                 "oklch(1 0)", "#gggggg"])
def test_parse_color_rejects_bad_input(bad):
    with pytest.raises(ValueError):
        contrast.parse_color(bad)


# --- ratio -----------------------------------------------------------------------------------

@pytest.mark.parametrize("fg,bg,ratio", [
    ("#777", "#fff", 4.48),
    ("#767676", "#ffffff", 4.54),
    ("#000", "#fff", 21.0),
    ("#fff", "#fff", 1.0),
    ("#fff", "#000", 21.0),
])
def test_contrast_ratio(fg, bg, ratio):
    assert round(contrast.contrast_ratio(fg, bg), 2) == ratio


def test_alpha_is_composited_on_background():
    # 50% black on white is ~#808080
    assert round(contrast.contrast_ratio("#00000080", "#fff"), 2) == round(
        contrast.contrast_ratio("#7f7f7f", "#fff"), 2)


def test_thresholds():
    res = contrast.grade(4.48)
    assert res == {"AA": False, "AA-large": True, "AAA": False, "AAA-large": False}
    res = contrast.grade(7.0)
    assert all(res.values())
    assert contrast.grade(3.0)["AA-large"] is True
    assert contrast.grade(2.99)["AA-large"] is False


# --- CLI: pair -------------------------------------------------------------------------------

def test_pair_pass(capsys):
    code, out, _ = run(capsys, "#1c1917", "#faf7f2")
    assert code == 0 and "PASS" in out


def test_pair_fail_exit_1(capsys):
    code, out, _ = run(capsys, "#777", "#fff")
    assert code == 1
    assert "4.48" in out and "FAIL" in out


def test_pair_large_passes_at_3(capsys):
    code, _, _ = run(capsys, "#777", "#fff", "--large")
    assert code == 0


def test_pair_json(capsys):
    code, out, _ = run(capsys, "#777", "#fff", "--json")
    payload = json.loads(out)
    assert code == 1
    assert payload["results"][0]["ratio"] == 4.48
    assert payload["results"][0]["AA"] is False
    assert payload["results"][0]["pass"] is False


def test_bad_color_exit_2(capsys):
    code, _, err = run(capsys, "#12", "#fff")
    assert code == 2 and "#12" in err


def test_no_arguments_exit_2(capsys):
    code, _, err = run(capsys)
    assert code == 2 and err


# --- CLI: --css ------------------------------------------------------------------------------

CSS = """
:root {
  --gray-900: #1c1917;
  --gray-400: #a8a29e;
  --bg: #ffffff;
  --text: var(--gray-900);
  --muted: var(--gray-400);
  --primary: oklch(0.45 0.2 260);
  --primary-foreground: #fff;
  --radius: 8px;
  --ghost: var(--missing, #222);
}
.dark { --bg: #000; --text: #fff; }
"""


def test_parse_css_vars_first_definition_wins():
    props = contrast.parse_css_vars(CSS)
    assert props["bg"] == "#ffffff"
    assert props["text"] == "var(--gray-900)"


def test_resolve_var_one_level():
    props = contrast.parse_css_vars(CSS)
    assert contrast.resolve(props, "text") == "#1c1917"
    assert contrast.resolve(props, "ghost") == "#222"
    with pytest.raises(KeyError):
        contrast.resolve(props, "nope")


def test_css_explicit_pairs(tmp_path, capsys):
    css = tmp_path / "tokens.css"
    css.write_text(CSS, encoding="utf-8")
    code, out, _ = run(capsys, "--css", str(css), "--pairs", "text:bg,--muted:--bg", "--json")
    results = json.loads(out)["results"]
    assert code == 1  # muted fails
    assert [r["pass"] for r in results] == [True, False]
    assert results[0]["fg"] == "--text"


def test_css_auto_pairs(tmp_path, capsys):
    css = tmp_path / "tokens.css"
    css.write_text(CSS, encoding="utf-8")
    code, out, _ = run(capsys, "--css", str(css), "--json")
    pairs = {(r["fg"], r["bg"]) for r in json.loads(out)["results"]}
    assert ("--primary-foreground", "--primary") in pairs
    assert ("--text", "--bg") in pairs


def test_css_unknown_pair_is_usage_error(tmp_path, capsys):
    css = tmp_path / "tokens.css"
    css.write_text(CSS, encoding="utf-8")
    code, _, err = run(capsys, "--css", str(css), "--pairs", "text:nope")
    assert code == 2 and "nope" in err


def test_css_missing_file(tmp_path, capsys):
    code, _, err = run(capsys, "--css", str(tmp_path / "x.css"))
    assert code == 2 and "x.css" in err


def test_css_without_pairs(tmp_path, capsys):
    css = tmp_path / "t.css"
    css.write_text(":root { --radius: 4px; }", encoding="utf-8")
    code, _, err = run(capsys, "--css", str(css))
    assert code == 2 and "--pairs" in err


def test_bad_pairs_syntax(tmp_path, capsys):
    css = tmp_path / "tokens.css"
    css.write_text(CSS, encoding="utf-8")
    code, _, err = run(capsys, "--css", str(css), "--pairs", "text")
    assert code == 2 and "pairs" in err


# --- CLI: --palettes -------------------------------------------------------------------------

def test_palettes_all_pass(data_dir, capsys):
    code, out, _ = run(capsys, "--palettes")
    assert code == 0
    assert "warm-editorial" in out and "midnight-cyan" in out


def test_palettes_failure_exit_1(tmp_path, monkeypatch, capsys):
    pal = tmp_path / "palettes"
    pal.mkdir()
    (pal / "bad.csv").write_text(
        "id,name,mood_tags,mode,bg,surface,text,muted,border,accent,accent_text,notes\n"
        "washed,Washed,,light,#fff,#fff,#999,#bbb,#eee,#ffcc00,#ffffff,\n",
        encoding="utf-8")
    monkeypatch.setenv("UI_CRAFT_DATA_DIR", str(tmp_path))
    code, out, _ = run(capsys, "--palettes", "--json")
    results = json.loads(out)["results"]
    assert code == 1
    assert {r["pair"] for r in results} == {"text/bg", "muted/bg", "accent_text/accent"}
    assert not any(r["pass"] for r in results)


def test_palettes_bad_color_is_reported(tmp_path, monkeypatch, capsys):
    pal = tmp_path / "palettes"
    pal.mkdir()
    (pal / "bad.csv").write_text(
        "id,name,mood_tags,mode,bg,surface,text,muted,border,accent,accent_text,notes\n"
        "broken,Broken,,light,nope,#fff,#000,#000,#eee,#000,#fff,\n", encoding="utf-8")
    monkeypatch.setenv("UI_CRAFT_DATA_DIR", str(tmp_path))
    code, _, err = run(capsys, "--palettes")
    assert code == 1 and "broken" in err


def test_palettes_missing_dir(tmp_path, monkeypatch, capsys):
    monkeypatch.setenv("UI_CRAFT_DATA_DIR", str(tmp_path))
    code, _, err = run(capsys, "--palettes")
    assert code == 2 and "palettes" in err


# --- subprocess ------------------------------------------------------------------------------

def test_cli_subprocess(tmp_path):
    result = run_script("contrast.py", "#777", "#fff", cwd=tmp_path)
    assert result.returncode == 1 and "4.48" in result.stdout


def test_cli_help():
    result = run_script("contrast.py", "--help")
    assert result.returncode == 0 and "--palettes" in result.stdout
