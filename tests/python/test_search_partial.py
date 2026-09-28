"""search.py: partial matching for taste domains (palettes, fonts) and the query synonym map."""
import csv
import json
from datetime import date

import pytest

import search

TODAY = date(2026, 9, 27)
PALETTE_COLS = ["id", "name", "mood_tags", "mode", "bg", "surface", "text", "muted", "border",
                "accent", "accent_text", "notes"]
PALETTES = [
    ("still-water", "Still water", "calm|quiet|minimal"),
    ("clay-bench", "Clay bench", "crafted|artisan|earthy"),
    ("calm-clay", "Calm clay", "calm|crafted|warm"),
    ("loud-poster", "Loud poster", "bold|loud|poster"),
    ("night-club", "Night club", "nightlife|music|dramatic"),
    ("kids-fun", "Kids fun", "playful|youthful|bright"),
]


def _palette_dir(tmp_path, monkeypatch, rows=PALETTES):
    folder = tmp_path / "palettes"
    folder.mkdir()
    with (folder / "p.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(PALETTE_COLS)
        for pid, name, tags in rows:
            writer.writerow([pid, name, tags, "light", "#fff", "#fff", "#111", "#555", "#ddd",
                             "#036", "#fff", ""])
    monkeypatch.setenv("UI_CRAFT_DATA_DIR", str(tmp_path))
    return tmp_path


def run(capsys, *argv):
    code = search.main(list(argv), today=TODAY)
    return code, capsys.readouterr().out


# --- partial matching in taste domains --------------------------------------------------------

def test_palettes_accept_a_partial_match(tmp_path, monkeypatch, capsys):
    _palette_dir(tmp_path, monkeypatch)
    code, out = run(capsys, "calm modern crafted", "--domain", "palettes", "--json")
    ids = [r["id"] for r in json.loads(out)["results"]]
    assert code == 0 and ids, "a mood query with one unknown word must still return rows"


def test_partial_rows_rank_by_coverage(tmp_path, monkeypatch, capsys):
    _palette_dir(tmp_path, monkeypatch)
    code, out = run(capsys, "calm crafted neon", "--domain", "palettes", "--json")
    results = json.loads(out)["results"]
    assert code == 0 and results[0]["id"] == "calm-clay"
    assert results[0]["matched"] == "2/3"


def test_partial_match_is_labelled_in_markdown(tmp_path, monkeypatch, capsys):
    _palette_dir(tmp_path, monkeypatch)
    code, out = run(capsys, "calm crafted neon", "--domain", "palettes")
    assert code == 0 and "partial match (2/3 words)" in out


def test_full_match_is_not_labelled_partial(tmp_path, monkeypatch, capsys):
    _palette_dir(tmp_path, monkeypatch)
    code, out = run(capsys, "calm crafted", "--domain", "palettes")
    assert code == 0 and "partial match" not in out.split("\n")[2]


def test_partial_mode_keeps_the_score_floor(tmp_path, monkeypatch, capsys):
    _palette_dir(tmp_path, monkeypatch)
    code, out = run(capsys, "calm modern crafted", "--domain", "palettes", "--min-score", "50")
    assert code == 1 and "No confident match" in out


def test_partial_mode_still_rejects_junk(tmp_path, monkeypatch, capsys):
    _palette_dir(tmp_path, monkeypatch)
    code, out = run(capsys, "quantum blockchain widget", "--domain", "palettes")
    assert code == 1 and "No confident match" in out


def test_components_stay_strict(data_dir, capsys):
    code, out = run(capsys, "pricing dialog", "--domain", "components")
    assert code == 1


def test_fonts_are_a_taste_domain():
    assert {"palettes", "fonts"} == set(search.TASTE_DOMAINS)


# --- synonyms ---------------------------------------------------------------------------------

def _rows(*specs):
    return [{"id": rid, "component": name, "tags": tags} for rid, name, tags in specs]


def test_synonym_finds_row_without_the_literal_word():
    rows = _rows(("a", "Dialog", "overlay"), ("b", "Tabs", "panels"), ("c", "Menu", "nav"))
    assert [r["id"] for _, r in search.rank(rows, "modal", "components")] == ["a"]


def test_exact_word_outranks_synonym():
    rows = _rows(("syn", "Box", "dialog"), ("exact", "Box", "modal"), ("x", "Tabs", "panels"))
    ranked = search.rank(rows, "modal", "components")
    assert [r["id"] for _, r in ranked] == ["exact", "syn"]


@pytest.mark.parametrize("word,expected", [
    ("handmade", {"crafted", "artisan", "handcrafted"}),
    ("calm", {"quiet", "serene", "minimal"}),
    ("popup", {"popover", "dialog"}),
    ("dropdown", {"menu", "select"}),
    ("slider", {"carousel", "range"}),
])
def test_synonym_map_entries(word, expected):
    assert expected <= set(search.expand(word))
    assert search.expand(word)[0] == word


def test_synonyms_do_not_rescue_junk(data_dir, capsys):
    code, _ = run(capsys, "quantum blockchain widget")
    assert code == 1


def test_synonym_counts_toward_coverage(tmp_path, monkeypatch, capsys):
    _palette_dir(tmp_path, monkeypatch)
    code, out = run(capsys, "handmade", "--domain", "palettes", "--json")
    ids = [r["id"] for r in json.loads(out)["results"]]
    assert code == 0 and ids[0] == "clay-bench"  # tagged "crafted" via handmade -> crafted
