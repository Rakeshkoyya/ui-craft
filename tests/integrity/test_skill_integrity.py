"""Repo-wide integrity checks: SKILL.md spec compliance, link targets, and data contracts.

Schemas mirror docs/CONTRACTS.md section 1. Update both together.
"""
import csv
import re
from datetime import date
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SKILL = ROOT / "skills" / "ui-craft"
DATA = SKILL / "data"

STACKS = {"react", "next", "vue", "nuxt", "svelte", "solid", "angular", "astro", "html"}
SCHEMAS = {
    "libraries": ["id", "name", "stacks", "kind", "tags", "description", "install",
                  "setup_notes", "license", "docs_url", "verified_at"],
    "components": ["id", "library_id", "component", "category", "tags", "stacks", "description",
                   "install", "import", "usage", "a11y_notes", "docs_url", "verified_at"],
    "motion": ["id", "name", "technique", "trigger", "stacks", "tags", "description",
               "duration_ms", "easing", "reduced_motion", "file", "docs_url", "verified_at"],
    "palettes": ["id", "name", "mood_tags", "mode", "bg", "surface", "text", "muted", "border",
                 "accent", "accent_text", "notes"],
    "fonts": ["id", "display", "body", "mono", "mood_tags", "source", "css_import",
              "fallback_stack", "notes", "license"],
    "sections": ["id", "name", "beat", "tags", "description", "layout", "motion", "pairs_with",
                 "avoid_when"],
}
ENUMS = {
    ("libraries", "kind"): {"primitives", "styled-kit", "animated-components", "motion-engine",
                            "smooth-scroll", "charts", "icons", "css-framework", "utility"},
    ("components", "category"): {"navigation", "hero", "overlay", "form", "data-display",
                                 "feedback", "layout", "text-effect", "background", "media",
                                 "motion", "chart", "commerce", "marketing"},
    ("motion", "technique"): {"css", "css-scroll-driven", "view-transitions", "motion", "gsap",
                              "lenis", "waapi", "js"},
    ("motion", "trigger"): {"load", "scroll", "hover", "click", "route", "state"},
    ("palettes", "mode"): {"light", "dark"},
    ("sections", "beat"): {"opening", "origin", "tension", "voice", "method", "product",
                           "catalogue", "proof", "place", "people", "transformation",
                           "invitation", "utility"},
}
ID_RE = re.compile(r"^[a-z0-9]+(?:-{1,2}[a-z0-9]+)*$")


def _frontmatter(text):
    match = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    assert match, "SKILL.md must start with YAML frontmatter"
    fields = {}
    for line in match.group(1).splitlines():
        if line and not line.startswith(" ") and ":" in line:
            key, _, value = line.partition(":")
            fields[key.strip()] = value.strip()
    return fields


def _rows(domain):
    rows = []
    for path in sorted((DATA / domain).glob("*.csv")):
        with path.open(encoding="utf-8", newline="") as handle:
            reader = csv.DictReader(handle)
            assert reader.fieldnames == SCHEMAS[domain], f"{path.name}: header mismatch"
            rows.extend((path.name, i + 2, row) for i, row in enumerate(reader))
    return rows


# --- SKILL.md --------------------------------------------------------------------------------

def test_frontmatter_follows_agentskills_spec():
    text = (SKILL / "SKILL.md").read_text(encoding="utf-8")
    fields = _frontmatter(text)
    allowed = {"name", "description", "license", "compatibility", "metadata", "allowed-tools"}
    assert set(fields) <= allowed, f"unknown frontmatter keys: {set(fields) - allowed}"
    assert fields["name"] == SKILL.name
    assert re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", fields["name"]) and len(fields["name"]) <= 64
    desc = fields["description"]
    assert 0 < len(desc) <= 1024 and "<" not in desc and ">" not in desc


def test_skill_body_is_lean():
    lines = (SKILL / "SKILL.md").read_text(encoding="utf-8").splitlines()
    assert len(lines) < 300


def test_every_referenced_path_exists():
    text = (SKILL / "SKILL.md").read_text(encoding="utf-8")
    refs = set(re.findall(r"`((?:references|assets|scripts)/[\w./-]+\.\w+)`", text))
    stack_files = {"html-css.md", "react-next.md", "vue-nuxt.md", "svelte.md", "tailwind.md"}
    refs |= {f"references/stacks/{n}" for n in re.findall(r"`([\w-]+\.md)`", text)
             if n in stack_files}
    refs |= {m.replace("<skill>/", "") for m in re.findall(r"<skill>/scripts/[\w.]+", text)}
    missing = sorted(r for r in refs if not (SKILL / r).exists())
    assert not missing, f"SKILL.md links to missing files: {missing}"


# --- data contracts --------------------------------------------------------------------------

@pytest.mark.parametrize("domain", sorted(SCHEMAS))
def test_domain_has_rows_with_valid_fields(domain):
    rows = _rows(domain)
    assert rows, f"data/{domain} has no rows"
    seen = set()
    for name, line, row in rows:
        where = f"{domain}/{name}:{line}"
        assert ID_RE.match(row["id"]), f"{where}: bad id {row['id']!r}"
        assert row["id"] not in seen, f"{where}: duplicate id {row['id']}"
        seen.add(row["id"])
        for (dom, col), allowed in ENUMS.items():
            if dom == domain:
                assert row[col] in allowed, f"{where}: {col}={row[col]!r}"
        if "stacks" in row:
            stacks = set(row["stacks"].split("|"))
            assert stacks <= STACKS, f"{where}: unknown stacks {stacks - STACKS}"
        if "verified_at" in row:
            assert date.fromisoformat(row["verified_at"]) <= date.today(), where
        if "docs_url" in row:
            assert row["docs_url"].startswith("https://"), f"{where}: docs_url"


def test_components_reference_known_libraries():
    library_ids = {row["id"] for _, _, row in _rows("libraries")}
    orphans = sorted({row["library_id"] for _, _, row in _rows("components")} - library_ids)
    assert not orphans, f"components reference unknown libraries: {orphans}"


def test_component_ids_are_prefixed_by_library():
    for name, line, row in _rows("components"):
        assert row["id"].startswith(row["library_id"] + "--"), f"{name}:{line}"


def test_motion_recipe_files_exist():
    missing = [row["file"] for _, _, row in _rows("motion")
               if not (SKILL / "assets" / "motion" / row["file"]).is_file()]
    assert not missing, f"motion recipes point to missing files: {missing}"


def test_section_pairings_reference_motion_recipes():
    motion_ids = {row["id"] for _, _, row in _rows("motion")}
    unknown = sorted({pid for _, _, row in _rows("sections")
                      for pid in row["pairs_with"].split("|") if pid} - motion_ids)
    assert not unknown, f"sections pair with unknown motion recipes: {unknown}"


def test_story_arcs_reference_known_sections():
    section_ids = {row["id"] for _, _, row in _rows("sections")}
    text = (SKILL / "references" / "structure.md").read_text(encoding="utf-8")
    arc_rows = [line for line in text.splitlines() if line.startswith("| **")]
    used = {tok for line in arc_rows for tok in re.findall(r"`([a-z0-9-]+)`", line)}
    assert used, "structure.md arc table not found"
    assert not used - section_ids, f"arcs use unknown sections: {sorted(used - section_ids)}"


def test_no_research_content_is_packaged():
    assert not list(SKILL.rglob("_research*"))
