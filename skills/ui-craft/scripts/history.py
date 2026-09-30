"""Local structure-fingerprint history, so new sites vary from recent ones.

After a site's structure is settled, record its fingerprint (story arc, section sequence,
signature scene, palette family, motion language). Before settling the next one, compare the
plan with recent entries. The result is advice, not a rule: a similar structure is fine when
the brand calls for it, as long as it is chosen rather than defaulted to.

Usage:
    python history.py show [--limit 10] [--json]
    python history.py add --sections cold-open,sticky-build,invitation [--brand NAME]
                          [--arc ARC] [--signature SCENE] [--palette FAMILY]
                          [--language LANG] [--stack STACK]
    python history.py check --sections a,b,c [--arc ARC] [--signature S] [--palette P]
                            [--language L] [--limit 10] [--json]

Similarity (0..1) weighs the section sequence 0.5 (half order-aware SequenceMatcher, half
set overlap), arc and signature 0.15 each, palette and motion language 0.1 each. Fields
missing on either side are left out and the weights renormalised. `check` flags entries at
or above 0.7.
Exit codes: 0 ok / distinct, 1 `check` found a similar recent entry, 2 usage error.
Env: UI_CRAFT_HISTORY overrides the file (default ~/.ui-craft/history.json).
"""
import argparse
import json
import os
import re
import sys
from datetime import date
from difflib import SequenceMatcher
from pathlib import Path

from _common import UsageError, fail_usage, setup_stdio

HISTORY_ENV = "UI_CRAFT_HISTORY"
MAX_ENTRIES = 50
SIMILAR_AT = 0.7
DEFAULT_LIMIT = 10
WEIGHTS = {"sections": 0.5, "arc": 0.15, "signature": 0.15, "palette": 0.1, "language": 0.1}
TEXT_FIELDS = ("brand", "arc", "signature", "palette", "language", "stack")


def history_path():
    override = os.environ.get(HISTORY_ENV)
    return Path(override) if override else Path.home() / ".ui-craft" / "history.json"


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.strip().lower()).strip("-")


def parse_sections(text):
    """'Cold Open, sticky-build' -> ['cold-open', 'sticky-build']; empty items dropped."""
    return [s for s in (slug(part) for part in text.split(",")) if s]


def _section_similarity(a, b):
    order = SequenceMatcher(None, a, b).ratio()
    overlap = len(set(a) & set(b)) / len(set(a) | set(b))
    return 0.5 * order + 0.5 * overlap


def similarity(a, b):
    """Weighted similarity of two fingerprints over the fields both define."""
    total = score = 0.0
    for field, weight in WEIGHTS.items():
        left, right = a.get(field), b.get(field)
        if not left or not right:
            continue
        total += weight
        if field == "sections":
            score += weight * _section_similarity(left, right)
        else:
            score += weight * (slug(left) == slug(right))
    return score / total if total else 0.0


def overused(entries):
    """Sections used by at least half of `entries` (and by two or more), most used first."""
    counts = {}
    for entry in entries:
        for section in set(entry.get("sections", [])):
            counts[section] = counts.get(section, 0) + 1
    floor = max(2, (len(entries) + 1) // 2)
    return sorted((s for s, n in counts.items() if n >= floor), key=lambda s: (-counts[s], s))


def load(path):
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        entries = data["entries"]
        if not isinstance(entries, list):
            raise TypeError("entries is not a list")
        for i, entry in enumerate(entries):
            if not isinstance(entry, dict) or not isinstance(entry.get("sections"), list):
                raise TypeError(f"entry {i} needs a 'sections' list")
    except (ValueError, KeyError, TypeError) as exc:
        raise UsageError(f"history file {path} is unreadable ({exc}); fix or delete it")
    return entries


def save(path, entries):
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"version": 1, "entries": entries[-MAX_ENTRIES:]}
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def _fingerprint(args):
    sections = parse_sections(args.sections)
    if not sections:
        raise UsageError("--sections needs at least one section id")
    fp = {"sections": sections}
    for field in TEXT_FIELDS:
        value = getattr(args, field, None)
        if value:
            fp[field] = value.strip() if field == "brand" else slug(value)
    return fp


def _describe(entry):
    parts = [entry.get("date", "?"), entry.get("brand") or "(unnamed)"]
    if entry.get("arc"):
        parts.append(f"arc {entry['arc']}")
    if entry.get("language"):
        parts.append(f"motion {entry['language']}")
    if entry.get("signature"):
        parts.append(f"signature {entry['signature']}")
    return " · ".join(parts) + "\n  " + " → ".join(entry.get("sections", []))


def cmd_show(args, entries):
    recent = entries[-args.limit:][::-1]
    if args.json:
        print(json.dumps({"entries": recent, "overused": overused(recent)}, indent=2,
                         ensure_ascii=False))
        return 0
    if not recent:
        print("No history yet. Record a site with `history.py add` once its structure is set.")
        return 0
    print(f"# Recent structures ({len(recent)})\n")
    for entry in recent:
        print("- " + _describe(entry))
    busy = overused(recent)
    if busy:
        print(f"\nOften used lately: {', '.join(busy)}. Use them again only on purpose.")
    return 0


def cmd_add(args, entries, path):
    entry = {"date": date.today().isoformat(), **_fingerprint(args)}
    save(path, entries + [entry])
    print(f"Recorded {entry.get('brand') or 'site'} in {path}")
    return 0


def cmd_check(args, entries):
    plan = _fingerprint(args)
    recent = entries[-args.limit:][::-1]
    matches = sorted(({**e, "similarity": round(similarity(plan, e), 3)} for e in recent),
                     key=lambda e: -e["similarity"])
    similar = [m for m in matches if m["similarity"] >= SIMILAR_AT]
    busy = [s for s in overused(recent) if s in plan["sections"]]
    if args.json:
        print(json.dumps({"plan": plan, "matches": matches, "similar": similar,
                          "overused_in_plan": busy, "threshold": SIMILAR_AT}, indent=2,
                         ensure_ascii=False))
        return 1 if similar else 0
    if similar:
        print(f"# Similar to {len(similar)} recent structure(s)\n")
        for match in similar:
            print(f"- {match['similarity']:.2f}  {_describe(match)}")
        print("\nIf the brand really calls for this, keep it and say why. Otherwise change the "
              "arc, the signature scene or two sections.")
    else:
        closest = f" (closest {matches[0]['similarity']:.2f})" if matches else ""
        print(f"Distinct from the last {len(recent)} structure(s){closest}.")
    if busy:
        print(f"Often used lately and in this plan: {', '.join(busy)}.")
    return 1 if similar else 0


def build_parser():
    parser = argparse.ArgumentParser(description="Structure-fingerprint history for variation.")
    sub = parser.add_subparsers(dest="command", required=True)
    show = sub.add_parser("show", help="list recent structures")
    show.add_argument("--limit", type=int, default=DEFAULT_LIMIT)
    show.add_argument("--json", action="store_true")
    for name in ("add", "check"):
        cmd = sub.add_parser(name, help=f"{name} a structure fingerprint")
        cmd.add_argument("--sections", required=True, help="comma-separated section ids in order")
        for field in ("arc", "signature", "palette", "language"):
            cmd.add_argument(f"--{field}")
        if name == "add":
            cmd.add_argument("--brand")
            cmd.add_argument("--stack")
        else:
            cmd.add_argument("--limit", type=int, default=DEFAULT_LIMIT)
            cmd.add_argument("--json", action="store_true")
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    if getattr(args, "limit", 1) < 1:
        return fail_usage("--limit must be >= 1")
    path = history_path()
    try:
        entries = load(path)
        if args.command == "show":
            return cmd_show(args, entries)
        if args.command == "add":
            return cmd_add(args, entries, path)
        return cmd_check(args, entries)
    except UsageError as exc:
        return fail_usage(str(exc))


if __name__ == "__main__":
    setup_stdio()
    sys.exit(main())
