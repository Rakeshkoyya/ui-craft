"""Tests for scripts/search.py (BM25 catalog search)."""
import json
from datetime import date

import pytest

import search
from conftest import run_script

TODAY = date(2026, 9, 27)


def run(capsys, *argv):
    code = search.main(list(argv), today=TODAY)
    out = capsys.readouterr()
    return code, out.out, out.err


# --- tokenizer -------------------------------------------------------------------------------

def test_tokenizer_lowercases_and_splits_on_non_alphanumerics():
    assert search.tokenize("Date-Picker/Calendar_Input") == ["date", "picker", "calendar", "input"]


def test_tokenizer_strips_light_plurals():
    assert search.tokenize("modals libraries classes boxes glass css") == [
        "modal", "library", "class", "box", "glass", "css"]


def test_tokenizer_handles_empty_and_symbols():
    assert search.tokenize("") == []
    assert search.tokenize("  --  ") == []


# --- stack filter ----------------------------------------------------------------------------

@pytest.mark.parametrize("stacks,stack,expected", [
    ("react|next", "react", True),
    ("react", "next", True),        # next also matches react
    ("next", "react", False),       # but a next-only row is not generic react
    ("vue", "nuxt", True),          # nuxt also matches vue
    ("nuxt", "vue", False),
    ("html", "svelte", True),       # html works anywhere
    ("svelte", "react", False),
    ("", "react", False),
])
def test_stack_matches(stacks, stack, expected):
    assert search.stack_matches(stacks, stack) is expected


def test_stack_filter_applies_to_results(data_dir, capsys):
    code, out, _ = run(capsys, "dialog modal", "--stack", "vue", "--json", "--limit", "10")
    assert code == 0
    ids = [r["id"] for r in json.loads(out)["results"]]
    assert "reka-ui--dialog" in ids and "web-awesome--dialog" in ids
    assert "shadcn-ui--dialog" not in ids and "nuxt-ui--modal" not in ids


def test_stack_next_includes_react_rows(data_dir, capsys):
    code, out, _ = run(capsys, "view transitions page", "--domain", "libraries",
                       "--stack", "next", "--json")
    assert code == 0
    ids = [r["id"] for r in json.loads(out)["results"]]
    assert ids[0] == "next-view-transitions"


def test_unknown_stack_is_usage_error(data_dir, capsys):
    code, _, err = run(capsys, "dialog", "--stack", "cobol")
    assert code == 2 and "stack" in err.lower()


# --- ranking ---------------------------------------------------------------------------------

def test_bm25_ranks_title_match_above_description_match(data_dir):
    rows = search.load_domain(data_dir, "components")
    ranked = search.rank(rows, "toast", "components")
    assert ranked[0][1]["id"] == "shadcn-ui--sonner"
    ranked = search.rank(rows, "data table sorting", "components")
    assert ranked[0][1]["id"] == "shadcn-ui--data-table"


def test_bm25_prefers_rows_matching_more_query_terms(data_dir):
    rows = search.load_domain(data_dir, "components")
    ranked = search.rank(rows, "animated hero background", "components")
    assert ranked[0][1]["id"] == "magic-ui--animated-grid-pattern"


def test_library_id_is_searchable(data_dir):
    rows = search.load_domain(data_dir, "components")
    ranked = search.rank(rows, "bits dialog", "components")
    assert ranked[0][1]["id"] == "bits-ui--dialog"


def test_rank_returns_nothing_for_unknown_terms(data_dir):
    rows = search.load_domain(data_dir, "components")
    assert search.rank(rows, "quantum blockchain", "components") == []


# --- domain routing --------------------------------------------------------------------------

@pytest.mark.parametrize("query,domain", [
    ("editorial serif font", "fonts"),
    ("typeface pairing", "fonts"),
    ("warm color palette", "palettes"),
    ("scroll reveal", "motion"),
    ("page transition", "motion"),
    ("parallax hero", "motion"),
    ("headless ui library", "libraries"),
    ("component kit", "libraries"),
    ("smooth scroll library", "libraries"),
    ("animation library", "libraries"),
    ("date picker", "components"),
    ("animated hero background", "components"),
])
def test_route_domain(query, domain):
    assert search.route_domain(query) == domain


def test_auto_routes_to_fonts(data_dir, capsys):
    code, out, _ = run(capsys, "editorial serif font", "--json")
    assert code == 0
    payload = json.loads(out)
    assert payload["domain"] == "fonts"
    assert payload["results"][0]["id"] == "editorial-serif"


def test_auto_components_append_related_libraries(data_dir, capsys):
    code, out, _ = run(capsys, "headless dialog", "--stack", "svelte", "--json")
    assert code == 0
    payload = json.loads(out)
    assert payload["domain"] == "components"
    assert payload["results"][0]["id"] == "bits-ui--dialog"
    assert [r["id"] for r in payload["related_libraries"]] == ["bits-ui"]


def test_related_libraries_alone_still_succeed(data_dir, capsys):
    code, out, _ = run(capsys, "unstyled dialog", "--stack", "vue")
    assert code == 0
    assert "No confident components match; related libraries below." in out
    assert "Reka UI" in out and "npm install reka-ui" in out


def test_explicit_domain_has_no_related_libraries(data_dir, capsys):
    code, out, _ = run(capsys, "dialog", "--domain", "components", "--json")
    assert code == 0
    assert json.loads(out)["related_libraries"] == []


def test_motion_domain_search(data_dir, capsys):
    code, out, _ = run(capsys, "staggered scroll reveal", "--json")
    payload = json.loads(out)
    assert code == 0 and payload["domain"] == "motion"
    assert payload["results"][0]["id"] == "scroll-reveal-stagger"


def test_palette_domain_search(data_dir, capsys):
    code, out, _ = run(capsys, "warm editorial palette", "--json")
    assert code == 0
    assert json.loads(out)["results"][0]["id"] == "warm-editorial"


# --- score floor -----------------------------------------------------------------------------

def test_no_confident_match_exits_1(data_dir, capsys):
    code, out, _ = run(capsys, "quantum blockchain widget")
    assert code == 1
    assert 'No confident match for "quantum blockchain widget"' in out


def test_partial_match_with_mostly_unknown_terms_is_dropped(data_dir, capsys):
    code, out, _ = run(capsys, "kubernetes cluster autoscaler dialog")
    assert code == 1 and "No confident match" in out


def test_min_score_flag_filters(data_dir, capsys):
    code, out, _ = run(capsys, "dialog", "--domain", "components", "--min-score", "1000")
    assert code == 1 and "No confident match" in out


def test_no_match_json_shape(data_dir, capsys):
    code, out, _ = run(capsys, "quantum blockchain", "--json")
    payload = json.loads(out)
    assert code == 1 and payload["results"] == [] and payload["query"] == "quantum blockchain"


def test_limit(data_dir, capsys):
    code, out, _ = run(capsys, "dialog", "--domain", "components", "--limit", "2", "--json")
    assert code == 0 and len(json.loads(out)["results"]) == 2


# --- output ----------------------------------------------------------------------------------

def test_json_row_has_all_columns_score_and_library_info(data_dir, capsys):
    code, out, _ = run(capsys, "date picker", "--stack", "react", "--json")
    assert code == 0
    row = json.loads(out)["results"][0]
    assert row["id"] == "shadcn-ui--date-picker"
    for col in ("library_id", "component", "category", "tags", "stacks", "description",
                "install", "import", "usage", "a11y_notes", "docs_url", "verified_at"):
        assert col in row
    assert isinstance(row["score"], float) and row["score"] > 0
    assert row["library_install"] == "npx shadcn@latest init"
    assert row["library_license"] == "MIT"
    assert row["stale"] is False


def test_stale_rows_get_verify_note(data_dir, capsys):
    code, out, _ = run(capsys, "dialog", "--stack", "vue", "--domain", "components")
    assert code == 0
    assert "(verify: last checked 2025-01-10" in out


def test_stale_flag_in_json(data_dir, capsys):
    code, out, _ = run(capsys, "reka dialog", "--domain", "components", "--json")
    row = json.loads(out)["results"][0]
    assert row["id"] == "reka-ui--dialog" and row["stale"] is True


def test_is_stale_boundary():
    assert search.is_stale("2026-03-30", TODAY) is True     # 181 days old
    assert search.is_stale("2026-03-31", TODAY) is False    # exactly 180 days old
    assert search.is_stale("", TODAY) is False
    assert search.is_stale("not-a-date", TODAY) is True


def test_markdown_output_lists_columns(data_dir, capsys):
    code, out, _ = run(capsys, "date picker", "--stack", "react")
    assert code == 0
    assert "Date Picker" in out
    assert "npx shadcn@latest add calendar popover" in out
    assert "library_install" in out and "score" in out


def test_today_env_override(data_dir, monkeypatch, capsys):
    monkeypatch.setenv("UI_CRAFT_TODAY", "2026-09-05")
    code = search.main(["reka dialog", "--domain", "components", "--json"])
    row = json.loads(capsys.readouterr().out)["results"][0]
    assert code == 0 and row["stale"] is True


# --- errors ----------------------------------------------------------------------------------

def test_empty_query_is_usage_error(data_dir, capsys):
    code, _, err = run(capsys, "   ")
    assert code == 2 and err


def test_missing_data_dir_is_usage_error(monkeypatch, tmp_path, capsys):
    monkeypatch.setenv("UI_CRAFT_DATA_DIR", str(tmp_path / "nope"))
    code, _, err = run(capsys, "dialog")
    assert code == 2 and "data" in err.lower()


def test_empty_domain_is_no_match(monkeypatch, tmp_path, capsys):
    (tmp_path / "components").mkdir()
    monkeypatch.setenv("UI_CRAFT_DATA_DIR", str(tmp_path))
    code, out, _ = run(capsys, "dialog", "--domain", "components")
    assert code == 1 and "No confident match" in out


def test_bad_argument_exits_2(data_dir):
    with pytest.raises(SystemExit) as exc:
        search.main(["dialog", "--domain", "nope"])
    assert exc.value.code == 2


# --- subprocess ------------------------------------------------------------------------------

def test_cli_runs_from_any_cwd(tmp_path):
    result = run_script("search.py", "date picker", "--json", cwd=tmp_path)
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)["results"]


def test_cli_help():
    result = run_script("search.py", "--help")
    assert result.returncode == 0 and "--min-score" in result.stdout


def test_auto_falls_back_to_other_domains_when_routed_domain_is_empty(data_dir, capsys):
    # "warm calm" has no routing keyword, so it routes to components, where nothing matches.
    code, out, _ = run(capsys, "warm calm", "--json")
    assert code == 0
    payload = json.loads(out)
    assert payload["domain"] == "palettes"
    assert payload["results"][0]["id"] == "warm-editorial"


def test_explicit_domain_never_falls_back(data_dir, capsys):
    code, out, _ = run(capsys, "warm calm", "--domain", "components")
    assert code == 1
    assert 'No confident match for "warm calm"' in out


def test_rows_must_match_more_than_half_of_the_query(data_dir, capsys):
    # "dialog" exists in the catalog, "pricing" does not: a half match is not confident
    code, out, _ = run(capsys, "pricing dialog", "--domain", "components")
    assert code == 1
    assert "No confident match" in out


def test_mostly_unknown_query_gets_no_related_libraries(data_dir, capsys):
    code, out, _ = run(capsys, "quantum blockchain headless", "--json")
    payload = json.loads(out)
    assert code == 1
    assert payload["results"] == [] and payload["related_libraries"] == []


def test_generic_words_do_not_count_against_the_majority_rule(data_dir, capsys):
    # "effect" says what kind of thing is wanted, not which one; "card" carries the meaning
    code, out, _ = run(capsys, "card effect", "--domain", "motion", "--json")
    assert code == 0
    assert json.loads(out)["results"][0]["id"] == "hover-lift"
