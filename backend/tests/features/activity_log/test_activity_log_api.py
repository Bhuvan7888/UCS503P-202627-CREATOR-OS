from uuid import UUID

import pytest
from fastapi.testclient import TestClient

import features.demo_mode.mode as demo_mode_switch
from features.demo_mode import DEMO_PASSWORD, store
from main import app

client = TestClient(app)


def test_manual_note_is_listed_with_its_text(monkeypatch: pytest.MonkeyPatch):
    # Regression: the router passed str ids while repositories compare UUIDs, so the
    # in-memory (demo) activity log always came back empty.
    monkeypatch.setattr(demo_mode_switch, "_supabase_available", False)
    login = client.post(
        "/auth/brand/login", json={"email": "demo.brand1@creatoros.dev", "password": DEMO_PASSWORD}
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    created = client.post(
        "/activity-log", headers=headers, json={"action": "manual_note", "note": "Call with Priya"}
    )
    assert created.status_code == 201

    listed = client.get("/activity-log", headers=headers).json()
    store.activity_log_repo.data.pop(
        UUID(created.json()["id"]), None
    )  # keep the shared demo store clean
    assert any(log["metadata"].get("note") == "Call with Priya" for log in listed)
