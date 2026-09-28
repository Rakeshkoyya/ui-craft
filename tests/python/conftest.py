"""Shared pytest fixtures for the ui-craft script tests."""
import subprocess
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
SCRIPTS = REPO / "skills" / "ui-craft" / "scripts"
FIXTURES = Path(__file__).resolve().parent / "fixtures"
FIXTURE_DATA = FIXTURES / "data"

if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))


@pytest.fixture
def data_dir(monkeypatch):
    """Point every script at the fixture data directory."""
    monkeypatch.setenv("UI_CRAFT_DATA_DIR", str(FIXTURE_DATA))
    return FIXTURE_DATA


def run_script(name, *args, env_data=True, cwd=None):
    """Run a script as a subprocess (from an unrelated cwd) and return the result."""
    import os

    env = dict(os.environ)
    env["PYTHONIOENCODING"] = "utf-8"
    if env_data:
        env["UI_CRAFT_DATA_DIR"] = str(FIXTURE_DATA)
    return subprocess.run(
        [sys.executable, str(SCRIPTS / name), *args],
        capture_output=True, text=True, encoding="utf-8", env=env,
        cwd=str(cwd or FIXTURES),
    )
