"""Tests for scripts/history.py: the local structure-fingerprint history used for variation."""
import json

import pytest

from conftest import run_script

import history


@pytest.fixture
def hist(tmp_path, monkeypatch):
    path = tmp_path / "history.json"
    monkeypatch.setenv("UI_CRAFT_HISTORY", str(path))
    return path


def _add(*extra):
    return run_script("history.py", "add", "--brand", "Northbeam Builders",
                      "--arc", "build-log", "--sections",
                      "cold-open,sticky-build,crew-portraits,site-map,invitation",
                      "--signature", "building-assembles", "--palette", "concrete-safety",
                      "--language", "weighty", *extra)


# --- pure helpers ----------------------------------------------------------------------------

def test_similarity_identical_fingerprints_is_one():
    fp = {"sections": ["a", "b", "c"], "arc": "x", "signature": "s", "palette": "p",
          "language": "l"}
    assert history.similarity(fp, dict(fp)) == pytest.approx(1.0)


def test_similarity_disjoint_fingerprints_is_zero():
    a = {"sections": ["a", "b"], "arc": "x", "signature": "s", "palette": "p", "language": "l"}
    b = {"sections": ["c", "d"], "arc": "y", "signature": "t", "palette": "q", "language": "m"}
    assert history.similarity(a, b) == pytest.approx(0.0)


def test_similarity_weights_section_order():
    base = {"sections": ["hero", "features", "testimonials", "cta"]}
    reordered = {"sections": ["cta", "testimonials", "features", "hero"]}
    same = {"sections": ["hero", "features", "testimonials", "cta"]}
    assert history.similarity(base, same) > history.similarity(base, reordered)


def test_similarity_ignores_missing_fields():
    a = {"sections": ["a", "b"]}
    b = {"sections": ["a", "b"], "arc": "x"}
    assert history.similarity(a, b) == pytest.approx(1.0)


def test_parse_sections_normalises():
    assert history.parse_sections(" Cold Open, sticky-build ,,Invitation ") == [
        "cold-open", "sticky-build", "invitation"]


def test_overused_sections_counts_recent_entries():
    entries = [{"sections": ["hero", "proof"]}, {"sections": ["hero", "map"]},
               {"sections": ["hero", "proof"]}, {"sections": ["story"]}]
    assert history.overused(entries) == ["hero", "proof"]


# --- CLI -------------------------------------------------------------------------------------

def test_show_with_no_history_is_clean(hist):
    result = run_script("history.py", "show")
    assert result.returncode == 0
    assert "No history yet" in result.stdout


def test_add_writes_entry(hist):
    result = _add()
    assert result.returncode == 0, result.stderr
    data = json.loads(hist.read_text(encoding="utf-8"))
    entry = data["entries"][-1]
    assert entry["brand"] == "Northbeam Builders"
    assert entry["sections"][1] == "sticky-build"
    assert entry["language"] == "weighty"
    assert len(entry["date"]) == 10


def test_add_caps_history_length(hist):
    for _ in range(history.MAX_ENTRIES + 3):
        assert _add().returncode == 0
    data = json.loads(hist.read_text(encoding="utf-8"))
    assert len(data["entries"]) == history.MAX_ENTRIES


def test_show_lists_recent_entries_json(hist):
    _add()
    result = run_script("history.py", "show", "--json")
    assert result.returncode == 0
    payload = json.loads(result.stdout)
    assert payload["entries"][0]["brand"] == "Northbeam Builders"


def test_check_flags_near_duplicate(hist):
    _add()
    result = run_script("history.py", "check", "--sections",
                        "cold-open,sticky-build,crew-portraits,site-map,invitation",
                        "--arc", "build-log", "--language", "weighty")
    assert result.returncode == 1
    assert "Northbeam Builders" in result.stdout


def test_check_passes_distinct_plan(hist):
    _add()
    result = run_script("history.py", "check", "--sections",
                        "manifesto,origin-timeline,index-catalogue,letter",
                        "--arc", "manifesto", "--language", "airy")
    assert result.returncode == 0
    assert "distinct" in result.stdout.lower()


def test_check_json_reports_scores(hist):
    _add()
    result = run_script("history.py", "check", "--sections", "cold-open,sticky-build",
                        "--json")
    payload = json.loads(result.stdout)
    assert payload["matches"][0]["brand"] == "Northbeam Builders"
    assert 0 <= payload["matches"][0]["similarity"] <= 1


def test_corrupt_history_is_a_usage_error(hist):
    hist.write_text("{not json", encoding="utf-8")
    result = run_script("history.py", "show")
    assert result.returncode == 2
    assert "history" in result.stderr.lower()


def test_add_requires_sections(hist):
    result = run_script("history.py", "add", "--brand", "X", "--sections", " , ")
    assert result.returncode == 2


# --- in-process (coverage of main) -----------------------------------------------------------

ADD = ["add", "--brand", "Tallow & Wick", "--arc", "manifesto", "--sections",
       "manifesto,process-scroll,letter", "--language", "airy", "--signature", "flame-draw"]


def test_main_round_trip(hist, capsys):
    assert history.main(ADD) == 0
    assert history.main(ADD) == 0
    assert history.main(["show"]) == 0
    out = capsys.readouterr().out
    assert "Tallow & Wick" in out and "Often used lately" in out
    assert history.main(["check", "--sections", "manifesto,process-scroll,letter",
                         "--arc", "manifesto"]) == 1
    assert "Similar to 2" in capsys.readouterr().out
    assert history.main(["check", "--sections", "manifesto,map", "--json"]) == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["overused_in_plan"] == ["manifesto"]


def test_main_distinct_with_empty_history(hist, capsys):
    assert history.main(["check", "--sections", "a,b"]) == 0
    assert "Distinct from the last 0" in capsys.readouterr().out


def test_main_rejects_bad_limit_and_bad_shape(hist, capsys):
    assert history.main(["show", "--limit", "0"]) == 2
    hist.write_text('{"entries": {}}', encoding="utf-8")
    assert history.main(["show"]) == 2
    assert history.main(["add", "--sections", ","]) == 2


def test_history_path_defaults_to_home(monkeypatch):
    monkeypatch.delenv("UI_CRAFT_HISTORY", raising=False)
    assert history.history_path().parts[-2:] == (".ui-craft", "history.json")


@pytest.mark.parametrize("payload", ['{"entries": ["x"]}',
                                     '{"entries": [{"sections": "abc"}]}',
                                     '{"entries": [{"brand": "no sections"}]}'])
def test_malformed_entries_are_a_usage_error(hist, payload):
    hist.write_text(payload, encoding="utf-8")
    result = run_script("history.py", "show")
    assert result.returncode == 2
    assert "fix or delete it" in result.stderr
