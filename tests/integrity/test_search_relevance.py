"""Search relevance on the real catalog. Each case: query, stack, and ids that must appear in the
top results (any one of `expect_any`). Near-misses must return no confident match.

When catalog rows change, update expectations here rather than loosening the scorer.
"""
import json
import subprocess
import sys
from pathlib import Path

import pytest

SEARCH = Path(__file__).resolve().parents[2] / "skills" / "ui-craft" / "scripts" / "search.py"

HITS = [
    ("modal dialog", "next", {"radix-ui--dialog", "shadcn-ui--dialog", "base-ui--dialog",
                              "react-aria-components--modal", "ark-ui--dialog"}),
    ("date picker", "react", {"shadcn-ui--date-picker", "ark-ui--date-picker",
                              "chakra-ui--date-picker", "heroui--date-picker"}),
    ("command palette", "react", {"shadcn-ui--command", "cmdk--command", "mantine--spotlight"}),
    ("animated hero background", "react", {"aceternity-ui--aurora-background",
                                           "aceternity-ui--background-beams"}),
    ("bento grid", "react", {"magic-ui--bento-grid", "aceternity-ui--bento-grid"}),
    ("number ticker", "react", {"magic-ui--number-ticker", "motion-primitives--animated-number"}),
    ("typewriter text", "react", {"aceternity-ui--typewriter-effect", "magic-ui--typing-animation"}),
    ("scroll progress", None, {"magic-ui--scroll-progress", "scroll-progress-bar"}),
    ("text reveal animation", None, {"text-split-reveal"}),
    ("smooth scroll", None, {"lenis-smooth-scroll"}),
    ("page transition", "next", {"motion-react-page-transition", "react-view-transition",
                                 "view-transition-cross-document"}),
    ("hero animation", None, {"hero-load-sequence"}),
    ("luxury quiet", None, {"gallery-graphite", "espresso-brass"}),
]
NATIVE = [
    ("dialog", "html", "native-html--dialog"),
    ("exclusive accordion", "html", "native-html--details"),
    ("popover", "html", "native-html--popover"),
]
# brief-language taste queries from the kiln-and-cloud dogfood (they used to return nothing)
MOODS = [
    ("calm modern crafted", "palettes"),
    ("warm crafted ceramics clay calm", "palettes"),
    ("handmade", "palettes"),
    ("handmade", "fonts"),
    ("calm crafted", "fonts"),
    ("serif humanist", "fonts"),
    ("warm editorial serif", "fonts"),
    ("luxury elegant", "fonts"),
    ("playful friendly", "palettes"),
    ("modern techy", "fonts"),
]
MISSES = ["quantum blockchain widget", "tax filing wizard"]
DOMAIN_MISSES = [("quantum blockchain widget", "palettes"), ("tax filing wizard", "fonts"),
                 ("kubernetes autoscaler", "palettes")]


def _search(query, stack, domain=None):
    args = [sys.executable, str(SEARCH), query, "--json", "--limit", "5"]
    if stack:
        args += ["--stack", stack]
    if domain:
        args += ["--domain", domain]
    proc = subprocess.run(args, capture_output=True, text=True, encoding="utf-8")
    return proc.returncode, json.loads(proc.stdout)


@pytest.mark.parametrize("query,stack,expect_any", HITS, ids=[h[0] for h in HITS])
def test_query_finds_expected_rows(query, stack, expect_any):
    code, payload = _search(query, stack)
    top = [r["id"] for r in payload["results"][:3]]
    assert code == 0 and expect_any & set(top), f"{query!r} top-3 was {top}"


@pytest.mark.parametrize("query", MISSES)
def test_near_miss_is_honest(query):
    code, payload = _search(query, None)
    assert code == 1 and not payload["results"] and not payload["related_libraries"]


@pytest.mark.parametrize("query,stack,expected", NATIVE, ids=[n[0] for n in NATIVE])
def test_native_html_rows_rank_for_plain_html(query, stack, expected):
    code, payload = _search(query, stack)
    top = [r["id"] for r in payload["results"][:3]]
    assert code == 0 and expected in top, f"{query!r} top-3 was {top}"


@pytest.mark.parametrize("query,domain", MOODS, ids=[f"{q}@{d}" for q, d in MOODS])
def test_mood_queries_return_rows(query, domain):
    code, payload = _search(query, None, domain)
    assert code == 0 and payload["results"], f"{query!r} in {domain} found nothing"


@pytest.mark.parametrize("query,domain", DOMAIN_MISSES, ids=[m[0] for m in DOMAIN_MISSES])
def test_junk_in_taste_domains_is_honest(query, domain):
    code, payload = _search(query, None, domain)
    assert code == 1 and not payload["results"]
