"""Shared helpers for the ui-craft scripts (stdlib only, Python 3.9+).

Not a CLI. Imported by search.py and contrast.py:
    from _common import data_dir, read_csv_dir, setup_stdio, UsageError
"""
import csv
import os
import sys
from pathlib import Path

DATA_ENV = "UI_CRAFT_DATA_DIR"


class UsageError(Exception):
    """Bad input from the user; the CLI reports it and exits 2."""


def setup_stdio():
    """Make stdout/stderr UTF-8 so Windows consoles don't crash on non-ASCII output."""
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is not None:
            try:
                reconfigure(encoding="utf-8", errors="replace")
            except (ValueError, OSError):
                pass


def data_dir():
    """Return the data directory: $UI_CRAFT_DATA_DIR or <skill>/data next to scripts/."""
    override = os.environ.get(DATA_ENV)
    if override:
        return Path(override)
    return Path(__file__).resolve().parent.parent / "data"


def read_csv_dir(directory):
    """Read every *.csv in `directory` (sorted) into a list of dicts with stripped values."""
    rows = []
    for path in sorted(Path(directory).glob("*.csv")):
        with path.open(encoding="utf-8-sig", newline="") as handle:
            for row in csv.DictReader(handle):
                rows.append({(k or "").strip(): (v or "").strip() for k, v in row.items()
                             if k is not None})
    return rows


def fail_usage(message):
    """Print a usage error to stderr and return exit code 2."""
    print(f"error: {message}", file=sys.stderr)
    return 2
