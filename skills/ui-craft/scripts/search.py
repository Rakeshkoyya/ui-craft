"""Search the ui-craft catalog (components, libraries, motion recipes, palettes, fonts,
section archetypes).

BM25 ranking over each CSV row, with stack filtering and an honest score floor: when nothing
scores above --min-score it prints `No confident match for "<query>"` and exits 1, so the agent
hand-rolls instead of inventing a package.

Usage:
    python search.py "date picker" --stack vue
    python search.py "animated hero background" --stack react --json
    python search.py "headless ui library" --domain libraries --stack svelte
    python search.py "editorial serif" --domain fonts
    python search.py "staggered scroll reveal"            # auto-routes to motion
    python search.py "founder origin story" --domain sections

Scoring: BM25 (k1=1.2, b=0.75) over weighted fields (name/component x3, tags x2,
category/kind x2, description x1), multiplied by the fraction of query words the row matches.
Query words expand through a small synonym map (_search_vocab.py; a synonym hit counts 0.7).
Components, libraries and motion are strict: a row must match more than half of the query's
specific words. Palettes, fonts and sections (brief vocabulary) accept any matching word, still
scored by coverage and labelled "partial match (k/n words)".
Exit codes: 0 results, 1 no confident match, 2 usage error.
Env: UI_CRAFT_DATA_DIR overrides the data dir; UI_CRAFT_TODAY (YYYY-MM-DD) overrides "today".
"""
import argparse
import json
import math
import os
import re
import sys
from datetime import date

from _common import data_dir, fail_usage, read_csv_dir, setup_stdio
from _search_vocab import GENERIC_WORDS, ROUTES, STOPWORDS, SYNONYMS, TASTE_DOMAINS

DOMAINS = ("components", "libraries", "motion", "palettes", "fonts", "sections")
STACKS = ("react", "next", "vue", "nuxt", "svelte", "solid", "angular", "astro", "html")
STACK_ALIASES = {"next": {"react"}, "nuxt": {"vue"}}
DEFAULT_MIN_SCORE = 1.0
STALE_DAYS = 180
RELATED_LIBRARY_LIMIT = 3
K1, B = 1.2, 0.75

FIELD_WEIGHTS = {
    "component": 3, "name": 3, "display": 3, "body": 2, "mono": 1,
    "tags": 2, "mood_tags": 2, "category": 2, "kind": 2, "technique": 2, "trigger": 2,
    "mode": 2, "beat": 2, "description": 1, "notes": 1, "library_id": 1, "layout": 1,
    "motion": 1,
}
TITLE_FIELDS = ("component", "name", "display")
SYNONYM_WEIGHT = 0.7  # a synonym hit counts less than the literal word
ROUTE_WORDS = {domain: words for domain, words in ROUTES}


def tokenize(text):
    """Lowercase, split on non-alphanumerics, strip light plurals."""
    return [_singular(t) for t in re.split(r"[^a-z0-9]+", text.lower()) if t]


def _singular(token):
    if len(token) <= 3:
        return token
    if token.endswith("ies") and len(token) > 4:
        return token[:-3] + "y"
    if token.endswith(("sses", "xes", "ches", "shes")):
        return token[:-2]
    if token.endswith("s") and not token.endswith(("ss", "us", "is")):
        return token[:-1]
    return token


def stack_matches(row_stacks, stack):
    """True if a row's `stacks` field is usable on `stack` (html works anywhere)."""
    have = {s.strip().lower() for s in row_stacks.split("|") if s.strip()}
    wanted = {stack} | STACK_ALIASES.get(stack, set()) | {"html"}
    return bool(have & wanted)


def route_domain(query):
    """Pick a domain from keywords in the query; default components."""
    tokens = set(tokenize(query))
    for domain, words in ROUTES:
        if tokens & words:
            return domain
    return "components"


def load_domain(root, domain):
    return read_csv_dir(root / domain)


def _doc_terms(row):
    terms, length = {}, 0
    for field, weight in FIELD_WEIGHTS.items():
        for token in tokenize(row.get(field, "")):
            terms[token] = terms.get(token, 0) + weight
            length += weight
    return terms, length


def expand(term):
    """The term followed by its synonyms (single singular tokens), without duplicates."""
    alts = [term] + [_singular(t) for t in SYNONYMS.get(term, ())]
    return tuple(dict.fromkeys(alts))


def _query_groups(query, domain, df, strict):
    """One group per query word: (word, *synonyms). A group matches if any member occurs."""
    groups = [expand(t) for t in dict.fromkeys(tokenize(query)) if t not in STOPWORDS]
    # a routing word ("font", "palette") that never occurs in the domain is not a content term;
    # non-strict mode (related libraries) ignores every term absent from the domain
    return [g for g in groups
            if any(df.get(t, 0) for t in g) or (strict and g[0] not in ROUTE_WORDS.get(domain, ()))]


def _majority(matched, groups):
    """A confident row matches more than half of the query's specific (non-generic) words."""
    specific = [g for g in groups if g[0] not in GENERIC_WORDS] or groups
    hits = sum(g in matched for g in specific)
    return hits > 0 and (len(specific) == 1 or hits * 2 > len(specific))


def _group_score(group, terms, df, n, norm):
    """BM25 of the best-scoring member of the group; synonyms are discounted."""
    best = 0.0
    for i, term in enumerate(group):
        if term not in terms:
            continue
        idf = math.log(1 + (n - df[term] + 0.5) / (df[term] + 0.5))
        value = idf * terms[term] * (K1 + 1) / (terms[term] + norm)
        best = max(best, value * (1 if i == 0 else SYNONYM_WEIGHT))
    return best


def rank(rows, query, domain, strict=True, partial=False):
    """Return [(score, row)] sorted by score desc; rows with no matching term are omitted.

    score = BM25 x (matched query words / query words), so rows matching only one word of a
    longer query are pushed below the floor. `strict` rows must match most of the query's
    specific words; `partial` (taste domains) lets any matching word qualify, still scored by
    coverage. Each row gets `_matched` = (matched words, query words) for labelling.
    """
    docs = [_doc_terms(row) for row in rows]
    if not docs:
        return []
    df = {}
    for terms, _ in docs:
        for term in terms:
            df[term] = df.get(term, 0) + 1
    groups = _query_groups(query, domain, df, strict)
    if not groups:
        return []
    n = len(docs)
    avgdl = sum(length for _, length in docs) / n or 1.0
    ranked = []
    for row, (terms, length) in zip(rows, docs):
        matched = [g for g in groups if any(t in terms for t in g)]
        if not matched or (strict and not partial and not _majority(matched, groups)):
            continue
        norm = K1 * (1 - B + B * length / avgdl)
        bm25 = sum(_group_score(g, terms, df, n, norm) for g in matched)
        score = round(bm25 * len(matched) / len(groups), 3)
        ranked.append((score, {**row, "_matched": (len(matched), len(groups))}))
    ranked.sort(key=lambda pair: (-pair[0], pair[1].get("id", "")))
    return ranked


def is_stale(verified_at, today):
    """True when verified_at is older than STALE_DAYS (or unparseable); empty is not stale."""
    if not verified_at:
        return False
    try:
        checked = date.fromisoformat(verified_at)
    except ValueError:
        return True
    return (today - checked).days > STALE_DAYS


def _search(root, domain, query, stack, min_score, limit, strict=True, partial=False):
    # rank over the whole domain so IDF is stable, then apply the stack filter
    ranked = [(s, r) for s, r in rank(load_domain(root, domain), query, domain, strict, partial)
              if s >= min_score and (not stack or stack_matches(r.get("stacks", ""), stack))]
    return ranked[:limit]


def _enrich(ranked, domain, libraries, today):
    out = []
    for score, row in ranked:
        item = {k: v for k, v in row.items() if k != "_matched"}
        item["score"] = float(score)
        hits, total = row.get("_matched", (1, 1))
        item["matched"] = f"{hits}/{total}"
        if domain == "components":
            lib = libraries.get(row.get("library_id", ""), {})
            item["library_install"] = lib.get("install", "")
            item["library_license"] = lib.get("license", "")
        item["stale"] = is_stale(row.get("verified_at", ""), today)
        item["note"] = (f"(verify: last checked {row['verified_at']} - confirm against docs_url)"
                        if item["stale"] else "")
        out.append(item)
    return out


def _title(row):
    if row.get("display"):
        return f"{row['display']} / {row.get('body', '')}"
    return next((row[f] for f in TITLE_FIELDS if row.get(f)), row.get("id", "?"))


def _render_rows(rows, heading_level):
    lines = []
    for i, row in enumerate(rows, 1):
        note = f" {row['note']}" if row["note"] else ""
        hits, total = row["matched"].split("/")
        if hits != total:
            note += f" - partial match ({hits}/{total} words)"
        lines.append(f"{'#' * heading_level} {i}. {_title(row)} (`{row.get('id', '')}`)"
                     f" - score {row['score']:.2f}{note}")
        for key, value in row.items():
            if key not in ("score", "stale", "note", "matched") and value:
                lines.append(f"- {key}: {value}")
        lines.append(f"- score: {row['score']:.2f}")
        lines.append("")
    return lines


def render_markdown(payload):
    stack = f", stack: {payload['stack']}" if payload["stack"] else ""
    lines = [f"# Search: \"{payload['query']}\" (domain: {payload['domain']}{stack})", ""]
    if payload["results"]:
        lines += _render_rows(payload["results"], 2)
    else:
        lines += [f"No confident {payload['domain']} match; related libraries below.", ""]
    if payload["related_libraries"]:
        lines += ["## Related libraries", ""] + _render_rows(payload["related_libraries"], 3)
    return "\n".join(lines).rstrip() + "\n"


def _today():
    override = os.environ.get("UI_CRAFT_TODAY")
    return date.fromisoformat(override) if override else date.today()


def build_parser():
    parser = argparse.ArgumentParser(
        description="BM25 search over the ui-craft catalog with an honest score floor.")
    parser.add_argument("query", help='what you need, e.g. "date picker"')
    parser.add_argument("--domain", default="auto", choices=("auto",) + DOMAINS)
    parser.add_argument("--stack", help="one of: " + ", ".join(STACKS))
    parser.add_argument("--limit", type=int, default=5)
    parser.add_argument("--json", action="store_true", help="machine-readable output")
    parser.add_argument("--min-score", type=float, default=DEFAULT_MIN_SCORE,
                        help=f"drop results below this score (default {DEFAULT_MIN_SCORE})")
    return parser


def _validate(args, root):
    if not args.query.strip():
        return "query must not be empty"
    if args.stack and args.stack.lower() not in STACKS:
        return f"unknown stack {args.stack!r}; use one of: {', '.join(STACKS)}"
    if args.limit < 1:
        return "--limit must be >= 1"
    if not root.is_dir():
        return f"data directory not found: {root} (set UI_CRAFT_DATA_DIR?)"
    return None


def _mostly_known(root, query):
    """True when more than half of the query's content words occur in components or libraries."""
    vocab = set()
    for domain in ("components", "libraries"):
        for row in load_domain(root, domain):
            vocab.update(_doc_terms(row)[0])
    groups = [expand(t) for t in dict.fromkeys(tokenize(query)) if t not in STOPWORDS]
    return bool(groups) and sum(any(t in vocab for t in g) for g in groups) * 2 > len(groups)


def _fallback(root, routed, query, stack, min_score, limit):
    """Auto mode found nothing in the routed domain: prefer components (they carry install and
    import lines), otherwise the other domain with the best top hit."""
    if routed != "components":
        found = _search(root, "components", query, stack, min_score, limit)
        if found:
            return "components", found
    best = (routed, [])
    for domain in DOMAINS:
        if domain in (routed, "components"):
            continue
        found = _search(root, domain, query, stack, min_score, limit)
        if found and (not best[1] or found[0][0] > best[1][0][0]):
            best = (domain, found)
    return best


def main(argv=None, today=None):
    args = build_parser().parse_args(argv)
    root = data_dir()
    problem = _validate(args, root)
    if problem:
        return fail_usage(problem)
    try:
        today = today or _today()
    except ValueError:
        return fail_usage("UI_CRAFT_TODAY must be YYYY-MM-DD")
    stack = args.stack.lower() if args.stack else None
    domain = route_domain(args.query) if args.domain == "auto" else args.domain
    libraries = {r.get("id", ""): r for r in load_domain(root, "libraries")}
    found = _search(root, domain, args.query, stack, args.min_score, args.limit,
                    partial=domain in TASTE_DOMAINS)
    related = []
    if args.domain == "auto" and domain == "components" and _mostly_known(root, args.query):
        related = _search(root, "libraries", args.query, stack, args.min_score,
                          RELATED_LIBRARY_LIMIT, strict=False)
    if args.domain == "auto" and not found and not related:
        domain, found = _fallback(root, domain, args.query, stack, args.min_score, args.limit)
    payload = {
        "query": args.query, "domain": domain, "stack": stack, "min_score": args.min_score,
        "results": _enrich(found, domain, libraries, today),
        "related_libraries": _enrich(related, "libraries", libraries, today),
    }
    empty = not payload["results"] and not payload["related_libraries"]
    if args.json:
        print(json.dumps(payload, indent=2, ensure_ascii=False))
    elif empty:
        print(f'No confident match for "{args.query}"')
    else:
        print(render_markdown(payload), end="")
    return 1 if empty else 0


if __name__ == "__main__":
    setup_stdio()
    sys.exit(main())
