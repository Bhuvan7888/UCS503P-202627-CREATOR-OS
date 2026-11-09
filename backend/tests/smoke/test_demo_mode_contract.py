"""Refactor safety net: the demo-mode API must answer exactly as it did before the refactor.

`demo_mode_snapshot.json` was generated from the pre-refactor commit (7f8026c) with
`demo_mode_probe.collect`. Runs offline: demo mode never touches Supabase.
"""

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import features.demo_mode.mode as demo_mode_switch
from main import app
from tests.smoke.demo_mode_probe import collect

SNAPSHOT = Path(__file__).with_name("demo_mode_snapshot.json")


@pytest.fixture
def demo_mode(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(demo_mode_switch, "_supabase_available", False)


def test_demo_mode_responses_match_snapshot(demo_mode: None) -> None:
    expected = json.loads(SNAPSHOT.read_text())
    actual = collect(TestClient(app))
    assert actual == expected
