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


def test_assignment_approval_and_join_notify_the_right_people(demo: None) -> None:
    owner, member = _login("demo.creator5@creatoros.dev"), _login("demo.creator1@creatoros.dev")
    w = "/workspaces/" + client.get("/workspaces", headers=owner).json()[0]["slug"]
    token = (
        client.post(
            f"{w}/invites",
            headers=owner,
            json={"email": "demo.creator1@creatoros.dev", "role": "video_editor"},
        )
        .json()["accept_path"]
        .rsplit("/", 1)[1]
    )
    client.post(f"/invites/{token}/accept", headers=member)
    joined = client.get(f"{w}/notifications", headers=owner).json()
    assert joined[0]["category"] == "workspace_activity" and "joined" in joined[0]["title"]

    member_id = next(
        m["user_id"]
        for m in client.get(f"{w}/members", headers=owner).json()
        if m["role"] == "video_editor"
    )
    item = client.post(
        f"{w}/content",
        headers=owner,
        json={"title": "Reel A", "pillar": "p", "hook": "h", "assignee_user_id": member_id},
    ).json()
    inbox = client.get(f"{w}/notifications", headers=member).json()
    assert inbox[0]["title"] == "You were assigned “Reel A”" and inbox[0]["link"].endswith(
        item["id"]
    )

    req = client.post(f"{w}/approvals", headers=member, json={"content_item_id": item["id"]}).json()
    waiting = client.get(f"{w}/notifications", headers=owner).json()[0]
    assert (waiting["category"], waiting["priority"]) == ("publishing_updates", "high")
    client.post(f"{w}/approvals/{req['id']}/reject", headers=owner, json={"reason": "Fix audio"})
    assert "Fix audio" in client.get(f"{w}/notifications", headers=member).json()[0]["body"]

    assert client.get(f"{w}/notifications/unread-count", headers=member).json()["unread"] == 2
    first = client.get(f"{w}/notifications", headers=member).json()[0]["id"]
    assert (
        client.post(f"{w}/notifications/read", headers=member, json={"ids": [first]}).status_code
        == 204
    )
    assert client.get(f"{w}/notifications/unread-count", headers=member).json()["unread"] == 1
    assert client.post(f"{w}/notifications/{first}/archive", headers=member).status_code == 204
    assert client.get(f"{w}/notifications?archived=true", headers=member).json()[0]["id"] == first
    assert (
        client.post(f"{w}/notifications/{first}/archive", headers=owner).status_code == 404
    )  # not theirs
    client.post(f"{w}/notifications/read", headers=member, json={})
    assert client.get(f"{w}/notifications/unread-count", headers=member).json()["unread"] == 0

    key = client.post(
        f"{w}/api-keys", headers=owner, json={"name": "bot", "scopes": ["owner"]}
    ).json()["secret"]
    assert (
        client.get(f"{w}/notifications", headers={"Authorization": f"Bearer {key}"}).status_code
        == 403
    )


def test_profile_preferences_and_support(demo: None) -> None:
    me, other = _login("demo.creator2@creatoros.dev"), _login("demo.creator4@creatoros.dev")
    profile = client.get("/me/profile", headers=me).json()
    assert (
        profile["email"] == "demo.creator2@creatoros.dev" and profile["timezone"] == "Asia/Kolkata"
    )
    saved = client.put(
        "/me/profile",
        headers=me,
        json={**profile, "name": "Rohan M.", "bio": "Hi", "website": "https://rohan.dev"},
    )
    assert saved.status_code == 200 and saved.json()["name"] == "Rohan M."
    assert (
        client.put("/me/profile", headers=me, json={**profile, "timezone": "Mars/Base"}).status_code
        == 422
    )
    w = "/workspaces/" + client.get("/workspaces", headers=me).json()[0]["slug"]
    assert client.get(f"{w}/members", headers=me).json()[0]["name"] == "Rohan M."

    prefs = client.get("/me/notification-preferences", headers=me).json()
    prefs.update(do_not_disturb=True, categories={"deadlines": {"in_app": False, "email": False}})
    assert (
        client.put("/me/notification-preferences", headers=me, json=prefs).json()["do_not_disturb"]
        is True
    )

    t = client.post(
        f"{w}/support/tickets",
        headers=me,
        json={"subject": "Bug", "category": "bug_report", "description": "Steps"},
    ).json()
    assert (t["status"], t["priority"]) == ("open", "medium")
    assert (
        client.post(
            f"{w}/support/tickets", headers=me, json={"subject": "", "description": "x"}
        ).status_code
        == 422
    )
    assert [x["id"] for x in client.get(f"{w}/support/tickets", headers=me).json()] == [t["id"]]
    assert client.get(f"{w}/support/tickets", headers=other).status_code == 403
    assert (
        client.post(f"{w}/support/tickets/{t['id']}/close", headers=me).json()["status"] == "closed"
    )
    assert client.post(f"{w}/support/tickets/{t['id']}/close", headers=me).status_code == 409
