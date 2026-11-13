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


def _login(email: str) -> dict[str, str]:
    r = client.post("/auth/creator/login", json={"email": email, "password": DEMO_PASSWORD})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_content_pipeline_flow(demo: None) -> None:
    me = _login("demo.creator2@creatoros.dev")
    ws = client.get("/workspaces", headers=me).json()[0]["slug"]
    base = f"/workspaces/{ws}/content"
    members = client.get(f"/workspaces/{ws}/members", headers=me).json()
    assert [(m["role"], m["name"]) for m in members] == [("owner", "Rohan Mehta")]

    created = client.post(
        base,
        headers=me,
        json={
            "title": "Day in the life",
            "pillar": "Lifestyle",
            "hook": "What 12 hours looks like",
            "type": "reel",
            "target_platforms": ["instagram", "instagram", "youtube"],
            "due_date": "2026-12-01",
            "assignee_user_id": members[0]["user_id"],
        },
    )
    assert created.status_code == 201
    item = created.json()
    assert item["stage"] == "idea" and item["target_platforms"] == ["instagram", "youtube"]

    moved = client.patch(f"{base}/{item['id']}", headers=me, json={"stage": "scheduled"})
    assert moved.status_code == 200 and moved.json()["stage"] == "scheduled"
    assert [i["id"] for i in client.get(base, headers=me).json()] == [item["id"]]
    stats = client.get(f"{base}/stats", headers=me).json()
    assert stats["total"]["value"] == 1 and stats["by_platform"] == {"instagram": 1, "youtube": 1}

    bad = client.post(base, headers=me, json={"title": "", "pillar": "p", "hook": "h"})
    assert bad.status_code == 422


def test_other_creators_cannot_reach_the_pipeline(demo: None) -> None:
    owner = _login("demo.creator2@creatoros.dev")
    other = _login("demo.creator3@creatoros.dev")
    ws = client.get("/workspaces", headers=owner).json()[0]["slug"]
    item = client.post(
        f"/workspaces/{ws}/content", headers=owner, json={"title": "x", "pillar": "p", "hook": "h"}
    ).json()
    assert client.get(f"/workspaces/{ws}/content", headers=other).status_code == 403
    assert (
        client.patch(
            f"/workspaces/{ws}/content/{item['id']}", headers=other, json={"stage": "published"}
        ).status_code
        == 403
    )
    other_ws = client.get("/workspaces", headers=other).json()[0]["slug"]
    assert (
        client.patch(
            f"/workspaces/{other_ws}/content/{item['id']}",
            headers=other,
            json={"stage": "published"},
        ).status_code
        == 404
    )


def test_script_autosave_flow(demo: None) -> None:
    me = _login("demo.creator2@creatoros.dev")
    other = _login("demo.creator3@creatoros.dev")
    ws = client.get("/workspaces", headers=me).json()[0]["slug"]
    item = client.post(
        f"/workspaces/{ws}/content", headers=me, json={"title": "s", "pillar": "p", "hook": "h"}
    ).json()
    url = f"/workspaces/{ws}/content/{item['id']}/script"
    assert client.get(url, headers=me).json()["body"] == ""
    assert client.put(url, headers=me, json={"body": "Intro"}).json()["body"] == "Intro"
    assert client.get(url, headers=me).json()["body"] == "Intro"
    assert client.put(url, headers=other, json={"body": "x"}).status_code == 403
    assert client.put(url, headers=me, json={"body": "x" * 50_001}).status_code == 422
