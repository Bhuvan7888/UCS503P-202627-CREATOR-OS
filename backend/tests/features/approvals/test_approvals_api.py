import pytest
from fastapi.testclient import TestClient

import features.demo_mode.mode as demo_mode_switch
from features.demo_mode import DEMO_PASSWORD
from main import app
from shared.config import settings

client = TestClient(app)


@pytest.fixture
def demo(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(demo_mode_switch, "_supabase_available", False)
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")


def _login(email: str) -> tuple[dict[str, str], str]:
    r = client.post("/auth/creator/login", json={"email": email, "password": DEMO_PASSWORD})
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    return h, client.get("/workspaces", headers=h).json()[0]["slug"]


def test_request_reject_approve_flow(demo: None) -> None:
    me, ws = _login("demo.creator4@creatoros.dev")
    other, _ = _login("demo.creator5@creatoros.dev")
    base = f"/workspaces/{ws}"
    item = client.post(
        f"{base}/content", headers=me, json={"title": "a", "pillar": "p", "hook": "h"}
    ).json()

    req = client.post(f"{base}/approvals", headers=me, json={"content_item_id": item["id"]})
    assert req.status_code == 201
    assert (
        client.post(
            f"{base}/approvals", headers=me, json={"content_item_id": item["id"]}
        ).status_code
        == 409
    )
    assert (
        client.post(
            f"{base}/approvals/{req.json()['id']}/reject", headers=me, json={"reason": ""}
        ).status_code
        == 422
    )
    assert (
        client.post(f"{base}/approvals/{req.json()['id']}/approve", headers=other).status_code
        == 403
    )
    assert client.get(f"{base}/approvals", headers=other).status_code == 403

    ok = client.post(f"{base}/approvals/{req.json()['id']}/approve", headers=me)
    assert ok.status_code == 200 and ok.json()["status"] == "approved"
    assert (
        client.post(f"{base}/approvals/{req.json()['id']}/approve", headers=me).status_code == 409
    )
    items = {i["id"]: i for i in client.get(f"{base}/content", headers=me).json()}
    assert items[item["id"]]["stage"] == "published" and items[item["id"]]["published_at"]


def test_scheduling_from_the_calendar(demo: None) -> None:
    me, ws = _login("demo.creator4@creatoros.dev")
    base = f"/workspaces/{ws}/content"
    item = client.post(base, headers=me, json={"title": "b", "pillar": "p", "hook": "h"}).json()
    moved = client.patch(
        f"{base}/{item['id']}", headers=me, json={"scheduled_at": "2026-12-05T10:00:00Z"}
    ).json()
    assert moved["stage"] == "scheduled" and moved["scheduled_at"].startswith("2026-12-05T10:00")
